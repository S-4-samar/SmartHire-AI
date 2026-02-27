import json
import os
import csv
import io
from typing import List, Any, Dict
from datetime import datetime

from flask import Flask, jsonify, render_template, request, Response, redirect, url_for
import pdfplumber
from docx import Document

from nlp import extract_skills_and_experience, check_resume_quality
from scoring import compute_score
from ai_service import (
    generate_candidate_summary,
    generate_fit_explanation,
    generate_skill_gap_explanation,
    generate_resume_improvement_suggestions,
    generate_shortlist_email,
    generate_rejection_email,
    generate_interview_invite_email,
)


app = Flask(__name__, template_folder="templates", static_folder="static")


def _screen(job_description: str, resumes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Shared screening logic used by both JSON and upload endpoints."""
    jd_skills, jd_exp = extract_skills_and_experience(job_description)

    results: List[Dict[str, Any]] = []
    for res in resumes:
        res_id = str(res.get("id", ""))
        text = str(res.get("text", ""))

        cand_skills, cand_exp = extract_skills_and_experience(text)

        score, matched, missing, explanation, component_scores, match_label = compute_score(
            jd_text=job_description,
            resume_text=text,
            jd_skills=jd_skills,
            resume_skills=cand_skills,
            jd_exp=jd_exp,
            resume_exp=cand_exp,
        )

        # Resume quality check
        quality_score, quality_issues = check_resume_quality(text)
        
        # Skill gap analysis message
        gap_message = ""
        if missing:
            gap_message = f"Candidate needs: {', '.join(missing[:3])}"
            if len(missing) > 3:
                gap_message += f" (+{len(missing) - 3} more) to match role."

        # Generate AI summary (async, but we'll do it synchronously for now)
        # Extract candidate name and experience (already have cand_skills and cand_exp from above)
        # Use the already extracted values
        cand_skills_check = cand_skills
        cand_exp_check = cand_exp
        
        # Simple name extraction (first line usually)
        candidate_name_simple = text.split("\n")[0].strip()[:50] if text else "Candidate"
        candidate_name_simple = candidate_name_simple.replace("Name:", "").replace("NAME:", "").strip()
        
        # Extract job title from JD
        jd_lines = job_description.split("\n")[:3]
        job_title_simple = "the position"
        for line in jd_lines:
            if any(word in line.lower() for word in ["engineer", "developer", "manager", "analyst"]):
                job_title_simple = line.strip()[:100]
                break
        
        # Generate AI summary (dynamic AI response only - no static fallbacks)
        ai_summary = None
        try:
            ai_summary = generate_candidate_summary(
                candidate_name_simple, text, matched, cand_exp_check, job_title_simple
            )
        except Exception as e:
            # AI service unavailable - summary will be None
            # User can still use other features
            print(f"AI Summary generation failed: {e}")
            ai_summary = None

        anon_name = f"Candidate {res_id}"
        results.append(
            {
                "id": res_id,
                "score": round(score, 2),
                "matched_skills": matched,
                "missing_skills": missing,
                "explanation": explanation,
                "anonymized_name": anon_name,
                "component_scores": component_scores,
                "match_label": match_label,
                "resume_text": text,  # For preview panel
                "quality_score": round(quality_score, 1),
                "quality_issues": quality_issues,
                "gap_message": gap_message,
                "ai_summary": ai_summary,  # AI-generated summary
                "resume_exp": cand_exp_check,  # For AI features
            }
        )

    results.sort(key=lambda x: x["score"], reverse=True)
    return results


def _extract_text_from_file(storage) -> str:
    """Extract plain text from an uploaded file (PDF, DOCX, or TXT)."""
    filename = storage.filename or ""
    _, ext = os.path.splitext(filename.lower())

    if ext == ".pdf":
        try:
            with pdfplumber.open(storage.stream) as pdf:
                pages = [page.extract_text() or "" for page in pdf.pages]
            return "\n".join(pages)
        except Exception:
            return ""

    if ext in {".docx", ".doc"}:
        try:
            doc = Document(storage.stream)
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            return ""

    if ext == ".txt":
        try:
            return storage.read().decode("utf-8", errors="ignore")
        except Exception:
            return ""

    # Unsupported type
    return ""


@app.route("/")
def index() -> Any:
    """Redirect root to the welcome screen."""
    return redirect(url_for("welcome"))


@app.route("/welcome")
def welcome() -> Any:
    """Render the welcome / splash screen."""
    return render_template("welcome_v1.html")


@app.route("/app")
def main_app() -> Any:
    """Render the main SmartHire UI."""
    return render_template("index.html")


@app.route("/health")
def health() -> Any:
    return jsonify({"status": "ok"})


@app.route("/api/screen", methods=["POST"])
def screen_candidates() -> Any:
    """
    JSON body:
    {
      "job_description": "text...",
      "resumes": [
        { "id": "1", "text": "..." },
        { "id": "2", "text": "..." }
      ]
    }
    """
    data: Dict[str, Any] = request.get_json(force=True) or {}
    job_description: str = data.get("job_description", "")
    resumes: List[Dict[str, Any]] = data.get("resumes", [])

    results = _screen(job_description, resumes)
    return jsonify(results)


@app.route("/api/screen_upload", methods=["POST"])
def screen_candidates_with_upload() -> Any:
    """
    Multipart/form-data:
      payload: JSON string with { job_description, resumes: [{id,text}, ...] }  # pasted text
      files: one or more resume files (PDF / DOCX / TXT)
    """
    payload_str = request.form.get("payload", "{}")
    try:
        data: Dict[str, Any] = json.loads(payload_str)
    except json.JSONDecodeError:
        data = {}

    job_description: str = data.get("job_description", "")
    resumes: List[Dict[str, Any]] = data.get("resumes", [])

    # Start IDs after pasted resumes
    next_id = len(resumes) + 1

    for storage in request.files.getlist("files"):
        text = _extract_text_from_file(storage)
        if text.strip():
            resumes.append({"id": str(next_id), "text": text})
            next_id += 1

    results = _screen(job_description, resumes)
    return jsonify(results)


@app.route("/api/extract_text", methods=["POST"])
def extract_text_endpoint() -> Any:
    """
    Extract plain text from a single uploaded file (used for JD upload helper).
    Expects multipart/form-data with field "file".
    """
    storage = request.files.get("file")
    if storage is None:
        return jsonify({"text": ""}), 400

    text = _extract_text_from_file(storage)
    return jsonify({"text": text or ""})


@app.route("/api/export_csv", methods=["POST"])
def export_csv() -> Any:
    """Export screening results as CSV."""
    data: Dict[str, Any] = request.get_json(force=True) or {}
    results: List[Dict[str, Any]] = data.get("results", [])
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Rank", "Candidate ID", "Score", "Match Label", 
        "Matched Skills", "Missing Skills", "Quality Score"
    ])
    
    # Rows
    for idx, r in enumerate(results, 1):
        writer.writerow([
            idx,
            r.get("id", ""),
            r.get("score", 0),
            r.get("match_label", ""),
            ", ".join(r.get("matched_skills", [])),
            ", ".join(r.get("missing_skills", [])),
            r.get("quality_score", 0),
        ])
    
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=smarthire_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )


@app.route("/api/export_report", methods=["POST"])
def export_report() -> Any:
    """Generate a shortlist report as plain text."""
    data: Dict[str, Any] = request.get_json(force=True) or {}
    results: List[Dict[str, Any]] = data.get("results", [])
    job_description: str = data.get("job_description", "")
    
    report_lines = [
        "=" * 60,
        "SmartHire Screening Report",
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "=" * 60,
        "",
        f"Job Description Summary:",
        job_description[:200] + "..." if len(job_description) > 200 else job_description,
        "",
        f"Total Candidates Screened: {len(results)}",
        "",
        "=" * 60,
        "RANKED CANDIDATES",
        "=" * 60,
        "",
    ]
    
    for idx, r in enumerate(results, 1):
        report_lines.extend([
            f"Rank #{idx}: {r.get('anonymized_name', 'Unknown')}",
            f"  Score: {r.get('score', 0):.1f} ({r.get('match_label', 'N/A')})",
            f"  Matched Skills: {', '.join(r.get('matched_skills', [])) or 'None'}",
            f"  Missing Skills: {', '.join(r.get('missing_skills', [])) or 'None'}",
            f"  Resume Quality: {r.get('quality_score', 0):.1f}%",
            "",
        ])
    
    report_text = "\n".join(report_lines)
    return Response(
        report_text,
        mimetype="text/plain",
        headers={"Content-Disposition": f"attachment; filename=smarthire_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"}
    )


@app.route("/api/ai/summary", methods=["POST"])
def ai_candidate_summary() -> Any:
    """Generate AI candidate summary."""
    data: Dict[str, Any] = request.get_json(force=True) or {}
    candidate_name = data.get("candidate_name", "Candidate")
    resume_text = data.get("resume_text", "")
    matched_skills = data.get("matched_skills", [])
    experience_years = data.get("experience_years", 0)
    job_title = data.get("job_title", "the position")
    
    try:
        summary = generate_candidate_summary(
            candidate_name, resume_text, matched_skills, experience_years, job_title
        )
        return jsonify({"summary": summary})
    except Exception as e:
        error_msg = str(e)
        if "quota" in error_msg.lower() or "insufficient_quota" in error_msg.lower():
            user_message = "Your OpenAI account has exceeded its quota. Please add credits to your account or use a different API key."
        else:
            user_message = "AI service is currently unavailable. Please ensure your OpenAI/XAI API key is configured correctly."
        return jsonify({
            "error": user_message,
            "summary": None
        }), 503


@app.route("/api/ai/fit_explanation", methods=["POST"])
def ai_fit_explanation() -> Any:
    """Generate explanation of why candidate is a good fit (or not for weak matches)."""
    data: Dict[str, Any] = request.get_json(force=True) or {}
    candidate_name = data.get("candidate_name", "Candidate")
    matched_skills = data.get("matched_skills", [])
    score = data.get("score", 0)
    component_scores = data.get("component_scores", {})
    job_title = data.get("job_title", "the position")
    is_weak_match = data.get("is_weak_match", False)
    
    try:
        explanation = generate_fit_explanation(
            candidate_name, matched_skills, score, component_scores, job_title, is_weak_match
        )
        return jsonify({"explanation": explanation})
    except Exception as e:
        error_msg = str(e)
        if "quota" in error_msg.lower() or "insufficient_quota" in error_msg.lower():
            user_message = "Your OpenAI account has exceeded its quota. Please add credits to your account or use a different API key."
        else:
            user_message = "AI service is currently unavailable. Please ensure your OpenAI/XAI API key is configured correctly."
        return jsonify({
            "error": user_message,
            "explanation": None
        }), 503


@app.route("/api/ai/skill_gap", methods=["POST"])
def ai_skill_gap() -> Any:
    """Generate skill gap explanation."""
    data: Dict[str, Any] = request.get_json(force=True) or {}
    missing_skills = data.get("missing_skills", [])
    candidate_name = data.get("candidate_name", "This candidate")
    
    try:
        explanation = generate_skill_gap_explanation(missing_skills, candidate_name)
        return jsonify({"explanation": explanation})
    except Exception as e:
        error_msg = str(e)
        if "quota" in error_msg.lower() or "insufficient_quota" in error_msg.lower():
            user_message = "Your OpenAI account has exceeded its quota. Please add credits to your account or use a different API key."
        else:
            user_message = "AI service is currently unavailable. Please ensure your OpenAI/XAI API key is configured correctly."
        return jsonify({
            "error": user_message,
            "explanation": None
        }), 503


@app.route("/api/ai/resume_improvements", methods=["POST"])
def ai_resume_improvements() -> Any:
    """Generate resume improvement suggestions."""
    data: Dict[str, Any] = request.get_json(force=True) or {}
    resume_text = data.get("resume_text", "")
    job_description = data.get("job_description", "")
    missing_skills = data.get("missing_skills", [])
    
    try:
        suggestions = generate_resume_improvement_suggestions(
            resume_text, job_description, missing_skills
        )
        return jsonify({"suggestions": suggestions})
    except Exception as e:
        error_msg = str(e)
        if "quota" in error_msg.lower() or "insufficient_quota" in error_msg.lower():
            user_message = "Your OpenAI account has exceeded its quota. Please add credits to your account or use a different API key."
        else:
            user_message = "AI service is currently unavailable. Please ensure your OpenAI/XAI API key is configured correctly."
        return jsonify({
            "error": user_message,
            "suggestions": None
        }), 503


@app.route("/api/ai/shortlist_email", methods=["POST"])
def ai_shortlist_email() -> Any:
    """Generate shortlist email."""
    data: Dict[str, Any] = request.get_json(force=True) or {}
    candidate_name = data.get("candidate_name", "Candidate")
    job_title = data.get("job_title", "the position")
    matched_skills = data.get("matched_skills", [])
    
    try:
        email = generate_shortlist_email(candidate_name, job_title, matched_skills)
        return jsonify(email)
    except Exception as e:
        error_msg = str(e)
        if "quota" in error_msg.lower() or "insufficient_quota" in error_msg.lower():
            user_message = "Your OpenAI account has exceeded its quota. Please add credits to your account or use a different API key."
        else:
            user_message = "AI service is currently unavailable. Please ensure your OpenAI/XAI API key is configured correctly."
        clean_title = job_title if job_title and job_title != 'the position' else 'this role'
        return jsonify({
            "error": user_message,
            "subject": f"Interview Invitation – {clean_title}",
            "body": None
        }), 503


@app.route("/api/ai/rejection_email", methods=["POST"])
def ai_rejection_email() -> Any:
    """Generate rejection email."""
    data: Dict[str, Any] = request.get_json(force=True) or {}
    candidate_name = data.get("candidate_name", "Candidate")
    job_title = data.get("job_title", "the position")
    
    try:
        email = generate_rejection_email(candidate_name, job_title)
        return jsonify(email)
    except Exception as e:
        error_msg = str(e)
        if "quota" in error_msg.lower() or "insufficient_quota" in error_msg.lower():
            user_message = "Your OpenAI account has exceeded its quota. Please add credits to your account or use a different API key."
        else:
            user_message = "AI service is currently unavailable. Please ensure your OpenAI/XAI API key is configured correctly."
        clean_title = job_title if job_title and job_title != 'the position' else 'this role'
        return jsonify({
            "error": user_message,
            "subject": f"Application Update – {clean_title}",
            "body": None
        }), 503


@app.route("/api/ai/interview_invite", methods=["POST"])
def ai_interview_invite() -> Any:
    """Generate interview invite email."""
    data: Dict[str, Any] = request.get_json(force=True) or {}
    candidate_name = data.get("candidate_name", "Candidate")
    job_title = data.get("job_title", "the position")
    matched_skills = data.get("matched_skills", [])
    
    try:
        email = generate_interview_invite_email(candidate_name, job_title, matched_skills)
        return jsonify(email)
    except Exception as e:
        error_msg = str(e)
        if "quota" in error_msg.lower() or "insufficient_quota" in error_msg.lower():
            user_message = "Your OpenAI account has exceeded its quota. Please add credits to your account or use a different API key."
        else:
            user_message = "AI service is currently unavailable. Please ensure your OpenAI/XAI API key is configured correctly."
        clean_title = job_title if job_title and job_title != 'the position' else 'this role'
        return jsonify({
            "error": user_message,
            "subject": f"Interview Invitation – {clean_title}",
            "body": None
        }), 503


if __name__ == "__main__":
    # Debug server for local development
    app.run(host="0.0.0.0", port=5000, debug=True)
