# summarize.py
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are a senior academic architect and expert note-taker. 
Your goal is to transform lecture transcripts into professional, structured study guides. 

CRITICAL FORMATTING RULES:
- DO NOT use any markdown symbols (no ##, no **, no -, no *).
- Use [SECTION_NAME] for all main section titles.
- For concepts, topics, or examples, write the name in UPPERCASE on its own line, followed by the detailed explanation on the next line.
- Maintain a clean, professional, and academic tone.

LANGUAGE RULES:
- If input is in Hindi or Urdu script, output MUST be in Roman Urdu.
- If input is in Roman Urdu, output in Roman Urdu.
- If input is in English, output in English.

OFF-TOPIC FILTERING:
- Ignore all non-academic content (greetings, stories, jokes, class management, technical issues).
- Only summarize actual educational material.

REQUIRED STRUCTURE:

[OVERVIEW]
(Provide a concise 2-3 line summary of what the lecture covers)

[KEY CONCEPTS]
(List all important terms. For each:)
CONCEPT NAME
Detailed explanation of the concept, why it matters, and how it is applied.

[CORE DISCUSSION POINTS]
(List main topics discussed. For each:)
TOPIC NAME
In-depth discussion and analysis of this specific topic from the lecture.

[EXAMPLES]
(List any practical examples provided. For each:)
EXAMPLE TITLE
Details of the example and how it illustrates the academic theory.

[SUMMARY]
(Provide a comprehensive abstractive summary of the entire lecture in 3-5 sentences.)

[QUESTIONS AND ANSWERS]
(Provide a minimum of 5 detailed conceptual questions and their perfect answers based on the lecture.)
Q1: Question text
A1: Detailed answer text

Q2: Question text
A2: Detailed answer text

Q3: Question text
A3: Detailed answer text

Q4: Question text
A4: Detailed answer text

Q5: Question text
A5: Detailed answer text

IMPORTANT: Ensure the transcript is parsed thoroughly. Be detailed in explanations while keeping the structure strictly as defined above."""


def summarize_transcript(transcript: str) -> str:
    """
    Convert transcript to structured lecture notes in same language as input.
    If input contains Urdu script, output in Roman Urdu.
    Returns: notes string
    """
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    # Check if transcript is Roman Urdu (or Urdu script)
    is_urdu = _is_urdu_content(transcript)

    # Chunk long transcript (Groq token limit)
    MAX_CHARS = 12000  # ~3000 tokens safe limit
    
    if len(transcript) <= MAX_CHARS:
        return _call_llm(client, transcript, is_urdu)
    else:
        return _map_reduce(client, transcript, MAX_CHARS, is_urdu)


def _is_urdu_content(text: str) -> bool:
    """Check if text contains Urdu script characters"""
    urdu_chars = set('ابپتثجچحخدڈذرڑزژسشصضطظعغفقکگلمنںھۃۂےۓیؤء')
    return any(char in urdu_chars for char in text)


def _call_llm(client, text: str, is_urdu: bool = False) -> str:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Lecture transcript:\n\n{text}"}
        ],
        max_tokens=2000,
        temperature=0.3,
    )
    return response.choices[0].message.content


def _map_reduce(client, transcript: str, chunk_size: int, is_urdu: bool = False) -> str:
    """
    For 1hr+ lectures:
    MAP: Summarize each chunk separately
    REDUCE: Merge all summaries
    """
    chunks = [transcript[i:i+chunk_size] 
              for i in range(0, len(transcript), chunk_size)]
    
    print(f"[Map-Reduce] {len(chunks)} chunks processing...")
    
    chunk_summaries = []
    for i, chunk in enumerate(chunks):
        print(f"[Map] Chunk {i+1}/{len(chunks)}")
        summary = _call_llm(client, chunk)
        chunk_summaries.append(summary)

    combined = "\n\n---\n\n".join(chunk_summaries)
    
    reduce_prompt = f"""These are summaries of different parts of the same lecture.
Merge them into ONE cohesive structured set of notes (same format):

{combined}"""
    
    return _call_llm(client, reduce_prompt)