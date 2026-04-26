from flask import Flask, request, jsonify
from groq import Groq
import os, pathlib, hashlib, json
from dotenv import load_dotenv
from flask_cors import CORS

import PyPDF2
import chromadb
from chromadb.utils import embedding_functions

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = Flask(__name__)
CORS(app)

# Paths
BASE_DIR        = pathlib.Path(__file__).parent.parent
PDF_PATH        = BASE_DIR / "docs" / "AGRICULTURE.pdf"
DB_DIR          = BASE_DIR / "backend" / "chroma_db"
META_FILE       = DB_DIR / "index_meta.json"
COLLECTION_NAME = "agriculture_kb"

# ChromaDB setup
print("[RAG] Initialising ChromaDB ...")
chroma_client = chromadb.PersistentClient(path=str(DB_DIR))
embed_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)
collection = chroma_client.get_or_create_collection(
    name=COLLECTION_NAME,
    embedding_function=embed_fn,
    metadata={"hnsw:space": "cosine"}
)

# ── Crop duration table (in weeks until harvest) ──────────
CROP_DURATION_WEEKS = {
    "rice": 16,      "wheat": 18,     "maize": 13,    "corn": 13,
    "cotton": 22,    "sugarcane": 24, "soybean": 15,  "soya": 15,
    "mustard": 16,   "groundnut": 18, "onion": 17,    "tomato": 14,
    "potato": 13,    "chickpea": 16,  "moong dal": 10,"lentil": 14,
    "barley": 16,    "millet": 12,    "sorghum": 14,  "sunflower": 14,
    "turmeric": 36,  "ginger": 36,    "banana": 40,   "sugarbeet": 20,
}
DEFAULT_DURATION_WEEKS = 16

# ── 12-stage week-focus map ───────────────────────────────
WEEK_FOCUS = {
    1:  "land preparation, seed selection, sowing or transplanting techniques, and pre-sowing soil treatment",
    2:  "germination monitoring, seedling emergence care, first light irrigation, and gap filling",
    3:  "early weed control, thinning or transplanting operations, and basal fertilizer application",
    4:  "second irrigation scheduling, earthing up operations, and micronutrient foliar spray if needed",
    5:  "vegetative growth monitoring, top-dress nitrogen fertilizer application, and pest scouting",
    6:  "mid-vegetative weed control, irrigation at branching or knee-high stage, and nutrient management",
    7:  "mid-season disease monitoring, integrated pest management sprays, and potassium fertilizer application",
    8:  "flowering, tillering, or heading stage management, water-stress avoidance, and pollination care",
    9:  "grain filling, fruit set, bulb or tuber enlargement management, and targeted irrigation",
    10: "late-season crop monitoring, irrigation reduction schedule, and maturity assessment",
    11: "pre-harvest readiness checks, drying down period management, and harvesting indicator assessment",
    12: "harvesting techniques, threshing or picking, drying, grading, and post-harvest storage practices",
}


def get_total_weeks(crop):
    return CROP_DURATION_WEEKS.get((crop or "").lower().strip(), DEFAULT_DURATION_WEEKS)


def get_week_focus(week, total_weeks):
    """Map actual week number to a focus string from the 12-stage template."""
    if total_weeks <= 12:
        return WEEK_FOCUS.get(week, WEEK_FOCUS[12])
    # For longer crops, scale proportionally across the 12 stages
    stage = max(1, min(12, round(week / total_weeks * 12)))
    return WEEK_FOCUS[stage]


# ── PDF helpers ───────────────────────────────────────────
def pdf_fingerprint(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(65536), b""):
            h.update(block)
    return h.hexdigest()


def extract_chunks(path, chunk_size=400, overlap=80):
    chunks = []
    with open(path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page_num, page in enumerate(reader.pages):
            text  = page.extract_text() or ""
            words = text.split()
            start = 0
            while start < len(words):
                chunk_words = words[start: start + chunk_size]
                chunk_text  = " ".join(chunk_words).strip()
                if len(chunk_text) > 80:
                    chunks.append({"text": chunk_text, "page": page_num + 1, "chunk_i": len(chunks)})
                start += chunk_size - overlap
    return chunks


def index_pdf():
    global collection
    if not PDF_PATH.exists():
        print("[RAG] WARN: PDF not found at " + str(PDF_PATH))
        return
    fp = pdf_fingerprint(PDF_PATH)
    DB_DIR.mkdir(parents=True, exist_ok=True)
    if META_FILE.exists():
        meta = json.loads(META_FILE.read_text())
        if meta.get("fingerprint") == fp and collection.count() > 0:
            print("[RAG] Already up-to-date (" + str(collection.count()) + " chunks). Skipping.")
            return
    print("[RAG] Indexing AGRICULTURE.pdf ...")
    chunks = extract_chunks(PDF_PATH)
    if not chunks:
        print("[RAG] WARN: No text extracted from PDF.")
        return
    try:
        chroma_client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    collection = chroma_client.get_or_create_collection(
        name=COLLECTION_NAME, embedding_function=embed_fn, metadata={"hnsw:space": "cosine"}
    )
    IDS   = ["chunk_" + str(c["chunk_i"]) for c in chunks]
    DOCS  = [c["text"] for c in chunks]
    METAS = [{"page": c["page"]} for c in chunks]
    for i in range(0, len(chunks), 100):
        collection.upsert(ids=IDS[i:i+100], documents=DOCS[i:i+100], metadatas=METAS[i:i+100])
    META_FILE.write_text(json.dumps({"fingerprint": fp, "chunks": len(chunks)}))
    print("[RAG] Done. Indexed " + str(len(chunks)) + " chunks.")


index_pdf()


# ── Retrieval ─────────────────────────────────────────────
def retrieve(query, k=6):
    if collection.count() == 0:
        return []
    results = collection.query(query_texts=[query], n_results=min(k, collection.count()))
    return results["documents"][0] if results["documents"] else []


def get_source_pages(query, k=3):
    if collection.count() == 0:
        return []
    try:
        results = collection.query(query_texts=[query], n_results=min(k, collection.count()))
        return ["AGRICULTURE.pdf (page " + str(m.get("page", "?")) + ")"
                for m in (results.get("metadatas") or [[]])[0]]
    except Exception:
        return []


# ── General AI Q&A ────────────────────────────────────────
SYSTEM_PROMPT = """You are an expert agriculture advisor.
You help farmers with crop recommendations, irrigation advice, fertilizer suggestions, pest control, and sustainable farming.
Keep answers simple, give step-by-step guidance, and be practical and clear."""


def ask_ai(question):
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": question}]
        )
        return response.choices[0].message.content
    except Exception as e:
        return str(e)


# ── Weekly advice builder ─────────────────────────────────
def build_rag_advice(crop, week, season="", soil="", state=""):
    total_weeks = get_total_weeks(crop)
    week        = max(1, min(week, total_weeks))
    focus       = get_week_focus(week, total_weeks)

    query         = crop + " crop " + focus + " " + season + " " + soil + " India farming"
    chunks        = retrieve(query, k=6)
    context_block = "\n\n---\n\n".join(chunks) if chunks else "No specific knowledge base content found."

    farmer_ctx = ""
    if soil:   farmer_ctx += "Soil type: " + soil + ". "
    if season: farmer_ctx += "Season: " + season + ". "
    if state:  farmer_ctx += "Location: " + state + ", India. "

    prompt = (
        "You are a precision agriculture advisor. A farmer growing **" + crop + "** needs their "
        "**Week " + str(week) + " of " + str(total_weeks) + " crop advisory** (growing cycle stage: " + focus + ").\n\n"
        + farmer_ctx + "\n\n"
        "Use the agricultural knowledge base below to ground your advice:\n\n"
        "===KNOWLEDGE BASE===\n" + context_block + "\n===END KNOWLEDGE BASE===\n\n"
        "Write a clear, practical **Week " + str(week) + " advisory** for " + crop + " farmers.\n"
        "Focus on: **" + focus + "**.\n\n"
        "Format your response as:\n"
        "1. One intro sentence (1-2 lines max)\n"
        "2. 4-5 bullet points with specific, actionable steps\n"
        "3. One warning or tip prefixed with a warning symbol\n\n"
        "Keep language simple and farmer-friendly."
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a helpful agricultural advisor. Give specific, actionable weekly advice."},
                {"role": "user",   "content": prompt}
            ],
            temperature=0.4,
            max_tokens=600,
        )
        advice_text = response.choices[0].message.content
    except Exception as e:
        advice_text = "Could not generate advice: " + str(e)

    return {
        "crop":         crop,
        "week":         week,
        "total_weeks":  total_weeks,
        "is_final_week": week >= total_weeks,
        "focus":        focus,
        "advice":       advice_text,
        "sources":      get_source_pages(query)
    }


# ── Disease alerts builder ────────────────────────────────
def build_disease_alerts(crop, soil="", state=""):
    query  = crop + " crop diseases pests symptoms treatment prevention control India"
    chunks = retrieve(query, k=5)
    context_block = "\n\n---\n\n".join(chunks) if chunks else "No specific disease data found."

    prompt = (
        "You are an agricultural plant pathologist. Based on the knowledge base below, "
        "identify the top 3-4 diseases or pests that most commonly and severely affect "
        + crop + " crops in India.\n\n"
        "===KNOWLEDGE BASE===\n" + context_block + "\n===END KNOWLEDGE BASE===\n\n"
        "Respond with ONLY a valid JSON array (no extra text, no markdown) in EXACTLY this format:\n"
        '[\n'
        '  {"name": "Disease or Pest Name", "symptoms": "key symptoms in 1-2 sentences", '
        '"tip": "specific actionable treatment or prevention step"},\n'
        '  ...\n'
        ']\n\n'
        "Return 3-4 entries. Focus on the most damaging and common ones for " + crop + " in India."
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a plant disease expert. Return only valid JSON arrays, no markdown."},
                {"role": "user",   "content": prompt}
            ],
            temperature=0.2,
            max_tokens=500,
        )
        text  = response.choices[0].message.content.strip()
        start = text.find("[")
        end   = text.rfind("]") + 1
        if start != -1 and end > start:
            diseases = json.loads(text[start:end])
        else:
            diseases = json.loads(text)
        return diseases[:4]
    except Exception as e:
        print("[DISEASE] Parse error: " + str(e))
        return [
            {"name": "Leaf Blast / Fungal Blight",    "symptoms": "Brown or water-soaked spots on leaves, wilting.",      "tip": "Spray recommended fungicide early; avoid waterlogging."},
            {"name": "Stem Borer / Shoot Fly",        "symptoms": "Dead hearts, holes in stems, reduced tillers.",         "tip": "Apply carbofuran granules at 3 weeks; remove and destroy affected plants."},
            {"name": "Aphids / Whiteflies",           "symptoms": "Yellowing, sticky honeydew on leaves, stunted growth.", "tip": "Use neem oil spray (5 ml/L) or imidacloprid 0.5 ml/L."},
        ]


# ── API Routes ────────────────────────────────────────────

@app.route("/ask", methods=["POST"])
def ask():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON received"}), 400
        question = data.get("question")
        if not question:
            return jsonify({"error": "Question missing"}), 400
        return jsonify({"response": ask_ai(question)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/crop-advice", methods=["POST"])
def crop_advice():
    """
    RAG-powered weekly crop advice (time-gated from frontend).
    Body: { "crop": "Rice", "week": 1, "season": "Kharif", "soil": "Black", "state": "Maharashtra" }
    Response includes total_weeks and is_final_week so the frontend can gate navigation.
    """
    try:
        data   = request.get_json()
        if not data:
            return jsonify({"error": "No JSON body"}), 400
        crop   = (data.get("crop") or "Rice").strip()
        week   = int(data.get("week") or 1)
        season = data.get("season") or ""
        soil   = data.get("soil")   or ""
        state  = data.get("state")  or ""
        return jsonify(build_rag_advice(crop, week, season, soil, state))
    except Exception as e:
        print("[CROP-ADVICE ERROR]:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/disease-alerts", methods=["POST"])
def disease_alerts():
    """
    RAG-powered disease and pest alerts for a specific crop.
    Body: { "crop": "Rice", "soil": "Black", "state": "Maharashtra" }
    """
    try:
        data  = request.get_json()
        if not data:
            return jsonify({"error": "No JSON body"}), 400
        crop  = (data.get("crop") or "Rice").strip()
        soil  = data.get("soil")  or ""
        state = data.get("state") or ""
        diseases = build_disease_alerts(crop, soil, state)
        return jsonify({"crop": crop, "diseases": diseases})
    except Exception as e:
        print("[DISEASE-ALERTS ERROR]:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/")
def home():
    count  = collection.count() if collection else 0
    status = str(count) + " chunks indexed" if count > 0 else "PDF not indexed yet"
    return "Smart Farm AI API Running | RAG: " + status


if __name__ == "__main__":
    app.run(debug=True, port=5001)