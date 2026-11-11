import pytest
from app.services.ai_service import clean_script_for_tts, is_stage_direction_or_speaker

def test_stage_direction_detection():
    # Stage directions / audio cues / speaker labels
    assert is_stage_direction_or_speaker("Music swells") is True
    assert is_stage_direction_or_speaker("pause") is True
    assert is_stage_direction_or_speaker("laughs") is True
    assert is_stage_direction_or_speaker("chuckles") is True
    assert is_stage_direction_or_speaker("Theme music fades") is True
    assert is_stage_direction_or_speaker("Sound effect: applause") is True
    assert is_stage_direction_or_speaker("Host") is True
    assert is_stage_direction_or_speaker("Host: Alice") is True
    assert is_stage_direction_or_speaker("Narrator") is True

    # Legitimate content
    assert is_stage_direction_or_speaker("FBI") is False
    assert is_stage_direction_or_speaker("ISRO") is False
    assert is_stage_direction_or_speaker("$5 billion") is False
    assert is_stage_direction_or_speaker("up 12% from 2023") is False
    assert is_stage_direction_or_speaker("New Delhi") is False
    assert is_stage_direction_or_speaker("the Director") is False

def test_clean_script_preserves_legitimate_parentheses():
    text = (
        "The Federal Bureau of Investigation (FBI) and the Indian Space Research Organisation (ISRO) "
        "issued a joint report (up 15% from last year) with an estimated value of $5 billion ($5B)."
    )
    cleaned = clean_script_for_tts(text)
    assert "(FBI)" in cleaned
    assert "(ISRO)" in cleaned
    assert "(up 15% from last year)" in cleaned
    assert "($5B)" in cleaned

def test_clean_script_removes_stage_directions_and_cues():
    text = (
        "Host: Welcome back to the morning briefing. [Upbeat music swells]\n"
        "The market surged today (pause). It was a huge rebound (chuckles).\n"
        "[Sound effect: crowd cheering]\n"
        "[Host]: That wraps up our coverage. (applause)"
    )
    cleaned = clean_script_for_tts(text)
    assert "Host:" not in cleaned
    assert "[Host]" not in cleaned
    assert "Upbeat music swells" not in cleaned
    assert "pause" not in cleaned
    assert "chuckles" not in cleaned
    assert "crowd cheering" not in cleaned
    assert "applause" not in cleaned
    assert "The market surged today. It was a huge rebound." in cleaned

def test_clean_script_unwraps_editorial_brackets():
    text = "According to [the Prime Minister], reforms will take effect immediately."
    cleaned = clean_script_for_tts(text)
    assert "According to the Prime Minister, reforms will take effect immediately." == cleaned

