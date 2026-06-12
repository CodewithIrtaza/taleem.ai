# Taleem.AI Technical Documentation

Taleem.AI is a sophisticated AI-powered learning assistant designed to help students and professionals transcribe lectures, generate smart notes, and interact with their study material using a Retrieval-Augmented Generation (RAG) system.

---

## 🚀 Tech Stack

### Frontend
- **Framework:** React (Vite)
- **Styling:** Custom Vanilla CSS (with Light/Dark mode support)
- **Icons:** Lucide React
- **API Client:** Axios
- **State Management:** React Hooks (`useState`, `useEffect`, `useRef`)

### Backend
- **Framework:** FastAPI (Python)
- **Authentication:** JWT (JSON Web Tokens) with Argon2 password hashing
- **Database:** Supabase (PostgreSQL) for user data and session metadata
- **Vector Database:** ChromaDB (Local storage for RAG context)
- **Async Processing:** WebSockets (for live recording stream)

### AI & NLP (Groq Cloud)
- **Transcription:** `whisper-large-v3` (High-speed, multi-language speech-to-text)
- **Summarization & RAG:** `llama-3.3-70b-versatile` (Large language model)
- **Embeddings:** `all-MiniLM-L6-v2` (Local CPU-based embeddings via LangChain)

---

## 🛠️ Core Modules & How They Work

### 1. Authentication (`auth.py`)
- Manages user registration and login.
- Uses **Supabase** to store user credentials.
- Passwords are encrypted using **Argon2** before storage.
- Issues **JWT tokens** for secure, stateless communication between frontend and backend.

### 2. Audio Pipeline (`transcribe.py`, `summarize.py`)
- **Transcription:** Uploaded files or recorded streams are sent to Groq's Whisper API. It detects the language automatically and returns a high-accuracy transcript.
- **Summarization:** The transcript is passed to the Llama model with a custom prompt to extract "Key Concepts," "Important Points," and a "General Summary."

### 3. Smart Q&A / RAG System (`rag.py`)
- **Indexing:** The transcript is split into small chunks (500 characters) and converted into "embeddings" (mathematical representations of meaning). These are stored in **ChromaDB**.
- **Retrieval:** When a user asks a question, the system finds the most relevant transcript chunks from ChromaDB.
- **Generation:** These chunks are sent to the LLM as "Context," ensuring the AI answers based *only* on what was actually said in the lecture.

### 4. YouTube Processor (`youtube.py`)
- Uses `yt-dlp` to download the audio stream from a YouTube URL.
- The audio is then fed into the standard transcription and summarization pipeline.

### 5. Document Export (`export.py`)
- Uses `python-docx` to generate a formatted Microsoft Word document containing the lecture title, transcript, and generated notes for offline study.

---

## 🔄 Project Workflow

### Step 1: Input
The user chooses one of three methods:
- **Upload:** Upload an existing `.mp3`, `.wav`, or `.webm` file.
- **YouTube:** Provide a video link.
- **Live:** Record directly from the microphone (streamed via WebSockets for real-time handling).

### Step 2: Processing
- The backend transcribes the audio.
- The transcript is summarized into study notes.
- The transcript is indexed into a session-specific vector database (ChromaDB).
- All metadata (title, summary, transcript) is saved to **Supabase**.

### Step 3: Interaction
- The user can view the **Smart Notes** on the dashboard.
- The user can switch to the **Q&A Tab** to ask specific questions about the lecture content.
- The user can **Export** the material to a `.docx` file.

---

## 📁 Directory Structure

```text
E:/Taleem.AI/
├── backend/
│   ├── auth.py          # User Auth logic
│   ├── database.py      # Supabase DB operations
│   ├── main.py          # FastAPI routes & entry point
│   ├── rag.py           # Vector search & AI Q&A
│   ├── transcribe.py    # Groq Whisper integration
│   ├── summarize.py     # AI Note generation
│   ├── youtube.py       # YouTube audio extraction
│   └── export.py        # Word document generator
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # Main dashboard & logic
│   │   ├── Auth.jsx     # Login/Signup screen
│   │   └── components/  # Modular UI panels
```

---

## 🔐 Security Note
- **API Keys:** Stored in `.env` (Backend).
- **Protected Routes:** All dashboard actions require a valid JWT `Authorization` header.
- **CORS:** Configured to allow only trusted frontend origins.
