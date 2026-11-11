import os
import tempfile
import pytest
from pydub import AudioSegment
from pydub.generators import Sine
from app.services.tts_service import stitch_dialogue_turns, ensure_default_music_assets

@pytest.fixture
def sample_turn_files():
    temp_dir = tempfile.TemporaryDirectory()
    files = []
    # Create 3 short 500ms tone files
    for i, freq in enumerate([440, 550, 660]):
        seg = Sine(freq).to_audio_segment(duration=500).fade_in(20).fade_out(20)
        p = os.path.join(temp_dir.name, f"turn_{i}.mp3")
        seg.export(p, format="mp3")
        files.append(p)

    yield files
    temp_dir.cleanup()

def test_stitch_dialogue_turns_without_music(sample_turn_files):
    with tempfile.TemporaryDirectory() as out_dir:
        out_file = os.path.join(out_dir, "stitched.mp3")
        pause_ms = 400

        stitch_dialogue_turns(
            turn_files=sample_turn_files,
            output_filepath=out_file,
            include_music=False,
            pause_ms=pause_ms
        )

        assert os.path.exists(out_file)
        assert os.path.getsize(out_file) > 0

        stitched = AudioSegment.from_file(out_file)
        # Expected duration: 3 turns (500ms each) + 2 pauses (400ms each) = 2300ms
        # MP3 frame padding allows +- 100ms tolerance
        expected_duration = 3 * 500 + 2 * pause_ms
        assert abs(len(stitched) - expected_duration) < 150

def test_stitch_dialogue_turns_with_music(sample_turn_files):
    with tempfile.TemporaryDirectory() as out_dir:
        out_file = os.path.join(out_dir, "stitched_music.mp3")
        ensure_default_music_assets()

        stitch_dialogue_turns(
            turn_files=sample_turn_files,
            output_filepath=out_file,
            include_music=True,
            pause_ms=400
        )

        assert os.path.exists(out_file)
        stitched = AudioSegment.from_file(out_file)
        # With intro and outro music, duration should be significantly longer than raw turns (raw turns + pauses = ~2300ms)
        assert len(stitched) > 4000

def test_stitch_empty_files_raises():
    with pytest.raises(ValueError):
        stitch_dialogue_turns([], "out.mp3")

