import re
import json
import logging
import openai
from typing import List, Dict, Optional
from app.db import models
from app.core.config import settings

logger = logging.getLogger(__name__)

STAGE_DIRECTION_KEYWORDS = (
    'music', 'sound effect', 'sound effects', 'sfx', 'applause', 'cheer', 'cheering',
    'laughter', 'laugh', 'laughs', 'chuckle', 'chuckles', 'giggle', 'giggles',
    'sigh', 'sighs', 'whisper', 'whispers', 'cough', 'coughs', 'clears throat',
    'gasp', 'gasps', 'fade', 'fades', 'swell', 'swells', 'beat', 'pause', 'pauses',
    'intro', 'outro', 'jingle', 'interlude', 'transition', 'theme', 'ambient',
    'silence', 'snicker', 'groan', 'audio cue', 'sting'
)

SPEAKER_NAMES = {
    'host', 'narrator', 'speaker', 'anchor', 'co-host', 'presenter',
    'interviewer', 'interviewee'
}

def is_stage_direction_or_speaker(inner: str) -> bool:
    """Checks whether the text inside brackets or parentheses represents a stage direction, sound effect, or speaker label."""
    s = inner.strip().lower()
    if not s:
        return True
    first_token = re.split(r'[\s:_\-]', s)[0]
    if first_token in SPEAKER_NAMES:
        return True
    for kw in STAGE_DIRECTION_KEYWORDS:
        if re.search(r'\b' + re.escape(kw), s):
            return True
    return False

def get_llm_client():
    kwargs = {}
    if settings.OPENAI_API_KEY:
        kwargs["api_key"] = settings.OPENAI_API_KEY
    else:
        # Fallback to local or dummy if needed
        kwargs["api_key"] = "dummy" 
        
    if settings.OPENAI_BASE_URL:
        kwargs["base_url"] = settings.OPENAI_BASE_URL
        
    return openai.OpenAI(**kwargs)

def clean_script_for_tts(text: str) -> str:
    """
    Cleans audio script for TTS by stripping speaker tags, markdown formatting,
    and stage directions (music cues, pauses, sound effects) while preserving legitimate
    parenthetical and bracketed content (acronyms, numbers, currencies, explanations).
    """
    if not text:
        return ""

    # Normalize unicode punctuation
    text = text.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', ' - ')
    text = text.replace('\u2018', "'").replace('\u2019', "'")
    text = text.replace('\u201c', '"').replace('\u201d', '"')
    text = text.replace('\u2026', '...')

    # Remove markdown headers and bolding/italics
    cleaned = re.sub(r'#+\s*', '', text)
    cleaned = re.sub(r'\*\*(.*?)\*\*', r'\1', cleaned)
    cleaned = re.sub(r'\*(.*?)\*', r'\1', cleaned)

    # Remove speaker tags like 'Host:', '[Host]:', 'Narrator - Morning Edition:'
    cleaned = re.sub(
        r'^\s*(\[|\()?\s*(Host|Narrator|Speaker|Anchor|Co-host|Presenter|Interviewer|Interviewee)(\s*\d*)?(\s*[-:]\s*[^\]\)\n]*)?(\]|\))?\s*:\s*',
        '',
        cleaned,
        flags=re.MULTILINE | re.IGNORECASE
    )

    # Process square brackets [...]
    def replace_brackets(match: re.Match) -> str:
        inner = match.group(1)
        if is_stage_direction_or_speaker(inner):
            return ""
        # Preserve legitimate text inside brackets by unwrapping (e.g. [the President] -> the President)
        return inner

    cleaned = re.sub(r'\[(.*?)\]', replace_brackets, cleaned)

    # Process parentheses (...)
    def replace_parentheses(match: re.Match) -> str:
        inner = match.group(1)
        if is_stage_direction_or_speaker(inner):
            return ""
        # Retain legitimate parenthetical text (e.g. (FBI), (up 15%), ($5 billion))
        return f"({inner})"

    cleaned = re.sub(r'\((.*?)\)', replace_parentheses, cleaned)

    # Clean up whitespace before punctuation
    cleaned = re.sub(r'\s+([,\.\?!;:])', r'\1', cleaned)

    # Clean up consecutive spaces on the same line
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)

    # Clean up whitespace lines
    lines = [line.strip() for line in cleaned.split('\n') if line.strip()]
    return "\n\n".join(lines)

def generate_podcast_script_from_text(article_text: str, tone: str = "professional", host_style: str = "informative", title: Optional[str] = None) -> str:
    """
    Uses an LLM to transform a raw news article into an engaging podcast script monologue.
    """
    if not article_text or not article_text.strip():
        return "Welcome to today's news update. There is no news article content provided for today. Thank you for listening."
        
    client = get_llm_client()
    
    title_context = f"Topic / Title: {title}\n" if title else ""
    
    system_prompt = f"""
    You are an expert podcast host and journalist.
    Tone: {tone}
    Host Style: {host_style}
    
    Your task is to take the provided news article text and adapt it into a compelling, conversational podcast episode script.
    Guidelines:
    1. Hook the listener with a catchy opening line welcoming them to the show.
    2. Summarize and unpack the key facts, context, implications, and takeaways from the article in a natural speaking voice.
    3. Ensure seamless transitions between different points.
    4. Conclude with a memorable closing sign-off.
    5. CRITICAL: Output ONLY the spoken narration. DO NOT include speaker tags (e.g., 'Host:'), sound effects (e.g., '[Upbeat Music]'), or stage directions.
    """
    
    try:
        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"{title_context}Here is the news article text to transform:\n\n{article_text}"}
            ],
            temperature=0.7,
            max_tokens=2500
        )
        raw_script = response.choices[0].message.content
        return clean_script_for_tts(raw_script)
    except Exception as e:
        logger.error(f"LLM Error during text processing: {e}")
        # Smart fallback: clean and format the provided article text as a spoken briefing
        clean_text = clean_script_for_tts(article_text)
        first_part = clean_text[:1200] if len(clean_text) > 1200 else clean_text
        episode_title = title if title else "Today's Top Story"
        return f"Welcome to today's audio briefing. In our top story, {episode_title}. {first_part}. Thank you for tuning in to this news update. Have a wonderful day."

def generate_podcast_script(articles: List[models.Article], tone: str = "professional", host_style: str = "informative") -> str:
    """
    Uses an LLM to generate a podcast script from a list of articles.
    """
    if not articles:
        return "Welcome to the podcast. We have no news for you today. Goodbye!"
        
    client = get_llm_client()
    
    # Prepare article text
    articles_text = ""
    for idx, article in enumerate(articles):
        articles_text += f"\n--- STORY {idx + 1} ---\n"
        articles_text += f"Headline: {article.title}\n"
        articles_text += f"Content: {article.content}\n"
        
    system_prompt = f"""
    You are an AI generating a script for a news podcast.
    Tone: {tone}
    Host Style: {host_style}
    
    Your task is to take the provided news stories and write a seamless podcast script.
    It should include:
    - An opening intro.
    - Summaries and context for each story, presented naturally as a human host would.
    - Smooth transitions between stories.
    - A closing outro.
    
    Output ONLY the spoken script. Do not include stage directions, sound effects, or speaker tags (like 'Host:').
    Just pure spoken text. Make it sound like a real, engaging podcast, not just reading bullet points.
    """
    
    try:
        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here are the stories:\n{articles_text}"}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        raw_script = response.choices[0].message.content
        return clean_script_for_tts(raw_script)
    except Exception as e:
        logger.error(f"LLM Error: {e}")
        # Fallback script if LLM fails
        fallback = "Welcome to today's news briefing. "
        for a in articles:
            fallback += f"Our next story: {a.title}. {a.content}. "
        fallback += "That concludes our podcast."
        return clean_script_for_tts(fallback)

def parse_dialogue_json(raw_text: str) -> List[Dict[str, str]]:
    """
    Parses and validates a strict JSON list of dialogue turns:
    [{"speaker": "A", "text": "..."}, {"speaker": "B", "text": "..."}]
    Handles raw JSON, markdown-wrapped JSON (```json ... ```), and provides
    resilient fallback parsing if the LLM output is malformed.
    """
    if not raw_text or not raw_text.strip():
        return []

    text_to_parse = raw_text.strip()

    # Strip markdown code blocks if present
    if "```" in text_to_parse:
        code_block_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text_to_parse, re.IGNORECASE)
        if code_block_match:
            text_to_parse = code_block_match.group(1).strip()

    # Try direct JSON parsing
    parsed = None
    try:
        parsed = json.loads(text_to_parse)
    except Exception:
        # Try extracting JSON array with regex
        array_match = re.search(r'\[\s*\{[\s\S]*\}\s*\]', text_to_parse)
        if array_match:
            try:
                parsed = json.loads(array_match.group(0))
            except Exception:
                parsed = None

    validated_turns: List[Dict[str, str]] = []

    if isinstance(parsed, list):
        for item in parsed:
            if not isinstance(item, dict):
                continue
            raw_speaker = str(item.get("speaker", "A")).strip().upper()
            speaker = "A" if "A" in raw_speaker or raw_speaker in ["1", "HOST 1", "HOST A"] else "B"
            raw_content = str(item.get("text", "")).strip()
            cleaned_content = clean_script_for_tts(raw_content)
            if cleaned_content:
                validated_turns.append({"speaker": speaker, "text": cleaned_content})

    # If valid turns found, return them
    if validated_turns:
        return validated_turns

    # Fallback parsing: split raw text into alternating turns between Host A and Host B
    logger.warning("Dialogue JSON parsing yielded no valid turns; using fallback segmentation.")
    cleaned_all = clean_script_for_tts(raw_text)
    paragraphs = [p.strip() for p in cleaned_all.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [p.strip() for p in cleaned_all.split("\n") if p.strip()]

    turns = []
    current_speaker = "A"
    for para in paragraphs:
        if para:
            turns.append({"speaker": current_speaker, "text": para})
            current_speaker = "B" if current_speaker == "A" else "A"

    return turns

def format_dialogue_script(turns: List[Dict[str, str]], host_a_name: str = "Host A", host_b_name: str = "Host B") -> str:
    """Formats dialogue turns into human-readable text with speaker headers for UI & DB storage."""
    formatted_lines = []
    for turn in turns:
        speaker_label = host_a_name if turn.get("speaker") == "A" else host_b_name
        formatted_lines.append(f"{speaker_label}: {turn.get('text', '')}")
    return "\n\n".join(formatted_lines)

def generate_podcast_dialogue_from_text(
    article_text: str,
    tone: str = "professional",
    host_style: str = "conversational",
    title: Optional[str] = None
) -> List[Dict[str, str]]:
    """
    Uses an LLM to transform raw news article text into a structured two-host dialogue.
    Returns a list of turns: [{"speaker": "A", "text": "..."}, {"speaker": "B", "text": "..."}]
    """
    if not article_text or not article_text.strip():
        return [
            {"speaker": "A", "text": "Welcome to today's news update. We have no news article content provided for today."},
            {"speaker": "B", "text": "That is right. Please submit an article to generate a podcast. Goodbye!"}
        ]

    client = get_llm_client()
    title_context = f"Topic / Title: {title}\n" if title else ""

    system_prompt = f"""
    You are an expert podcast production team creating a two-host conversational news podcast.
    Host A is the lead anchor who introduces the episode, guides the conversation, and sets up each talking point.
    Host B is the analyst and co-host who provides context, reacts, offers additional details, and asks natural follow-up questions.
    Tone: {tone}
    Host Style: {host_style}

    Your task is to take the provided news article text and adapt it into a lively, natural back-and-forth dialogue between Host A and Host B.

    CRITICAL INSTRUCTION - STRICT JSON OUTPUT:
    You MUST output ONLY a valid JSON array of objects. Do not include markdown formatting, code fences, or any commentary outside the JSON array.
    Each object in the array MUST contain:
      "speaker": "A" or "B"
      "text": Spoken words for this turn

    Example:
    [
      {{"speaker": "A", "text": "Welcome to today's briefing. Today we are looking at a major technological breakthrough."}},
      {{"speaker": "B", "text": "That's right, Alex. The new findings could reshape how we think about quantum systems."}}
    ]

    Rules:
    1. Write natural conversational dialogue with approximately 6 to 12 alternating turns.
    2. Do NOT include speaker labels, stage directions, or audio cues inside the "text" string.
    3. Ground all statements strictly in the facts from the source text.
    """

    try:
        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"{title_context}Here is the news article text to transform:\n\n{article_text}"}
            ],
            temperature=0.7,
            max_tokens=2500
        )
        raw_output = response.choices[0].message.content
        return parse_dialogue_json(raw_output)
    except Exception as e:
        logger.error(f"LLM Error during dialogue generation: {e}")
        # Smart fallback: split the article into a 4-turn dialogue
        clean_text = clean_script_for_tts(article_text)
        midpoint = len(clean_text) // 2
        part1 = clean_text[:midpoint].rsplit('.', 1)[0] + '.'
        part2 = clean_text[len(part1):].strip()
        ep_title = title if title else "Today's Top Story"
        return [
            {"speaker": "A", "text": f"Welcome to today's podcast briefing. In our top story today: {ep_title}."},
            {"speaker": "B", "text": f"Thanks for tuning in. Here are the core details: {part1}"},
            {"speaker": "A", "text": f"Looking further into this story, {part2}"},
            {"speaker": "B", "text": "That wraps up our coverage for today. Thank you for listening, and have a great day."}
        ]

def generate_podcast_dialogue(
    articles: List[models.Article],
    tone: str = "professional",
    host_style: str = "conversational"
) -> List[Dict[str, str]]:
    """
    Uses an LLM to transform multiple news articles into a structured two-host dialogue.
    Returns a list of turns: [{"speaker": "A", "text": "..."}, {"speaker": "B", "text": "..."}]
    """
    if not articles:
        return [
            {"speaker": "A", "text": "Welcome to today's news briefing."},
            {"speaker": "B", "text": "We currently have no news stories to discuss. Thank you for joining us!"}
        ]

    client = get_llm_client()

    articles_text = ""
    for idx, article in enumerate(articles):
        articles_text += f"\n--- STORY {idx + 1} ---\n"
        articles_text += f"Headline: {article.title}\n"
        articles_text += f"Content: {article.content}\n"

    system_prompt = f"""
    You are an expert podcast production team creating a two-host conversational news podcast.
    Host A is the lead anchor (welcoming listeners, introducing the main headlines, and steering transitions).
    Host B is the analyst and co-host (providing perspective, breaking down key statistics, and reacting with color).
    Tone: {tone}
    Host Style: {host_style}

    Your task is to take the provided stories and adapt them into a smooth, natural two-host dialogue.

    CRITICAL INSTRUCTION - STRICT JSON OUTPUT:
    You MUST output ONLY a valid JSON array of objects. Do not include markdown formatting, code fences, or any commentary outside the JSON array.
    Each object in the array MUST contain:
      "speaker": "A" or "B"
      "text": Spoken words for this turn

    Example:
    [
      {{"speaker": "A", "text": "Hello and welcome to today's podcast briefing."}},
      {{"speaker": "B", "text": "Glad to have you with us. Our first big headline comes from..."}}
    ]

    Rules:
    1. Write natural conversational dialogue with approximately 6 to 14 alternating turns covering the stories.
    2. Do NOT include speaker labels, stage directions, or audio cues inside the "text" string.
    3. Ground all statements strictly in the facts from the source stories.
    """

    try:
        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here are the news stories to cover:\n{articles_text}"}
            ],
            temperature=0.7,
            max_tokens=2500
        )
        raw_output = response.choices[0].message.content
        return parse_dialogue_json(raw_output)
    except Exception as e:
        logger.error(f"LLM Error during multi-article dialogue generation: {e}")
        turns = [
            {"speaker": "A", "text": "Welcome to today's news briefing with our top stories."}
        ]
        curr = "B"
        for a in articles:
            turns.append({"speaker": curr, "text": f"First up: {a.title}. {a.content}."})
            curr = "A" if curr == "B" else "B"
        turns.append({"speaker": curr, "text": "That concludes today's briefing. Thanks for listening!"})
        return turns
