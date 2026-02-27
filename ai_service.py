"""
AI Service for SmartHire - Generates AI-powered insights using OpenAI/XAI
"""
import os
from typing import Dict, Any, Optional
import requests

# Try to use OpenAI API (works with XAI API as well with minor modifications)
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# You can set your API key via environment variable: export OPENAI_API_KEY="your-key"
# For XAI, use: export XAI_API_KEY="your-key" and set base_url
# Or set it directly here (not recommended for production, but okay for hackathon)
API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("XAI_API_KEY") or "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"
BASE_URL = os.getenv("XAI_BASE_URL", "https://api.openai.com/v1")  # For XAI: "https://api.x.ai/v1" 


def _call_ai_api(prompt: str, system_prompt: str = None, retries: int = 2) -> Optional[str]:
    """
    Call OpenAI/XAI API to generate text with retry logic.
    Returns None if API is not available (no static fallbacks for hackathon).
    """
    if not API_KEY:
        print("ERROR: API_KEY is not set!")
        return None
    
    if not OPENAI_AVAILABLE:
        print("ERROR: OpenAI library is not installed!")
        return None
    
    import random
    import time
    
    # Add slight variation to prompts for more dynamic responses
    variation_phrases = [
        "Please provide",
        "Generate",
        "Create",
        "Write",
        "Draft",
        "Compose"
    ]
    
    # Vary the prompt slightly to ensure different responses
    if random.random() > 0.5:
        prompt = f"{random.choice(variation_phrases)} {prompt.lower()}"
    
    # Determine if using XAI or OpenAI
    is_xai = "x.ai" in BASE_URL.lower() or BASE_URL != "https://api.openai.com/v1"
    model = "gpt-4o-mini"
    
    for attempt in range(retries + 1):
        try:
            print(f"Attempting AI API call (attempt {attempt + 1}/{retries + 1})...")
            print(f"API Key present: {bool(API_KEY)}, starts with: {API_KEY[:10] if API_KEY else 'None'}...")
            print(f"Base URL: {BASE_URL}, Is XAI: {is_xai}")
            
            client = openai.OpenAI(
                api_key=API_KEY,
                base_url=BASE_URL if is_xai else None
            )
            
            messages = []
            if system_prompt:
                # Add variation to system prompt
                system_variations = [
                    system_prompt,
                    f"{system_prompt} Be creative and unique in your responses.",
                    f"{system_prompt} Ensure each response is tailored and specific."
                ]
                messages.append({"role": "system", "content": random.choice(system_variations)})
            messages.append({"role": "user", "content": prompt})
            
            # Vary temperature slightly for more dynamic responses (0.75-0.9)
            temperature = random.uniform(0.75, 0.9)
            
            print(f"Calling API with model: {model}, temperature: {temperature:.2f}")
            
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=600,  # Increased for more detailed responses
                temperature=temperature,  # Higher temperature for more variation
                top_p=0.95,  # Nucleus sampling for more diversity
                frequency_penalty=0.3,  # Reduce repetition
                presence_penalty=0.3  # Encourage new topics
            )
            
            result = response.choices[0].message.content.strip()
            
            # Ensure response is substantial and not empty
            if result and len(result) > 20:
                print(f"AI API Success: Generated {len(result)} characters")
                return result
            else:
                print(f"AI API Warning: Response too short ({len(result) if result else 0} chars)")
            
        except openai.AuthenticationError as e:
            print(f"AI API Authentication Error: {e}")
            print(f"Please check your API key. Key starts with: {API_KEY[:10] if API_KEY else 'None'}...")
            return None
        except openai.RateLimitError as e:
            error_msg = str(e)
            if "quota" in error_msg.lower() or "insufficient_quota" in error_msg.lower():
                print(f"AI API Quota Error: Your OpenAI account has exceeded its quota/credits.")
                print(f"Please add credits to your OpenAI account or use a different API key.")
                print(f"For hackathon: Consider using XAI API or adding credits to OpenAI.")
            else:
                print(f"AI API Rate Limit Error: {e}")
                print(f"Too many requests. Please wait a moment and try again.")
            # Don't retry on quota errors - they won't resolve quickly
            return None
        except openai.APIError as e:
            print(f"AI API Error (attempt {attempt + 1}/{retries + 1}): {type(e).__name__}: {e}")
            if attempt < retries:
                print(f"Retrying in 1 second...")
                time.sleep(1)  # Wait before retry
            else:
                print(f"All retry attempts failed.")
                return None
        except Exception as e:
            print(f"AI API Unexpected Error (attempt {attempt + 1}/{retries + 1}): {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            if attempt < retries:
                print(f"Retrying in 1 second...")
                time.sleep(1)  # Wait before retry
            else:
                print(f"All retry attempts failed.")
                return None
    
    return None


def generate_candidate_summary(candidate_name: str, resume_text: str, matched_skills: list, 
                               experience_years: int, job_title: str = "the position") -> str:
    """
    Generate a concise AI summary of the candidate.
    """
    prompt = f"""Generate a professional 2-3 sentence summary for a candidate named {candidate_name}.

Resume highlights:
- Experience: {experience_years} years
- Key skills: {', '.join(matched_skills[:5]) if matched_skills else 'Various technical skills'}
- Role applied for: {job_title}

Write a concise summary highlighting their experience and why they might be a good fit. Start with the candidate's name."""
    
    system_prompt = "You are a professional HR assistant. Write concise, professional candidate summaries."
    
    result = _call_ai_api(prompt, system_prompt)
    
    if result:
        return result
    
    # Fallback templates with variations (randomly selected)
    import random
    skills_str = ', '.join(matched_skills[:3]) if matched_skills else "technical skills"
    
    variations = [
        f"{candidate_name} has {experience_years} years of experience with strong skills in {skills_str}. They are a strong match for the {job_title} role.",
        f"With {experience_years} years of professional experience, {candidate_name} demonstrates expertise in {skills_str}, making them an excellent candidate for the {job_title if job_title and job_title != 'the position' else 'this role'}.",
        f"{candidate_name} brings {experience_years} years of experience and proficiency in {skills_str} to the table, positioning them as a strong fit for the {job_title if job_title and job_title != 'the position' else 'this role'}.",
        f"Boasting {experience_years} years of experience, {candidate_name} showcases solid capabilities in {skills_str}, which aligns well with the requirements for {job_title if job_title and job_title != 'the position' else 'this role'}.",
        f"{candidate_name} possesses {experience_years} years of relevant experience and key skills in {skills_str}, indicating a promising match for the {job_title if job_title and job_title != 'the position' else 'this role'}."
    ]
    
    return random.choice(variations)


def generate_fit_explanation(candidate_name: str, matched_skills: list, score: float, 
                            component_scores: Dict[str, float], job_title: str = "the position",
                            is_weak_match: bool = False) -> str:
    """
    Explain why this candidate is a good fit (or not a good fit for weak matches).
    """
    if is_weak_match:
        prompt = f"""Explain why {candidate_name} is NOT a good fit for the {job_title if job_title and job_title != 'the position' else 'this role'}.

Match details:
- Overall score: {score:.1f}/100 (low score indicates poor match)
- Skills match: {component_scores.get('skills', 0):.1f}%
- Semantic match: {component_scores.get('semantic', 0):.1f}%
- Experience match: {component_scores.get('experience', 0):.1f}%
- Matched skills: {', '.join(matched_skills) if matched_skills else 'Limited skills'}

Write 2-3 sentences explaining why they are not a good fit. Be professional and constructive."""
        
        system_prompt = "You are a professional recruiter. Explain why a candidate is not a good fit in a respectful, constructive manner."
    else:
        prompt = f"""Explain why {candidate_name} is a good fit for the {job_title if job_title and job_title != 'the position' else 'this role'}.

Match details:
- Overall score: {score:.1f}/100
- Skills match: {component_scores.get('skills', 0):.1f}%
- Semantic match: {component_scores.get('semantic', 0):.1f}%
- Experience match: {component_scores.get('experience', 0):.1f}%
- Matched skills: {', '.join(matched_skills) if matched_skills else 'Various skills'}

Write 2-3 sentences explaining why they are a strong candidate."""
        
        system_prompt = "You are a professional recruiter. Explain candidate fit in a positive, professional manner."
    
    result = _call_ai_api(prompt, system_prompt)
    
    if result:
        return result
    
    # Fallback with variations
    import random
    
    if is_weak_match:
        variations = [
            f"{candidate_name} does not meet the key requirements for this position. The low match score ({score:.1f}/100) indicates significant gaps in skills, experience, or alignment with the role expectations.",
            f"While {candidate_name} has some relevant background, the match score of {score:.1f}/100 suggests notable deficiencies in required skills, experience level, or overall fit for this role.",
            f"The evaluation shows {candidate_name} falls short of the position's core requirements. With a score of {score:.1f}/100, there are substantial gaps in their skill set and experience alignment.",
            f"{candidate_name}'s profile shows limited alignment with this role. The {score:.1f}/100 match score reflects significant gaps in essential qualifications and experience.",
            f"Based on the assessment, {candidate_name} lacks several critical requirements. The {score:.1f}/100 score indicates notable deficiencies in skills, experience, or role compatibility."
        ]
    else:
        skills_mention = ', '.join(matched_skills[:2]) if matched_skills else 'key areas'
        variations = [
            f"{candidate_name} demonstrates strong alignment with the role requirements, particularly in {skills_mention}. Their experience and skills make them an excellent fit for this position.",
            f"{candidate_name} shows exceptional compatibility with this role, especially in {skills_mention}. Their background and expertise position them as an ideal candidate.",
            f"With strong capabilities in {skills_mention}, {candidate_name} exhibits excellent alignment with the position's needs. Their experience makes them a standout candidate.",
            f"{candidate_name} presents a compelling match for this role, with notable strengths in {skills_mention}. Their professional background aligns well with the requirements.",
            f"The evaluation reveals {candidate_name} as a strong candidate, particularly excelling in {skills_mention}. Their experience and skills demonstrate excellent fit for this position."
        ]
    
    return random.choice(variations)


def generate_skill_gap_explanation(missing_skills: list, candidate_name: str = "This candidate") -> str:
    """
    Generate explanation for skill gaps.
    """
    if not missing_skills:
        return "This candidate meets all required skills for the position."
    
    prompt = f"""Explain why {candidate_name} is missing these required skills: {', '.join(missing_skills)}.

Write 2-3 sentences explaining the skill gap and how improving these skills would increase suitability. Be professional and constructive."""
    
    system_prompt = "You are a professional HR assistant. Provide constructive feedback about skill gaps."
    
    result = _call_ai_api(prompt, system_prompt)
    
    if result:
        return result
    
    # Fallback with variations
    import random
    skills_str = ', '.join(missing_skills)
    
    variations = [
        f"{candidate_name} lacks experience in {skills_str}, which are core requirements for this role. Improving these skills would significantly increase their suitability for similar positions.",
        f"The primary gap for {candidate_name} is the absence of {skills_str} in their skill set. Developing proficiency in these areas would enhance their competitiveness for roles like this one.",
        f"{candidate_name} would benefit from gaining experience in {skills_str}, as these are essential qualifications for this position. Acquiring these skills would improve their fit significantly.",
        f"A key development area for {candidate_name} is {skills_str}, which are fundamental requirements. Building expertise in these domains would substantially boost their candidacy.",
        f"{candidate_name} needs to develop capabilities in {skills_str} to better align with role expectations. Strengthening these skills would make them a more competitive candidate."
    ]
    
    return random.choice(variations)


def generate_resume_improvement_suggestions(resume_text: str, job_description: str, 
                                           missing_skills: list) -> str:
    """
    Generate suggestions for improving the resume for this specific job.
    """
    prompt = f"""A candidate's resume is being evaluated for a job. Provide 3-4 specific, actionable suggestions to improve the resume.

Job requirements (key points):
{job_description[:500]}

Missing skills in resume: {', '.join(missing_skills) if missing_skills else 'None identified'}

Provide specific, actionable suggestions. Format as a bulleted list."""
    
    system_prompt = "You are a professional career advisor. Provide constructive, specific resume improvement suggestions."
    
    result = _call_ai_api(prompt, system_prompt)
    
    if result:
        return result
    
    # Fallback with variations
    import random
    
    if missing_skills:
        skill_mention = ', '.join(missing_skills[:2])
        suggestion_sets = [
            [
                f"Emphasize any experience with {skill_mention} if you have it",
                "Include specific metrics and quantifiable results in your achievements",
                "Add projects that showcase your technical capabilities",
                "Make sure your skills section comprehensively covers all relevant technologies"
            ],
            [
                f"Showcase any background in {skill_mention} where possible",
                "Incorporate measurable outcomes and data-driven accomplishments",
                "Feature relevant projects that highlight your expertise",
                "Ensure your technical skills are clearly and thoroughly listed"
            ],
            [
                f"Draw attention to {skill_mention} experience if available",
                "Add concrete numbers and measurable impact to your achievements",
                "Include portfolio projects that demonstrate your skills",
                "Verify that your skills section accurately reflects all relevant technologies"
            ],
            [
                f"Highlight {skill_mention} proficiency if applicable",
                "Quantify your achievements with specific metrics and results",
                "Showcase projects that illustrate your technical abilities",
                "Review and expand your skills section to include all pertinent technologies"
            ],
            [
                f"Feature any {skill_mention} experience prominently",
                "Use numbers and metrics to demonstrate your impact",
                "Add project examples that prove your capabilities",
                "Ensure comprehensive coverage of relevant skills in your skills section"
            ]
        ]
    else:
        suggestion_sets = [
            [
                "Add quantifiable achievements and metrics",
                "Include relevant projects that demonstrate key skills",
                "Ensure skills section clearly lists all relevant technologies",
                "Expand on your professional experience with specific examples"
            ],
            [
                "Incorporate measurable outcomes and data-driven accomplishments",
                "Feature relevant projects that highlight your expertise",
                "Make sure your technical skills are clearly and thoroughly listed",
                "Provide concrete examples of your professional contributions"
            ],
            [
                "Add concrete numbers and measurable impact to your achievements",
                "Include portfolio projects that demonstrate your skills",
                "Verify that your skills section accurately reflects all relevant technologies",
                "Detail specific accomplishments from your work history"
            ],
            [
                "Quantify your achievements with specific metrics and results",
                "Showcase projects that illustrate your technical abilities",
                "Review and expand your skills section to include all pertinent technologies",
                "Highlight specific results and outcomes from your experience"
            ],
            [
                "Use numbers and metrics to demonstrate your impact",
                "Add project examples that prove your capabilities",
                "Ensure comprehensive coverage of relevant skills in your skills section",
                "Include detailed examples of your professional achievements"
            ]
        ]
    
    selected_set = random.choice(suggestion_sets)
    return "\n".join(f"• {s}" for s in selected_set)


def generate_shortlist_email(candidate_name: str, job_title: str, matched_skills: list) -> Dict[str, str]:
    """
    Generate a professional shortlist email.
    """
    prompt = f"""Generate a professional shortlist email for a candidate.

Candidate name: {candidate_name}
Job title: {job_title}
Their matched skills: {', '.join(matched_skills[:3]) if matched_skills else 'relevant skills'}

Write a professional, warm email inviting them for an interview. Include:
- Congratulatory tone
- Mention their strong fit
- Invitation to schedule interview
- Professional closing

Format as JSON with 'subject' and 'body' fields."""
    
    system_prompt = "You are a professional HR assistant. Write warm, professional recruitment emails."
    
    result = _call_ai_api(prompt, system_prompt)
    
    # Try to parse JSON from AI response
    if result:
        try:
            import json
            # Extract JSON from response
            json_start = result.find("{")
            json_end = result.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                parsed = json.loads(result[json_start:json_end])
                clean_title = job_title if job_title and job_title != 'the position' else 'this role'
                subject = parsed.get("subject", f"Interview Invitation – {clean_title}")
                body = parsed.get("body", result)
                return {"subject": subject, "body": body}
            else:
                # If not JSON, use entire response as body
                return {
                    "subject": f"Interview Invitation – {job_title if job_title and job_title != 'the position' else 'this role'}",
                    "body": result
                }
        except:
            # If parsing fails, use entire response as body
            return {
                    "subject": f"Interview Invitation – {job_title if job_title and job_title != 'the position' else 'this role'}",
                "body": result
            }
    
    # Fallback templates with variations
    import random
    skills_mention = ', '.join(matched_skills[:2]) if matched_skills else 'key areas'
    
    email_variations = [
        {
            "subject": f"Interview Invitation – {job_title if job_title and job_title != 'the position' else 'this role'}",
            "body": f"""Dear {candidate_name},

Congratulations! You have been shortlisted for the {job_title if job_title and job_title != 'the position' else 'this role'} based on your skills and experience.

Your profile shows strong alignment with our requirements, particularly in {skills_mention}.

We would like to schedule an interview to discuss this opportunity further. Please reply to this email with your availability, and we will coordinate a convenient time.

We look forward to speaking with you.

Best regards,
HR Team
SmartHire"""
        },
        {
            "subject": f"Next Steps: {job_title if job_title and job_title != 'the position' else 'this role'}",
            "body": f"""Dear {candidate_name},

We are pleased to inform you that you have been selected for the next stage of our hiring process for the {job_title if job_title and job_title != 'the position' else 'this role'}.

Your background, especially your expertise in {skills_mention}, aligns well with what we're looking for.

We'd love to schedule a conversation to learn more about you and discuss this opportunity. Please let us know your preferred times, and we'll arrange a suitable slot.

Looking forward to connecting with you.

Best regards,
HR Team
SmartHire"""
        },
        {
            "subject": f"Interview Opportunity – {job_title}",
            "body": f"""Dear {candidate_name},

Thank you for your interest in the {job_title if job_title and job_title != 'the position' else 'this role'}. We're excited to move forward with your application.

Your qualifications, particularly in {skills_mention}, caught our attention and match our needs well.

We would like to invite you for an interview to explore this opportunity together. Kindly share your availability, and we'll set up a time that works for both of us.

We're eager to learn more about you.

Warm regards,
HR Team
SmartHire"""
        },
        {
            "subject": f"Moving Forward: {job_title} Role",
            "body": f"""Dear {candidate_name},

We're delighted to inform you that your application for the {job_title if job_title and job_title != 'the position' else 'this role'} has progressed to the interview stage.

Your experience and skills in {skills_mention} demonstrate strong potential for this role.

We'd appreciate the opportunity to speak with you further. Please respond with your availability, and we'll coordinate an interview time.

Thank you for your interest, and we hope to speak soon.

Best regards,
HR Team
SmartHire"""
        }
    ]
    
    return random.choice(email_variations)


def generate_rejection_email(candidate_name: str, job_title: str) -> Dict[str, str]:
    """
    Generate a polite, professional rejection email.
    """
    prompt = f"""Generate a professional, polite rejection email for a candidate.

Candidate name: {candidate_name}
Job title: {job_title}

Write a respectful, encouraging email. Be professional and maintain a positive tone. Do not be overly detailed about why they were rejected."""
    
    system_prompt = "You are a professional HR assistant. Write respectful, encouraging rejection emails."
    
    result = _call_ai_api(prompt, system_prompt)
    
    if result and len(result) > 50:
        # Try to extract subject if structured
        lines = result.split("\n")
        subject_line = next((l for l in lines if "subject" in l.lower() and ":" in l), None)
        if subject_line:
            subject = subject_line.split(":", 1)[1].strip()
        else:
            subject = f"Application Update – {job_title if job_title and job_title != 'the position' else 'this role'}"
        
        # Use AI-generated result as body
        body = result if len(result) > 100 else result
        return {"subject": subject, "body": body}
    
    # Fallback templates with variations
    import random
    
    rejection_variations = [
        {
            "subject": f"Application Update – {job_title if job_title and job_title != 'the position' else 'this role'}",
            "body": f"""Dear {candidate_name},

Thank you for your interest in the {job_title if job_title and job_title != 'the position' else 'this role'} and for taking the time to apply.

After careful consideration, we have decided to move forward with other candidates whose profiles more closely match our current requirements.

We appreciate your interest in our company and encourage you to apply for future positions that may be a better fit for your background.

We wish you the best in your job search.

Best regards,
HR Team
SmartHire"""
        },
        {
            "subject": f"Update on Your Application – {job_title if job_title and job_title != 'the position' else 'this role'}",
            "body": f"""Dear {candidate_name},

Thank you for applying for the {job_title if job_title and job_title != 'the position' else 'this role'}. We appreciate the time and effort you invested in your application.

While we were impressed with your qualifications, we have chosen to proceed with candidates whose experience more closely aligns with our current needs.

We value your interest in our organization and hope you'll consider applying for other opportunities that match your skills and experience.

Best of luck in your career journey.

Sincerely,
HR Team
SmartHire"""
        },
        {
            "subject": f"Application Status – {job_title if job_title and job_title != 'the position' else 'this role'}",
            "body": f"""Dear {candidate_name},

We wanted to reach out regarding your application for the {job_title if job_title and job_title != 'the position' else 'this role'}. Thank you for your interest and for sharing your background with us.

After reviewing all applications, we have selected candidates whose profiles better match the specific requirements of this position at this time.

We encourage you to keep an eye on our future openings, as there may be roles that are a better fit for your experience.

Thank you again for considering us, and we wish you success in your job search.

Best regards,
HR Team
SmartHire"""
        },
        {
            "subject": f"Thank You for Your Application – {job_title if job_title and job_title != 'the position' else 'this role'}",
            "body": f"""Dear {candidate_name},

Thank you for taking the time to apply for the {job_title if job_title and job_title != 'the position' else 'this role'}. We appreciate your interest in joining our team.

After thorough consideration of all candidates, we have decided to move forward with applicants whose qualifications more closely align with our current needs.

We encourage you to continue exploring opportunities with us, as we frequently post new positions that may be a great match for your background.

We appreciate your understanding and wish you all the best.

Warm regards,
HR Team
SmartHire"""
        }
    ]
    
    return random.choice(rejection_variations)


def generate_interview_invite_email(candidate_name: str, job_title: str, matched_skills: list) -> Dict[str, str]:
    """
    Generate a professional interview invite email (different from shortlist email).
    """
    prompt = f"""Generate a professional interview invitation email for a candidate.

Candidate name: {candidate_name}
Job title: {job_title}
Their matched skills: {', '.join(matched_skills[:3]) if matched_skills else 'relevant skills'}

Write a professional email specifically inviting them for an interview. Focus on:
- Direct invitation to interview
- Mention their qualifications briefly
- Request availability for scheduling
- Professional and warm tone

Format as JSON with 'subject' and 'body' fields."""
    
    system_prompt = "You are a professional HR assistant. Write clear, professional interview invitation emails."
    
    result = _call_ai_api(prompt, system_prompt)
    
    # Try to parse JSON from AI response
    if result:
        try:
            import json
            # Extract JSON from response
            json_start = result.find("{")
            json_end = result.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                parsed = json.loads(result[json_start:json_end])
                clean_title = job_title if job_title and job_title != 'the position' else 'this role'
                subject = parsed.get("subject", f"Interview Invitation – {clean_title}")
                body = parsed.get("body", result)
                return {"subject": subject, "body": body}
            else:
                # If not JSON, use entire response as body
                return {
                    "subject": f"Interview Invitation – {job_title if job_title and job_title != 'the position' else 'this role'}",
                    "body": result
                }
        except:
            # If parsing fails, use entire response as body
            clean_title = job_title if job_title and job_title != 'the position' else 'this role'
            return {
                "subject": f"Interview Invitation – {clean_title}",
                "body": result
            }
    
    # Fallback templates with variations
    import random
    skills_mention = ', '.join(matched_skills[:2]) if matched_skills else 'key areas'
    
    interview_variations = [
        {
            "subject": f"Interview Invitation – {job_title if job_title and job_title != 'the position' else 'this role'}",
            "body": f"""Dear {candidate_name},

We are pleased to invite you for an interview for the {job_title if job_title and job_title != 'the position' else 'this role'}.

Based on your qualifications, particularly your experience in {skills_mention}, we believe you would be a great addition to our team.

Please let us know your availability over the next week, and we will schedule a time that works for you. The interview will be approximately 45-60 minutes.

We look forward to meeting you and learning more about your background.

Best regards,
HR Team
SmartHire"""
        },
        {
            "subject": f"Interview Request: {job_title if job_title and job_title != 'the position' else 'this role'}",
            "body": f"""Dear {candidate_name},

Thank you for your interest in the {job_title if job_title and job_title != 'the position' else 'this role'}. We would like to invite you for an interview.

Your background in {skills_mention} aligns well with our requirements, and we'd like to discuss this opportunity with you further.

Could you please share your availability for the coming week? We'll coordinate a convenient time for the interview, which typically lasts about an hour.

We're excited to speak with you.

Warm regards,
HR Team
SmartHire"""
        },
        {
            "subject": f"Next Step: Interview for {job_title if job_title and job_title != 'the position' else 'this role'}",
            "body": f"""Dear {candidate_name},

We would like to invite you to interview for the {job_title if job_title and job_title != 'the position' else 'this role'}.

Your qualifications, especially your expertise in {skills_mention}, have impressed us, and we'd like to learn more about you.

Please provide your availability for the next few days, and we'll arrange an interview time that suits your schedule. The interview will take approximately 45-60 minutes.

Looking forward to our conversation.

Best regards,
HR Team
SmartHire"""
        },
        {
            "subject": f"Interview Opportunity – {job_title if job_title and job_title != 'the position' else 'this role'}",
            "body": f"""Dear {candidate_name},

We are excited to invite you for an interview for the {job_title if job_title and job_title != 'the position' else 'this role'}.

Your experience in {skills_mention} makes you a strong candidate, and we'd love to discuss how you can contribute to our team.

Kindly share your preferred times for the upcoming week, and we'll schedule the interview accordingly. Please allow 45-60 minutes for the session.

We're looking forward to meeting you.

Sincerely,
HR Team
SmartHire"""
        }
    ]
    
    return random.choice(interview_variations)

