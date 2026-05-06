# rag.py
import os
from groq import Groq
from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

# CPU pe chalega — no GPU needed
EMBEDDINGS = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"}
)

# Har session ka alag ChromaDB folder
DB_DIR = "chroma_sessions"
os.makedirs(DB_DIR, exist_ok=True)


def index_transcript(session_id: str, transcript: str):
    """
    Split transcript into chunks and store in ChromaDB.
    Do this once — then you can ask questions on that session.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.split_text(transcript)

    vectordb = Chroma(
        collection_name=session_id,
        embedding_function=EMBEDDINGS,
        persist_directory=f"{DB_DIR}/{session_id}"
    )
    vectordb.add_texts(chunks)
    print(f"[RAG] {len(chunks)} chunks indexed for session: {session_id}")
    return len(chunks)


def ask_question(session_id: str, question: str) -> str:
    """
    Find relevant chunks from session transcript,
    then generate answer using Llama.
    Answer will be in Roman Urdu if context is in Roman Urdu/Urdu.
    """
    # 1. Load Vector DB
    vectordb = Chroma(
        collection_name=session_id,
        embedding_function=EMBEDDINGS,
        persist_directory=f"{DB_DIR}/{session_id}"
    )

    # 2. Retrieve top 4 relevant chunks
    docs = vectordb.similarity_search(question, k=4)
    context = "\n\n".join([doc.page_content for doc in docs])
    
    # Check if context is Urdu/Roman Urdu
    is_urdu = _is_urdu_content(context)

    # 3. Get answer from LLM
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    system_message = (
        "You are a professional study assistant. Answer the student's question using ONLY the provided lecture context. "
        "If the answer is not in the context, say 'This topic was not covered in the lecture.' "
        "DO NOT use markdown symbols like ## or **. Keep the tone academic and professional."
    )
    
    if is_urdu:
        system_message += (
            " IMPORTANT: The lecture context is in Urdu/Roman Urdu. "
            "You MUST provide your answer in clean, readable Roman Urdu (Latin script) ONLY. "
            "Do not use Urdu script or English."
        )
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": system_message
            },
            {
                "role": "user",
                "content": f"Lecture context:\n{context}\n\nQuestion: {question}"
            }
        ],
        max_tokens=500,
        temperature=0.2,
    )
    result = response.choices[0].message.content
    
    return result


def _is_urdu_content(text: str) -> bool:
    """Check if text contains Urdu script characters"""
    urdu_chars = set('ابپتثجچحخدڈذرڑزژسشصضطظعغفقکگلمنںھۃۂےۓیؤء')
    return any(char in urdu_chars for char in text)