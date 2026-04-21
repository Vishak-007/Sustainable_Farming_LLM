from flask import Flask, request, jsonify
from groq import Groq
import os
from dotenv import load_dotenv
from flask_cors import CORS
# Load API key
load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = Flask(__name__)
CORS(app)

# SYSTEM PROMPT
SYSTEM_PROMPT = """
You are an expert agriculture advisor.

You help farmers with:
- crop recommendations
- irrigation advice
- fertilizer suggestions
- pest control
- sustainable farming methods

Rules:
- Keep answers simple
- Give step-by-step guidance
- Be practical and clear
"""

# AI FUNCTION
def ask_ai(question):
    try:
        response = client.chat.completions.create(
           model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": question}
            ]
        )

        return response.choices[0].message.content

    except Exception as e:
        print("GROQ ERROR:", e)
        return str(e)   # 👈 VERY IMPORTANT CHANGE


# API ROUTE
@app.route("/ask", methods=["POST"])
def ask():
    try:
        data = request.get_json()

        print("DATA RECEIVED:", data)   

        if not data:
            return jsonify({"error": "No JSON received"}), 400

        question = data.get("question")

        if not question:
            return jsonify({"error": "Question missing"}), 400

        answer = ask_ai(question)

        return jsonify({"response": answer})

    except Exception as e:
        print("SERVER ERROR:", e)   
        return jsonify({"error": str(e)}), 500


# TEST ROUTE
@app.route("/")
def home():
    return "Smart Farm AI API Running 🚀"


# RUN SERVER
if __name__ == "__main__":
    app.run(debug=True, port=5001)