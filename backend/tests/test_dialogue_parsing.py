import pytest
from app.services.ai_service import parse_dialogue_json, format_dialogue_script

def test_parse_strict_json_turns():
    raw_json = '''
    [
        {"speaker": "A", "text": "Hello and welcome to the show."},
        {"speaker": "B", "text": "Great to be here, Alex."}
    ]
    '''
    turns = parse_dialogue_json(raw_json)
    assert len(turns) == 2
    assert turns[0]["speaker"] == "A"
    assert turns[0]["text"] == "Hello and welcome to the show."
    assert turns[1]["speaker"] == "B"
    assert turns[1]["text"] == "Great to be here, Alex."

def test_parse_markdown_wrapped_json():
    wrapped = '''
    Here is the dialogue script:
    ```json
    [
        {"speaker": "A", "text": "First turn."},
        {"speaker": "B", "text": "Second turn."}
    ]
    ```
    Enjoy!
    '''
    turns = parse_dialogue_json(wrapped)
    assert len(turns) == 2
    assert turns[0] == {"speaker": "A", "text": "First turn."}
    assert turns[1] == {"speaker": "B", "text": "Second turn."}

def test_dialogue_cleaning_preserves_legitimate_parentheses():
    raw = '''
    [
        {"speaker": "A", "text": "ISRO (Indian Space Research Organisation) reported record progress [Music swells]."},
        {"speaker": "B", "text": "That is huge (pause). Funding hit $10 million ($10M) (up 20%)."}
    ]
    '''
    turns = parse_dialogue_json(raw)
    assert len(turns) == 2
    # Legitimate parenthetical text preserved
    assert "(Indian Space Research Organisation)" in turns[0]["text"]
    assert "($10M)" in turns[1]["text"]
    assert "(up 20%)" in turns[1]["text"]
    # Stage directions stripped
    assert "Music swells" not in turns[0]["text"]
    assert "pause" not in turns[1]["text"]

def test_speaker_label_normalization():
    raw = '''
    [
        {"speaker": "Host A", "text": "Lead intro."},
        {"speaker": "Host B", "text": "Co-host comment."},
        {"speaker": "1", "text": "Back to lead."},
        {"speaker": "2", "text": "Closing wrap."}
    ]
    '''
    turns = parse_dialogue_json(raw)
    assert len(turns) == 4
    assert [t["speaker"] for t in turns] == ["A", "B", "A", "B"]

def test_fallback_parsing_on_malformed_json():
    non_json = (
        "Welcome to today's news briefing.\n\n"
        "In our lead story, markets surged by 500 points today.\n\n"
        "Technology shares led the rally, with major gains across the board."
    )
    turns = parse_dialogue_json(non_json)
    assert len(turns) == 3
    assert turns[0]["speaker"] == "A"
    assert turns[1]["speaker"] == "B"
    assert turns[2]["speaker"] == "A"

def test_format_dialogue_script():
    turns = [
        {"speaker": "A", "text": "Hello world."},
        {"speaker": "B", "text": "Hi there."}
    ]
    formatted = format_dialogue_script(turns, host_a_name="Neerja", host_b_name="Prabhat")
    assert formatted == "Neerja: Hello world.\n\nPrabhat: Hi there."

