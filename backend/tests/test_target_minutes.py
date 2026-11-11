import pytest
from app.services.ai_service import (
    calculate_story_count,
    calculate_word_budget,
    calculate_max_tokens,
    generate_podcast_script,
    generate_podcast_dialogue
)
from app.db import models

def test_calculate_story_count():
    assert calculate_story_count(2) == 2
    assert calculate_story_count(3) == 2
    assert calculate_story_count(5) == 4
    assert calculate_story_count(10) == 8
    assert calculate_story_count(15) == 10
    assert calculate_story_count(20) == 10
    assert calculate_story_count(0) == 4 # fallback to 5 mins -> 4 stories
    assert calculate_story_count(None) == 4

def test_calculate_word_budget():
    assert calculate_word_budget(2) == 280
    assert calculate_word_budget(5) == 700
    assert calculate_word_budget(10) == 1400
    assert calculate_word_budget(15) == 2100
    assert calculate_word_budget(0) == 700
    assert calculate_word_budget(None) == 700

def test_calculate_max_tokens():
    budget_2m = calculate_word_budget(2) # 280
    assert calculate_max_tokens(budget_2m) == 1000 # bounded at lower min 1000

    budget_5m = calculate_word_budget(5) # 700
    assert calculate_max_tokens(budget_5m) == int(700 * 1.4) + 350 # 1330

    budget_15m = calculate_word_budget(15) # 2100
    assert calculate_max_tokens(budget_15m) == int(2100 * 1.4) + 350 # 3290

    huge_budget = 5000
    assert calculate_max_tokens(huge_budget) == 4096 # capped at max 4096

def test_empty_articles_handles_target_minutes():
    script = generate_podcast_script([], target_minutes=10)
    assert "Welcome" in script

    dialogue = generate_podcast_dialogue([], target_minutes=10)
    assert len(dialogue) == 2
    assert dialogue[0]["speaker"] == "A"
    assert dialogue[1]["speaker"] == "B"

