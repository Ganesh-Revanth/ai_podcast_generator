import os
import tempfile
import pytest
from pydub.generators import Sine
from app.services.tts_service import chunk_text_into_paragraphs, stitch_dialogue_turns

def test_chunk_text_into_paragraphs():
    text = (
        "This is paragraph one covering the initial headline.\n\n"
        "This is paragraph two providing additional context and facts.\n\n"
        "And paragraph three summarizes the concluding remarks."
    )
    chunks = chunk_text_into_paragraphs(text, max_chunk_chars=300)
    assert len(chunks) == 3
    assert "paragraph one" in chunks[0]
    assert "paragraph two" in chunks[1]
    assert "paragraph three" in chunks[2]

def test_chunk_long_paragraph_splits_sentences():
    long_p = "Sentence one. " * 30 # ~420 chars
    chunks = chunk_text_into_paragraphs(long_p, max_chunk_chars=200)
    assert len(chunks) >= 2
    for c in chunks:
        assert len(c) <= 250

def test_stitch_dialogue_turns_calculates_timed_segments():
    with tempfile.TemporaryDirectory() as tmp_dir:
        turn_files = []
        for i in range(3):
            p = os.path.join(tmp_dir, f"turn_{i}.mp3")
            Sine(440 + i * 100).to_audio_segment(duration=600).export(p, format="mp3")
            turn_files.append(p)

        meta = [
            {"speaker": "A", "text": "Welcome to the show."},
            {"speaker": "B", "text": "Excited to be here."},
            {"speaker": "A", "text": "Let's dive into our top story."}
        ]

        out_file = os.path.join(tmp_dir, "stitched.mp3")
        duration_sec, segments = stitch_dialogue_turns(
            turn_files=turn_files,
            output_filepath=out_file,
            include_music=False,
            pause_ms=400,
            turn_metadata=meta
        )

        assert duration_sec >= 2
        assert len(segments) == 3

        # First segment
        assert segments[0]["start"] == 0.0
        assert segments[0]["end"] >= 0.5
        assert segments[0]["speaker"] == "Host A"
        assert segments[0]["text"] == "Welcome to the show."

        # Second segment starts after first segment + 400ms pause
        assert segments[1]["start"] >= segments[0]["end"] + 0.35
        assert segments[1]["speaker"] == "Host B"

        # Third segment
        assert segments[2]["start"] >= segments[1]["end"] + 0.35
        assert segments[2]["speaker"] == "Host A"
