import os
import time
import asyncio
import logging
import tempfile
from typing import List, Dict, Optional
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

def stitch_dialogue_turns(
    turn_files: List[str],
    output_filepath: str,
    include_music: bool = True,
    pause_ms: int = 400
) -> None:
    """
    Stitches individual turn audio files into one continuous dialogue audio file,
    inserting natural pauses between turns and optionally mixing in intro/outro music.
    """
    if not turn_files:
        raise ValueError("No turn files provided to stitch.")

    combined = AudioSegment.empty()
    pause = AudioSegment.silent(duration=pause_ms)

    for idx, f in enumerate(turn_files):
        if not os.path.exists(f) or os.path.getsize(f) == 0:
            continue
        turn_audio = AudioSegment.from_file(f)
        if len(combined) > 0:
            combined += pause
        combined += turn_audio

    if len(combined) == 0:
        combined = AudioSegment.silent(duration=1000)

    # Optional intro/outro music stitching
    if include_music:
        ensure_default_music_assets()
        intro_path = os.path.join(settings.MUSIC_STORAGE_DIR, "intro.mp3")
        outro_path = os.path.join(settings.MUSIC_STORAGE_DIR, "outro.mp3")

        if os.path.exists(intro_path):
            try:
                intro_audio = AudioSegment.from_file(intro_path)
                intro_clip = intro_audio[:3000].fade_in(100).fade_out(1000) - 6
                combined = intro_clip + AudioSegment.silent(duration=200) + combined
            except Exception as e:
                logger.warning(f"Could not stitch intro music: {e}")

        if os.path.exists(outro_path):
            try:
                outro_audio = AudioSegment.from_file(outro_path)
                outro_clip = outro_audio[:3500].fade_in(800).fade_out(1200) - 6
                combined = combined + AudioSegment.silent(duration=300) + outro_clip
            except Exception as e:
                logger.warning(f"Could not stitch outro music: {e}")

    combined.export(output_filepath, format="mp3", bitrate="192k")

def generate_dialogue_audio_from_turns(
    turns: List[Dict[str, str]],
    filename: str,
    voice_a: str = "en-IN-NeerjaNeural",
    voice_b: str = "en-IN-PrabhatNeural",
    include_music: bool = True
) -> str:
    """
    Chunked synthesis per turn with retries, stitched with natural pauses and optional intro/outro music.
    Returns relative URL path to the saved episode audio file.
    """
    if not turns:
        turns = [{"speaker": "A", "text": "Welcome to today's briefing. No dialogue content was generated."}]

    filepath = os.path.join(settings.AUDIO_STORAGE_DIR, filename)

    valid_voice_ids = [v["id"] for v in VOICE_OPTIONS]
    v_a = voice_a if voice_a in valid_voice_ids else "en-IN-NeerjaNeural"
    v_b = voice_b if voice_b in valid_voice_ids else "en-IN-PrabhatNeural"

    with tempfile.TemporaryDirectory() as tmp_dir:
        turn_files: List[str] = []
        for idx, turn in enumerate(turns):
            turn_speaker = turn.get("speaker", "A").upper()
            turn_voice = v_a if turn_speaker == "A" else v_b
            turn_text = turn.get("text", "").strip()
            if not turn_text:
                continue
            turn_filepath = os.path.join(tmp_dir, f"turn_{idx}.mp3")
            synthesize_turn_with_retry(turn_text, turn_voice, turn_filepath, max_retries=3)
            turn_files.append(turn_filepath)

        stitch_dialogue_turns(turn_files, filepath, include_music=include_music, pause_ms=400)

    return f"/static/audio/{filename}"

def generate_audio_from_script(script: str, filename: str, voice: str = "en-US-ChristopherNeural") -> str:
    """
    Converts monologue text to speech using edge-tts (free, no API key required).
    Saves to the static/audio directory.
    Returns the relative URL to access the audio.
    """
    filepath = os.path.join(settings.AUDIO_STORAGE_DIR, filename)
    
    # Validate voice or fallback
    valid_voice_ids = [v["id"] for v in VOICE_OPTIONS]
    selected_voice = voice if voice in valid_voice_ids else "en-US-ChristopherNeural"
    
    async def _generate():
        communicate = edge_tts.Communicate(script, selected_voice)
        await communicate.save(filepath)
        
    try:
        asyncio.run(_generate())
    except Exception as e:
        logger.error(f"TTS Error generating audio with voice {selected_voice}: {e}")
        # Try fallback default voice if custom voice failed
        if selected_voice != "en-US-ChristopherNeural":
            try:
                communicate_fallback = edge_tts.Communicate(script, "en-US-ChristopherNeural")
                asyncio.run(communicate_fallback.save(filepath))
            except Exception as e2:
                logger.error(f"TTS Fallback error: {e2}")
                raise e2
        else:
            raise e
        
    # Return relative URL
    return f"/static/audio/{filename}"
