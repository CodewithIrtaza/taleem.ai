# transcribe.py
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()  # Load first

def transcribe_audio(file_path: str) -> dict:
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    with open(file_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=audio_file,
            response_format="verbose_json",
            language=None,
        )
    
    language = getattr(transcription, "language", "unknown")
    text = transcription.text
    
    print(f"[DEBUG] Detected language: {language}")
    
    # Check if we need to convert to Roman Urdu
    # This covers Hindi, Urdu script, and cases where Whisper detects Urdu script
    needs_conversion = (
        (language and language.lower() in ["hi", "hindi", "ur", "urdu"]) or 
        _contains_urdu_script(text)
    )

    if needs_conversion:
        print(f"[DEBUG] {language} or Urdu script detected - converting to Roman Urdu using LLM")
        text = _translate_to_roman(client, text, language)
        language = "ur" # Standardize as Urdu for downstream
    
    return {
        "text": text,
        "language": language,
        "duration": getattr(transcription, "duration", 0),
    }


def _contains_urdu_script(text: str) -> bool:
    """Check if text contains Urdu script characters"""
    urdu_chars = set('ابپتثجچحخدڈذرڑزژسشصضطظعغفقکگلمنںھۃۂےۓیؤء')
    return any(char in urdu_chars for char in text)

def _translate_to_roman(client, text: str, source_lang: str = "auto") -> str:
    """Translates Hindi or Urdu script text to Roman Urdu using LLM"""
    MAX_CHARS = 12000
    
    if len(text) <= MAX_CHARS:
        return _call_translation_llm(client, text, source_lang)
    
    # Chunking for long texts
    chunks = [text[i:i+MAX_CHARS] for i in range(0, len(text), MAX_CHARS)]
    translated_chunks = []
    
    for chunk in chunks:
        translated_chunks.append(_call_translation_llm(client, chunk, source_lang))
        
    return " ".join(translated_chunks)

def _call_translation_llm(client, text: str, source_lang: str) -> str:
    prompt = (
        "You are a professional translator specializing in South Asian languages. "
        f"The following text is in {source_lang} (could be Hindi Devanagari or Urdu script). "
        "Convert/Translate it into clean, readable Roman Urdu (Latin script). "
        "Provide ONLY the translation and nothing else. Do not add any introductory or concluding text."
    )
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": text}
        ],
        max_tokens=4000,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()