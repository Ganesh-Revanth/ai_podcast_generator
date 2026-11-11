import json
import pytest
from unittest.mock import patch, MagicMock
from app.db import models
from app.services.ai_service import parse_fact_check_json, fact_check_script

def test_parse_fact_check_json_valid_flags():
    raw_json = json.dumps([
        {
            "claim": "India launched 500 satellites today",
            "status": "unsupported",
            "reason": "The source articles do not report launching 500 satellites",
            "severity": "high"
        },
        {
            "claim": "The GDP grew by 15 percent",
            "status": "exaggeration",
            "reason": "Source states GDP grew by 6.8 percent, not 15 percent",
            "severity": "medium"
        }
    ])

    flags = parse_fact_check_json(raw_json)
    assert len(flags) == 2
    assert flags[0]["claim"] == "India launched 500 satellites today"
    assert flags[0]["status"] == "unsupported"
    assert flags[0]["severity"] == "high"
    assert flags[1]["severity"] == "medium"

def test_parse_fact_check_json_markdown_wrapper():
    wrapped = "```json\n[{\"claim\": \"Stray claim\", \"status\": \"unsupported\", \"reason\": \"Not in source\", \"severity\": \"low\"}]\n```"
    flags = parse_fact_check_json(wrapped)
    assert len(flags) == 1
    assert flags[0]["claim"] == "Stray claim"
    assert flags[0]["severity"] == "low"

def test_parse_fact_check_json_empty_array():
    assert parse_fact_check_json("[]") == []
    assert parse_fact_check_json("") == []
    assert parse_fact_check_json("invalid json text") == []

def test_fact_check_script_flagged():
    article = models.Article(
        title="ISRO launches communication satellite",
        source="The Hindu",
        content="ISRO successfully launched the GSAT satellite into geostationary transfer orbit today."
    )
    script = "Welcome to the news. ISRO launched 100 astronauts to Mars today."

    mock_llm_response = MagicMock()
    mock_llm_response.choices = [
        MagicMock(message=MagicMock(content=json.dumps([
            {
                "claim": "ISRO launched 100 astronauts to Mars today",
                "status": "unsupported",
                "reason": "Source article only mentions launching a communication satellite, not astronauts to Mars.",
                "severity": "high"
            }
        ])))
    ]

    with patch("app.services.ai_service.get_llm_client") as mock_client_factory:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_llm_response
        mock_client_factory.return_value = mock_client

        status, flags = fact_check_script(script, [article])
        assert status == "flagged"
        assert len(flags) == 1
        assert "Mars" in flags[0]["claim"]

def test_fact_check_script_passed():
    article = models.Article(
        title="ISRO launches communication satellite",
        source="The Hindu",
        content="ISRO successfully launched the GSAT satellite into geostationary transfer orbit today."
    )
    script = "Welcome to the briefing. In space news, ISRO successfully placed the GSAT satellite into orbit."

    mock_llm_response = MagicMock()
    mock_llm_response.choices = [
        MagicMock(message=MagicMock(content="[]"))
    ]

    with patch("app.services.ai_service.get_llm_client") as mock_client_factory:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_llm_response
        mock_client_factory.return_value = mock_client

        status, flags = fact_check_script(script, [article])
        assert status == "passed"
        assert len(flags) == 0

