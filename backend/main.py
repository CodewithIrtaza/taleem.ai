import os, uuid
from fastapi import FastAPI, File, UploadFile, HTTPException, WebSocket, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from auth import register_user, login_user, get_current_user, decode_token, change_password
from transcribe import transcribe_audio
from summarize import summarize_transcript
from rag import index_transcript, ask_question
from youtube import download_youtube_audio
from export import export_to_docx
from database import save_session, get_all_sessions, get_session, delete_session

load_dotenv()

app = FastAPI(title="Taleem.AI Backend", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".webm", ".mp4"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB

class TranscriptRequest(BaseModel):
    transcript: str

class QuestionRequest(BaseModel):
    session_id: str
    question: str

class YoutubeRequest(BaseModel):
    url: str

class ExportRequest(BaseModel):
    title: str
    transcript: str
    notes: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

# ── Health ────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Taleem.AI backend is running ✅"}

@app.get("/test-key")
def test_key():
    key = os.getenv("GROQ_API_KEY")
    if not key:
        return {"status": "❌ Key not found"}
    return {"status": "✅ Key found", "preview": key[:8] + "..."}

# ── Auth ──────────────────────────────────────────────────────────────────
@app.post("/auth/register")
def register(req: RegisterRequest):
    return register_user(req.email, req.password, req.name)

@app.post("/auth/login")
def login(req: LoginRequest):
    return login_user(req.email, req.password)

@app.get("/auth/me")
def me(user=Depends(get_current_user)):
    return user

@app.post("/auth/change-password")
def update_password(req: ChangePasswordRequest, user=Depends(get_current_user)):
    return change_password(user["sub"], req.old_password, req.new_password)

# ── Audio Upload ──────────────────────────────────────────────────────────
from database import save_session, get_all_sessions, get_session, delete_session, upload_to_supabase

# ... (middle part unchanged until pipelines)

@app.post("/transcribe-and-summarize")
async def full_pipeline(
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Format not supported: {ext}")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(413, f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB.")

    session_id = str(uuid.uuid4())
    temp_filename = f"{session_id}{ext}"
    save_path = os.path.join(UPLOAD_DIR, temp_filename)

    with open(save_path, "wb") as f:
        f.write(contents)

    try:
        print("[Pipeline] Step 1: Transcribing...")
        t = transcribe_audio(save_path)

        print("[Pipeline] Step 2: Summarizing...")
        notes = summarize_transcript(t["text"])

        print("[Pipeline] Step 3: Indexing...")
        index_transcript(session_id, t["text"])

        print("[Pipeline] Step 4: Uploading to Cloud...")
        audio_url = upload_to_supabase(save_path, temp_filename)

        print("[Pipeline] Step 5: Saving session...")
        title = os.path.splitext(file.filename)[0][:50]
        save_session(
            session_id, 
            title, 
            t["language"], 
            t["duration"], 
            t["text"], 
            notes,
            "upload", 
            user_id=user["sub"],
            audio_url=audio_url
        )

        return {
            "success": True,
            "session_id": session_id,
            "language_detected": t["language"],
            "duration_seconds": t["duration"],
            "transcript": t["text"],
            "notes": notes,
        }

    except ValueError as ve:
        raise HTTPException(400, str(ve))
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        # Mistake 3 Fix: Cleanup local file
        if os.path.exists(save_path):
            os.remove(save_path)

@app.websocket("/record-live")
async def record_live(websocket: WebSocket):
    await websocket.accept()
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close()
        return
    
    try:
        user_data = decode_token(token)
        user_id = user_data["sub"]
    except Exception:
        await websocket.close()
        return
    
    audio_chunks = []
    save_path = ""
    try:
        while True:
            data = await websocket.receive_bytes()
            if data == b"END": break
            audio_chunks.append(data)

        if not audio_chunks: return

        session_id = str(uuid.uuid4())
        temp_filename = f"live_{session_id}.webm"
        save_path = os.path.join(UPLOAD_DIR, temp_filename)

        with open(save_path, "wb") as f:
            for chunk in audio_chunks: f.write(chunk)

        await websocket.send_json({"status": "processing"})

        t = transcribe_audio(save_path)
        notes = summarize_transcript(t["text"])
        index_transcript(session_id, t["text"])
        
        audio_url = upload_to_supabase(save_path, temp_filename)
        
        save_session(
            session_id, "Live", t["language"], 0, t["text"], notes,
            "live", user_id=user_id, audio_url=audio_url
        )

        await websocket.send_json({
            "success": True,
            "session_id": session_id,
            "transcript": t["text"],
            "notes": notes,
        })
    finally:
        if save_path and os.path.exists(save_path):
            os.remove(save_path)
        await websocket.close()

@app.post("/transcribe-youtube")
async def youtube_pipeline(req: YoutubeRequest, user=Depends(get_current_user)):
    audio_path = ""
    try:
        audio_path = download_youtube_audio(req.url)
        t = transcribe_audio(audio_path)
        notes = summarize_transcript(t["text"])
        session_id = str(uuid.uuid4())
        index_transcript(session_id, t["text"])
        
        temp_filename = os.path.basename(audio_path)
        audio_url = upload_to_supabase(audio_path, temp_filename)

        title = f"YouTube: {req.url[-11:]}"
        save_session(
            session_id, title, t["language"], 0, t["text"], notes,
            "youtube", user_id=user["sub"], audio_url=audio_url
        )
        return {"success": True, "session_id": session_id, "transcript": t["text"], "notes": notes}
    finally:
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)

# ── Summarize ─────────────────────────────────────────────────────────────
@app.post("/summarize")
async def summarize(req: TranscriptRequest):
    if not req.transcript.strip():
        raise HTTPException(400, "Transcript is empty")
    notes = summarize_transcript(req.transcript)
    return {"success": True, "notes": notes}

# ── Q&A ───────────────────────────────────────────────────────────────────
@app.post("/ask")
async def ask(req: QuestionRequest, user=Depends(get_current_user)):
    try:
        answer = ask_question(req.session_id, req.question)
        return {"success": True, "answer": answer}
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Export ────────────────────────────────────────────────────────────────
@app.post("/export")
async def export_notes(req: ExportRequest, user=Depends(get_current_user)):
    path = export_to_docx(req.title, req.transcript, req.notes)
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename="TaleemAI_Notes.docx"
    )

# ── Session History ───────────────────────────────────────────────────────
@app.get("/sessions")
def list_sessions(user=Depends(get_current_user)):
    return {"sessions": get_all_sessions(user["sub"])}

@app.get("/sessions/{session_id}")
def get_one(session_id: str, user=Depends(get_current_user)):
    s = get_session(session_id, user["sub"])
    if not s:
        raise HTTPException(404, "Session not found")
    return s

@app.delete("/sessions/{session_id}")
def remove_session(session_id: str, user=Depends(get_current_user)):
    delete_session(session_id, user["sub"])
    return {"success": True, "message": "Deleted successfully ✅"}