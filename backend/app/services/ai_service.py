import re
import openai
from typing import List, Optional
from app.db import models
from app.core.config import settings

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
    """Removes sound effects, speaker tags, markdown formatting, and brackets so TTS reads naturally."""
    # Normalize unicode punctuation
    text = text.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', ' - ')
    text = text.replace('\u2018', "'").replace('\u2019', "'")
    text = text.replace('\u201c', '"').replace('\u201d', '"')
    text = text.replace('\u2026', '...')
    # Remove markdown headers and bolding
    cleaned = re.sub(r'#+\s*', '', text)
    cleaned = re.sub(r'\*\*(.*?)\*\*', r'\1', cleaned)
    cleaned = re.sub(r'\*(.*?)\*', r'\1', cleaned)
    # Remove speaker tags like 'Host:', '[Host]:', 'Narrator:'
    cleaned = re.sub(r'^(Host|Narrator|Speaker|Anchor|Co-host):\s*', '', cleaned, flags=re.MULTILINE | re.IGNORECASE)
    cleaned = re.sub(r'\[.*?\]', '', cleaned) # e.g. [Music swells], [Intro music]
    cleaned = re.sub(r'\(.*?\)', '', cleaned) # e.g. (pause), (laugh)
    # Clean up whitespace
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
        print(f"LLM Error during text processing: {e}")
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
        print(f"LLM Error: {e}")
        # Fallback script if LLM fails
        fallback = "Welcome to today's news briefing. "
        for a in articles:
            fallback += f"Our next story: {a.title}. {a.content}. "
        fallback += "That concludes our podcast."
        return clean_script_for_tts(fallback)

