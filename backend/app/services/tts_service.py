import os
import asyncio
import logging
import edge_tts
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

def generate_audio_from_script(script: str, filename: str, voice: str = "en-US-ChristopherNeural") -> str:
    """
    Converts text to speech using edge-tts (free, no API key required).
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

