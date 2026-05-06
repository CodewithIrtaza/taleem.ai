# database.py — Supabase version
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

def upload_to_supabase(file_path: str, destination_name: str) -> str:
    """Uploads a file to Supabase Storage 'lectures' bucket and returns its public URL."""
    try:
        with open(file_path, "rb") as f:
            supabase.storage.from_("lectures").upload(
                path=destination_name,
                file=f,
                file_options={"content-type": "audio/mpeg"}
            )
        # Get public URL
        res = supabase.storage.from_("lectures").get_public_url(destination_name)
        return res
    except Exception as e:
        print(f"[Supabase Storage] Error: {e}")
        return ""

def save_session(session_id, title, language, duration, transcript, notes, source, user_id, audio_url=""):
    supabase.table("lecture_sessions").insert({
        "id": session_id,
        "user_id": user_id,
        "title": title,
        "language": language,
        "duration": str(duration),
        "transcript": transcript,
        "notes": notes,
        "source": source,
        "audio_url": audio_url
    }).execute()

def get_all_sessions(user_id: str):
    r = supabase.table("lecture_sessions")\
        .select("id, title, language, duration, source, created_at")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .execute()
    return r.data

def get_session(session_id: str, user_id: str):
    r = supabase.table("lecture_sessions")\
        .select("*")\
        .eq("id", session_id)\
        .eq("user_id", user_id)\
        .execute()
    return r.data[0] if r.data else None

def delete_session(session_id: str, user_id: str):
    supabase.table("lecture_sessions")\
        .delete()\
        .eq("id", session_id)\
        .eq("user_id", user_id)\
        .execute()