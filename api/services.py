import re
import requests
from bs4 import BeautifulSoup
import tldextract
from datetime import datetime

# This service analyzes a given message text to detect scam patterns based on a set of predefined rules.
# Each rule is associated with a specific pattern (keyword or regex), a weight, and a descriptive name.
# The analysis calculates a total risk score by summing the weights of all matched patterns.
# Based on the score, it assigns a risk level (LOW, MEDIUM, HIGH) and provides a detailed explanation
# and advice to the user. This rule-based approach allows for easy updates and maintenance of the
# detection logic.

# Scoring rubric:
# - Each detected pattern adds a specific weight to the total risk score.
# - The weights are defined to reflect the severity and likelihood of a scam.
# - The final score is capped at 100.

# Risk levels:
# - 0-30: LOW
# - 31-60: MEDIUM
# - 61-100: HIGH

# Pattern definitions
SCAM_PATTERNS = [
    {
        "name": "Payment Request",
        "weight": 50,
        "keywords": ["payment", "fee", "charge", "cost", "send money", "Ksh", "KES"],
        "regex": None,
        "explanation": "Requests for payment are a major red flag. Legitimate employers do not ask for money.",
        "advice": "Never send money for a job application or offer."
    },
    {
        "name": "Urgency Manipulation",
        "weight": 25,
        "keywords": ["urgent", "immediately", "now", "limited time", "act fast"],
        "regex": None,
        "explanation": "Scammers create a sense of urgency to prevent you from thinking critically.",
        "advice": "Take your time to evaluate any job offer. High-pressure tactics are suspicious."
    },
    {
        "name": "Off-Platform Communication",
        "weight": 30,
        "keywords": ["whatsapp", "telegram"],
        "regex": r"(?i)\b(whatsapp|telegram)\b",
        "explanation": "Recruiters moving conversations to personal messaging apps may be trying to evade platform safety features.",
        "advice": "Keep communication on official platforms (e.g., LinkedIn, company email)."
    },
    {
        "name": "Free Email Recruiter",
        "weight": 20,
        "keywords": ["@gmail.com", "@yahoo.com", "@outlook.com"],
        "regex": r"[\w\.-]+@(gmail|yahoo|outlook)\.com",
        "explanation": "Legitimate recruiters usually use corporate email addresses. Free email accounts can be a sign of a scam.",
        "advice": "Verify the recruiter's email address and cross-reference it with the company's official domain."
    },
    {
        "name": "Unrealistic Job Promises",
        "weight": 35,
        "keywords": ["guaranteed income", "high salary", "no experience needed", "work from home"],
        "regex": None,
        "explanation": "Offers that sound too good to be true often are. Be wary of promises of high income for little work.",
        "advice": "Research typical salaries and requirements for the role you are applying for."
    }
]

WEBSITE_SCAM_PATTERNS = [
    {
        "name": "No HTTPS",
        "weight": 20,
        "explanation": "The website does not use HTTPS, which is a basic security measure. This can be a sign of a fraudulent website.",
        "advice": "Avoid entering personal information on unencrypted websites."
    },
    {
        "name": "Newly Registered Domain",
        "weight": 30,
        "explanation": "The website's domain was registered very recently. Scammers often use new domains for short-lived fraudulent websites.",
        "advice": "Be cautious with new websites, especially if they are asking for personal information or payment."
    },
    {
        "name": "Payment Instructions in Text",
        "weight": 40,
        "keywords": ["payment", "fee", "charge", "cost", "send money", "Ksh", "KES"],
        "explanation": "The website contains instructions for making a payment. Legitimate job sites do not ask for payment.",
        "advice": "Do not make any payments for job applications or training."
    },
    {
        "name": "No Contact Info",
        "weight": 25,
        "explanation": "The website does not provide clear contact information, such as an address or phone number.",
        "advice": "Legitimate companies provide multiple ways to contact them. Lack of contact info is a red flag."
    },
    {
        "name": "Unrealistic Promises",
        "weight": 35,
        "keywords": ["guaranteed income", "high salary", "no experience needed", "work from home"],
        "explanation": "The website makes unrealistic promises about salary or job requirements.",
        "advice": "If a job offer sounds too good to be true, it probably is."
    }
]


def analyze_message(message_text):
    """
    Analyzes the message_text for scam patterns and returns a risk analysis.
    """
    risk_score = 0
    detected_patterns = []
    explanations = []
    advices = []

    for pattern in SCAM_PATTERNS:
        found = False
        if pattern["regex"]:
            if re.search(pattern["regex"], message_text, re.IGNORECASE):
                found = True
        else:
            for keyword in pattern["keywords"]:
                if keyword.lower() in message_text.lower():
                    found = True
                    break
        
        if found:
            risk_score += pattern["weight"]
            detected_patterns.append(pattern["name"])
            explanations.append(pattern["explanation"])
            advices.append(pattern["advice"])

    # Cap the risk score at 100
    risk_score = min(risk_score, 100)

    if risk_score <= 30:
        risk_level = "LOW"
    elif risk_score <= 60:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    explanation = " ".join(explanations) if explanations else "No significant risk patterns were detected."
    advice = " ".join(advices) if advices else "Always remain cautious and verify employer details."

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "detected_patterns": detected_patterns,
        "explanation": explanation,
        "advice": advice
    }


def analyze_link(url):
    """
    Analyzes a website for scam patterns.
    """
    risk_score = 0
    detected_patterns = []
    explanations = []
    advices = []

    # 1. Check for HTTPS
    if not url.startswith("https://"):
        pattern = WEBSITE_SCAM_PATTERNS[0]
        risk_score += pattern["weight"]
        detected_patterns.append(pattern["name"])
        explanations.append(pattern["explanation"])
        advices.append(pattern["advice"])

    # 2. Fetch and parse website content
    try:
        content = _fetch_url_content(url)
        text = _extract_text_from_html(content)
    except (requests.exceptions.RequestException, ValueError) as e:
        raise e

    # 3. Analyze domain
    try:
        domain_info = tldextract.extract(url)
        # For the purpose of this example, we will mock the domain age check.
        # In a real application, you would use a WHOIS service to get the domain creation date.
        domain_age_days = _get_domain_age_in_days(domain_info.registered_domain)
        if domain_age_days < 90:  # 3 months
            pattern = WEBSITE_SCAM_PATTERNS[1]
            risk_score += pattern["weight"]
            detected_patterns.append(pattern["name"])
            explanations.append(pattern["explanation"])
            advices.append(pattern["advice"])
    except Exception:
        # For now, we will ignore domain analysis errors
        pass


    # 4. Analyze text content
    for pattern in WEBSITE_SCAM_PATTERNS[2:]:
        found = False
        if "keywords" in pattern:
            for keyword in pattern["keywords"]:
                if keyword.lower() in text.lower():
                    found = True
                    break
        if found:
            risk_score += pattern["weight"]
            detected_patterns.append(pattern["name"])
            explanations.append(pattern["explanation"])
            advices.append(pattern["advice"])

    # 5. Check for contact info (basic check)
    if not re.search(r"(\bcontact\b|\baddress\b|\bphone\b)", text, re.IGNORECASE):
        pattern = WEBSITE_SCAM_PATTERNS[3]
        risk_score += pattern["weight"]
        detected_patterns.append(pattern["name"])
        explanations.append(pattern["explanation"])
        advices.append(pattern["advice"])


    # Cap the risk score at 100
    risk_score = min(risk_score, 100)

    if risk_score <= 30:
        risk_level = "LOW"
    elif risk_score <= 60:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    explanation = " ".join(explanations) if explanations else "No significant risk patterns were detected."
    advice = " ".join(advices) if advices else "Always remain cautious and verify employer details."

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "detected_patterns": detected_patterns,
        "explanation": explanation,
        "advice": advice
    }





EMAIL_SCAM_PATTERNS = [


    {


        "name": "Free Email Domain",


        "weight": 40,


        "domains": ["gmail.com", "yahoo.com", "outlook.com", "aol.com"],


        "explanation": "The email was sent from a free email domain, which is uncommon for legitimate companies.",


        "advice": "Verify the sender's email address and cross-reference it with the company's official domain."


    },


    {


        "name": "Payment Request",


        "weight": 50,


        "keywords": ["payment", "fee", "charge", "cost", "send money", "Ksh", "KES"],


        "explanation": "The email requests payment, which is a major red flag for job scams.",


        "advice": "Never send money for a job application or offer."


    },


    {


        "name": "Urgency Manipulation",


        "weight": 25,


        "keywords": ["urgent", "immediately", "now", "limited time", "act fast"],


        "explanation": "The email creates a sense of urgency to pressure you into making a quick decision.",


        "advice": "Take your time to evaluate any job offer. High-pressure tactics are suspicious."


    },


    {


        "name": "Poor Grammar / Unusual Formatting",


        "weight": 15,


        "explanation": "The email contains grammatical errors or has unusual formatting, which can be a sign of a scam.",


        "advice": "Read emails carefully and be wary of unprofessional communication."


    }


]








def analyze_email(email_text, sender_email):


    """


    Analyzes an email for scam patterns.


    """


    risk_score = 0


    detected_patterns = []


    explanations = []


    advices = []





    # 1. Analyze sender's email domain


    domain_info = tldextract.extract(sender_email)


    domain = f"{domain_info.domain}.{domain_info.suffix}"


    for pattern in EMAIL_SCAM_PATTERNS:


        if "domains" in pattern:


            if domain in pattern["domains"]:


                risk_score += pattern["weight"]


                detected_patterns.append(pattern["name"])


                explanations.append(pattern["explanation"])


                advices.append(pattern["advice"])





    # 2. Analyze email content


    for pattern in EMAIL_SCAM_PATTERNS:


        if "keywords" in pattern:


            for keyword in pattern["keywords"]:


                if keyword.lower() in email_text.lower():


                    risk_score += pattern["weight"]


                    detected_patterns.append(pattern["name"])


                    explanations.append(pattern["explanation"])


                    advices.append(pattern["advice"])


                    break 





    # 3. Basic grammar check (example)


    # In a real application, a more sophisticated library could be used.


    # For now, we'll just check for a few common mistakes.


    common_mistakes = ["kindley", "ur", "pls"]


    for mistake in common_mistakes:


        if mistake in email_text.lower():


            pattern = EMAIL_SCAM_PATTERNS[3]


            risk_score += pattern["weight"]


            detected_patterns.append(pattern["name"])


            explanations.append(pattern["explanation"])


            advices.append(pattern["advice"])


            break


            





    # Cap the risk score at 100


    risk_score = min(risk_score, 100)





    if risk_score <= 30:


        risk_level = "LOW"


    elif risk_score <= 60:


        risk_level = "MEDIUM"


    else:


        risk_level = "HIGH"





    explanation = " ".join(explanations) if explanations else "No significant risk patterns were detected."


    advice = " ".join(advices) if advices else "Always remain cautious and verify employer details."





    return {


        "risk_level": risk_level,


        "risk_score": risk_score,


        "detected_patterns": list(set(detected_patterns)),


        "explanation": explanation,


        "advice": advice


    }








def _fetch_url_content(url):


    """


    Safely fetches the content of a URL.


    """


    try:


        response = requests.get(url, timeout=5)


        response.raise_for_status()  # Raise an exception for bad status codes


        return response.content


    except requests.exceptions.RequestException as e:


        raise ValueError(f"Could not fetch URL: {e}")





def _extract_text_from_html(html_content):


    """


    Extracts visible text from HTML content.


    """


    soup = BeautifulSoup(html_content, "html.parser")


    # Remove script and style elements


    for script in soup(["script", "style"]):


        script.decompose()


    return soup.get_text(separator=" ", strip=True)





def _get_domain_age_in_days(domain):


    """


    Mock function to get the age of a domain in days.


    In a real application, this would use a WHOIS service.


    """


    # For demonstration purposes, we'll return a fixed value.


    # To simulate a new domain, you could return a value less than 90.


    return 365




