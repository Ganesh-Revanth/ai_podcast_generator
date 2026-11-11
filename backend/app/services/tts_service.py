import os
import re
import time
import asyncio
import logging
import tempfile
from typing import List, Dict, Optional, Tuple, Any
import edge_tts
from pydub import AudioSegment
from pydub.generators import Sine
from app.core.config import settings

logger = logging.getLogger(__name__)

VOICE_OPTIONS = [
    {
        "id": "en-IN-NeerjaNeural",
        "name": "Neerja",
        "gender": "Female",
        "locale": "en-IN",
        "description": "Expressive, clear, and natural Indian English narrator"
    },
    {
        "id": "en-IN-PrabhatNeural",
        "name": "Prabhat",
        "gender": "Male",
        "locale": "en-IN",
        "description": "Professional, authoritative Indian English news presenter"
    },
    {
        "id": "en-US-ChristopherNeural",
        "name": "Christopher",
        "gender": "Male",
        "locale": "en-US",
        "description": "Deep, authoritative, and professional broadcaster voice"
    },
    {
        "id": "en-US-AriaNeural",
        "name": "Aria",
        "gender": "Female",
        "locale": "en-US",
        "description": "Crisp, expressive, and engaging storytelling voice"
    },
    {
        "id": "en-US-GuyNeural",
        "name": "Guy",
        "gender": "Male",
        "locale": "en-US",
        "description": "Natural, casual, and friendly conversational style"
    },
    {
        "id": "en-US-JennyNeural",
        "name": "Jenny",
        "gender": "Female",
        "locale": "en-US",
        "description": "Warm, clear, and modern journalistic voice"
    },
    {
        "id": "en-GB-RyanNeural",
        "name": "Ryan",
        "gender": "Male",
        "locale": "en-GB",
        "description": "Polished, distinguished British accent"
    },
    {
        "id": "en-GB-SoniaNeural",
        "name": "Sonia",
        "gender": "Female",
        "locale": "en-GB",
        "description": "Smooth, articulate British presenter voice"
    }
]

HOST_PAIR_OPTIONS = [
    {
        "id": "in_neerja_prabhat",
        "name": "Neerja & Prabhat",
        "description": "Engaging & professional Indian English co-hosts",
        "locale": "en-IN",
        "voice_a": "en-IN-NeerjaNeural",
        "voice_b": "en-IN-PrabhatNeural",
        "voice_a_name": "Neerja (Female)",
        "voice_b_name": "Prabhat (Male)"
    },
    {
        "id": "us_christopher_jenny",
        "name": "Christopher & Jenny",
        "description": "Authoritative broadcaster & warm modern journalist (US English)",
        "locale": "en-US",
        "voice_a": "en-US-ChristopherNeural",
        "voice_b": "en-US-JennyNeural",
        "voice_a_name": "Christopher (Male)",
        "voice_b_name": "Jenny (Female)"
    },
    {
        "id": "us_aria_guy",
        "name": "Aria & Guy",
        "description": "Expressive storyteller & friendly casual conversationalist (US English)",
        "locale": "en-US",
        "voice_a": "en-US-AriaNeural",
        "voice_b": "en-US-GuyNeural",
        "voice_a_name": "Aria (Female)",
        "voice_b_name": "Guy (Male)"
    },
    {
        "id": "gb_ryan_sonia",
        "name": "Ryan & Sonia",
        "description": "Polished & articulate British presenter duo (UK English)",
        "locale": "en-GB",
        "voice_a": "en-GB-RyanNeural",
        "voice_b": "en-GB-SoniaNeural",
        "voice_a_name": "Ryan (Male)",
        "voice_b_name": "Sonia (Female)"
    }
]

def ensure_default_music_assets() -> None:
    """Creates default soft intro and outro musical jingles if not already present in static/music."""
    intro_path = os.path.join(settings.MUSIC_STORAGE_DIR, "intro.mp3")
    outro_path = os.path.join(settings.MUSIC_STORAGE_DIR, "outro.mp3")

    if not os.path.exists(intro_path):
        try:
            intro = AudioSegment.silent(duration=100)
            notes = [523.25, 659.25, 783.99, 1046.50]  # C5, E5, G5, C6
            for freq in notes:
                tone = Sine(freq).to_audio_segment(duration=600).fade_in(50).fade_out(250)
                intro = intro.overlay(tone, position=len(intro) - 150)
            intro = intro.fade_in(100).fade_out(600) - 12
            intro.export(intro_path, format="mp3")
        except Exception as e:
            logger.warning(f"Could not generate default intro music: {e}")

    if not os.path.exists(outro_path):
        try:
            outro = AudioSegment.silent(duration=100)
            for freq in [783.99, 659.25, 523.25]:
                tone = Sine(freq).to_audio_segment(duration=800).fade_in(50).fade_out(350)
                outro = outro.overlay(tone, position=len(outro) - 200)
            outro = outro.fade_in(100).fade_out(800) - 12
            outro.export(outro_path, format="mp3")
        except Exception as e:
            logger.warning(f"Could not generate default outro music: {e}")

def synthesize_turn_with_retry(
    text: str,
    voice: str,
    filepath: str,
    max_retries: int = 3,
    timeout_seconds: float = 30.0
) -> None:
    """Synthesizes a single dialogue turn with retries and exponential backoff."""
    valid_voice_ids = [v["id"] for v in VOICE_OPTIONS]
    selected_voice = voice if voice in valid_voice_ids else "en-IN-NeerjaNeural"

    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            async def _generate():
                communicate = edge_tts.Communicate(text, selected_voice)
                await asyncio.wait_for(communicate.save(filepath), timeout=timeout_seconds)

            asyncio.run(_generate())
            if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
                return
        except Exception as e:
            last_error = e
            logger.warning(f"TTS attempt {attempt}/{max_retries} failed for voice {selected_voice}: {e}")
            if attempt < max_retries:
                time.sleep(1.0 * (2 ** (attempt - 1)))

    logger.warning(f"All {max_retries} attempts failed for {selected_voice}. Attempting fallback to en-US-ChristopherNeural.")
    try:
        async def _fallback_generate():
            communicate_fallback = edge_tts.Communicate(text, "en-US-ChristopherNeural")
            await asyncio.wait_for(communicate_fallback.save(filepath), timeout=timeout_seconds)
        asyncio.run(_fallback_generate())
        if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
            return
    except Exception as e2:
        logger.error(f"Fallback voice also failed: {e2}")
        raise last_error or e2

def chunk_text_into_paragraphs(text: str, max_chunk_chars: int = 500) -> List[str]:
    """Splits a monologue script into speakable paragraph or sentence chunks adhering to Rule 9."""
    raw_paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    chunks = []
    for p in raw_paragraphs:
        if len(p) <= max_chunk_chars:
            chunks.append(p)
        else:
            sentences = re.split(r'(?<=[.!?])\s+', p)
            current = ""
            for s in sentences:
                if len(current) + len(s) + 1 <= max_chunk_chars:
                    current = f"{current} {s}".strip()
                else:
                    if current:
                        chunks.append(current)
                    current = s
            if current:
                chunks.append(current)
    return chunks if chunks else [text.strip()]

def stitch_dialogue_turns(
    turn_files: List[str],
    output_filepath: str,
    include_music: bool = True,
    pause_ms: int = 400,
    turn_metadata: Optional[List[Dict[str, str]]] = None
) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Stitches individual turn audio files into one continuous dialogue audio file,
    inserting natural pauses between turns and optionally mixing in intro/outro music.
    Returns (duration_seconds, transcript_segments).
    """
    if not turn_files:
        raise ValueError("No turn files provided to stitch.")

    combined = AudioSegment.empty()
    pause = AudioSegment.silent(duration=pause_ms)

    intro_clip = None
    if include_music:
        ensure_default_music_assets()
        intro_path = os.path.join(settings.MUSIC_STORAGE_DIR, "intro.mp3")
        if os.path.exists(intro_path):
            try:
                intro_audio = AudioSegment.from_file(intro_path)
                intro_clip = intro_audio[:3000].fade_in(100).fade_out(1000) - 6
            except Exception as e:
                logger.warning(f"Could not stitch intro music: {e}")

    current_ms = 0
    if intro_clip is not None:
        combined = intro_clip + AudioSegment.silent(duration=200)
        current_ms = len(combined)

    segments: List[Dict[str, Any]] = []

    for idx, f in enumerate(turn_files):
        if not os.path.exists(f) or os.path.getsize(f) == 0:
            continue
        turn_audio = AudioSegment.from_file(f)
        turn_len = len(turn_audio)

        if idx > 0 and len(combined) > 0:
            combined += pause
            current_ms += pause_ms

        start_sec = round(current_ms / 1000.0, 2)
        end_sec = round((current_ms + turn_len) / 1000.0, 2)

        speaker = "Host A"
        text = ""
        if turn_metadata and idx < len(turn_metadata):
            speaker_code = turn_metadata[idx].get("speaker", "A").upper()
            speaker = f"Host {speaker_code}" if speaker_code in ["A", "B"] else speaker_code
            text = turn_metadata[idx].get("text", "")

        segments.append({
            "start": start_sec,
            "end": end_sec,
            "speaker": speaker,
            "text": text
        })

        combined += turn_audio
        current_ms += turn_len

    if len(combined) == 0:
        combined = AudioSegment.silent(duration=1000)

    if include_music:
        outro_path = os.path.join(settings.MUSIC_STORAGE_DIR, "outro.mp3")
        if os.path.exists(outro_path):
            try:
                outro_audio = AudioSegment.from_file(outro_path)
                outro_clip = outro_audio[:3500].fade_in(800).fade_out(1200) - 6
                combined = combined + AudioSegment.silent(duration=300) + outro_clip
            except Exception as e:
                logger.warning(f"Could not stitch outro music: {e}")

    combined.export(output_filepath, format="mp3", bitrate="192k")
    total_seconds = max(1, round(len(combined) / 1000.0))
    return total_seconds, segments

def generate_dialogue_audio_from_turns(
    turns: List[Dict[str, str]],
    filename: str,
    voice_a: str = "en-IN-NeerjaNeural",
    voice_b: str = "en-IN-PrabhatNeural",
    include_music: bool = True
) -> Tuple[str, int, List[Dict[str, Any]]]:
    """
    Chunked synthesis per turn with retries, stitched with natural pauses and optional intro/outro music.
    Returns (audio_url, duration_seconds, transcript_segments).
    """
    if not turns:
        turns = [{"speaker": "A", "text": "Welcome to today's briefing. No dialogue content was generated."}]

    filepath = os.path.join(settings.AUDIO_STORAGE_DIR, filename)

    valid_voice_ids = [v["id"] for v in VOICE_OPTIONS]
    v_a = voice_a if voice_a in valid_voice_ids else "en-IN-NeerjaNeural"
    v_b = voice_b if voice_b in valid_voice_ids else "en-IN-PrabhatNeural"

    with tempfile.TemporaryDirectory() as tmp_dir:
        turn_files: List[str] = []
        metadata: List[Dict[str, str]] = []
        for idx, turn in enumerate(turns):
            turn_speaker = turn.get("speaker", "A").upper()
            turn_voice = v_a if turn_speaker == "A" else v_b
            turn_text = turn.get("text", "").strip()
            if not turn_text:
                continue
            turn_filepath = os.path.join(tmp_dir, f"turn_{idx}.mp3")
            synthesize_turn_with_retry(turn_text, turn_voice, turn_filepath, max_retries=3)
            turn_files.append(turn_filepath)
            metadata.append({"speaker": turn_speaker, "text": turn_text})

        total_seconds, segments = stitch_dialogue_turns(
            turn_files,
            filepath,
            include_music=include_music,
            pause_ms=400,
            turn_metadata=metadata
        )

    return f"/static/audio/{filename}", total_seconds, segments

def generate_audio_from_script(
    script: str,
    filename: str,
    voice: str = "en-US-ChristopherNeural"
) -> Tuple[str, int, List[Dict[str, Any]]]:
    """
    Converts monologue text to speech using chunked Edge-TTS with retries (complying with Rule 9)
    and stitches chunks into continuous audio with timed transcript segments.
    Returns (audio_url, duration_seconds, transcript_segments).
    """
    filepath = os.path.join(settings.AUDIO_STORAGE_DIR, filename)
    valid_voice_ids = [v["id"] for v in VOICE_OPTIONS]
    selected_voice = voice if voice in valid_voice_ids else "en-US-ChristopherNeural"

    chunks = chunk_text_into_paragraphs(script)
    with tempfile.TemporaryDirectory() as tmp_dir:
        chunk_files = []
        metadata = []
        for idx, chunk in enumerate(chunks):
            chunk_file = os.path.join(tmp_dir, f"chunk_{idx}.mp3")
            synthesize_turn_with_retry(chunk, selected_voice, chunk_file, max_retries=3)
            chunk_files.append(chunk_file)
            metadata.append({"speaker": "Host", "text": chunk})

        total_seconds, segments = stitch_dialogue_turns(
            turn_files=chunk_files,
            output_filepath=filepath,
            include_music=False,
            pause_ms=300,
            turn_metadata=metadata
        )

    return f"/static/audio/{filename}", total_seconds, segments
