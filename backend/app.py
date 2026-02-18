import os
import json
import re
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain.schema import SystemMessage, HumanMessage
from langchain_groq import ChatGroq

app = Flask(__name__)
CORS(app)

llm = ChatGroq(
    temperature=0.1,
    groq_api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.3-70b-versatile"
)

CYBERSEC_PROMPT = """**You are a cybersecurity expert analyzing server logs.**
Analyse log files very carefully and also analyse each and every log accurately and give results accordingly.
1. **RISK ASSESSMENT:** Calculate risk percentage (0-100%)
2. **THREAT IDENTIFICATION:** List critical vulnerabilities
3. **MITIGATION PLAN:** Provide remediation steps
4. **TREND ANALYSIS:** Generate JSON for weekly risk progression according to log file date
5. **REPORT: Produce a clean, pointwise, and detailed textual report summarizing the risks, warnings, and suggested mitigations in plain language.

**OUTPUT FORMAT:**
RISK: X%
WARNINGS:
- 🔴 Critical: [count]
- 🟠 High: [count]
- 🟡 Medium: [count]
TRENDS: {"labels": [], "risk": [], "warnings": []}
MITIGATIONS:
- 🛡️ [Priority]: [action]
"""

def extract_analysis_data(response_text):
    try:
        result = {
            "risk_percentage": 0,
            "warnings": {"critical": 0, "high": 0, "medium": 0},
            "trend_data": {"labels": [], "risk": [], "warnings": []},
            "mitigations": [],
            "report": ""
        }

        # RISK
        risk_match = re.search(r"RISK:\s*(\d+)%", response_text)
        if risk_match:
            result["risk_percentage"] = min(100, max(0, int(risk_match.group(1))))

        # WARNINGS
        warnings_match = re.finditer(r"- (🔴|🟠|🟡)\s(\w+):\s(\d+)", response_text)
        for match in warnings_match:
            severity = match.group(2).lower()
            if severity in result["warnings"]:
                result["warnings"][severity] = int(match.group(3))

        # TRENDS
        trends_match = re.search(r"TRENDS:\s*(\{.*?\})", response_text, re.DOTALL)
        if trends_match:
            try:
                result["trend_data"] = json.loads(trends_match.group(1))
            except json.JSONDecodeError:
                pass

        # MITIGATIONS
        mitigations = re.findall(r"- 🛡️ (.*?): (.*?)(?=\n-|$)", response_text)
        result["mitigations"] = [
            {"priority": p[0].strip(), "action": p[1].strip()} 
            for p in mitigations
        ]

        # REPORT
        report_match = re.search(r"REPORT:\s*(.*)", response_text, re.DOTALL)
        if report_match:
            result["report"] = report_match.group(1).strip()
        else:
            result["report"] = "No detailed report available."

        return result
    except Exception as e:
        raise ValueError(f"Analysis parsing failed: {str(e)}")

@app.route('/api/analyze', methods=['POST'])
def analyze():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    try:
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "Empty filename"}), 400

        log_content = file.read().decode('utf-8')
        if not log_content.strip():
            return jsonify({"error": "Empty log file"}), 400

        response = llm.invoke([
            SystemMessage(content=CYBERSEC_PROMPT),
            HumanMessage(content=log_content)
        ])

        analysis = extract_analysis_data(response.content)
        
        return jsonify({
            "timestamp": datetime.now().isoformat(),
            "risk_score": analysis["risk_percentage"],
            "threat_level": "CRITICAL" if analysis["risk_percentage"] > 70 else "WARNING",
            "warnings": analysis["warnings"],
            "trends": analysis["trend_data"],
            "actions": analysis["mitigations"],
            "report": analysis["report"],
            "raw_analysis": log_content  # Keep raw log for chat context
        })

    except Exception as e:
        app.logger.error(f"Analysis error: {str(e)}")
        return jsonify({
            "error": "Security analysis failed",
            "details": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_message = data.get('message', '')
    log_context = data.get('log_context', '')
    
    if not user_message.strip():
        return jsonify({"error": "Empty message"}), 400

    # If no log context, instruct user to upload
    if not log_context.strip():
        return jsonify({"response": "Please upload and analyze a log file first to provide context for the chat."})
    
    # Check that the question is cybersecurity/log related
    allowed_keywords = [
        'cyber', 'security', 'vulnerability', 'log', 'attack', 
        'risk', 'threat', 'server', 'firewall', 'malware'
    ]
    if not any(keyword in user_message.lower() for keyword in allowed_keywords):
        return jsonify({"response": "Please only ask questions related to cybersecurity and the uploaded log file."})
    
    try:
        # Updated system prompt for chat: instruct model to use strict bullet points.
        system_prompt = (
            "You are a cybersecurity expert. "
            "Answer the user's question using ONLY bullet points. "
            "Each bullet point MUST be on its own new line and begin with '- ' (dash followed by a space). "
            "Do not include any extra text, introductions, or disclaimers. "
            "Your response should be concise and point-by-point, with each point on a separate line.\n\n"
            "LOG ANALYSIS CONTEXT:\n"
            f"{log_context}\n\n"
            "EXAMPLE RESPONSE FORMAT:\n"
            "- Point one\n"
            "- Point two\n"
            "- Point three\n\n"
            "Now answer the following question:"
        )

        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ])

        return jsonify({
            "response": response.content.strip(),
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        app.logger.error(f"Chat error: {str(e)}")
        return jsonify({
            "error": "Chat analysis failed",
            "details": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
