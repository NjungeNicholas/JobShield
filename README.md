# JobShield API

JobShield is a Django REST API designed to protect students and fresh graduates from online job scams. It analyzes job-related messages and job posts to detect scam patterns, explain the risks, and provide safety advice.

## Tech Stack

- Python
- Django
- Django REST Framework
- SQLite (for development)

## Getting Started

### Prerequisites

- Python 3.8+
- Pip

### Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd JobShield
   ```

2. **Create and activate a virtual environment:**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
   ```

3. **Install the dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Run the database migrations:**

   ```bash
   python manage.py migrate
   ```

5. **Start the development server:**

   ```bash
   python manage.py runserver
   ```

The API will be available at `http://127.0.0.1:8000/`.

## API Endpoints

### `POST /api/analyze-message`

This endpoint analyzes a given message text for potential scam patterns.

#### Request Body

```json
{
  "message_text": "string"
}
```

- `message_text` (string, required): The text of the message to be analyzed.

#### Example Request

```bash
curl -X POST -H "Content-Type: application/json" -d '{"message_text": "Congratulations! You have been selected for a work-from-home job with a guaranteed income of $5000 per month. No experience needed. Please contact us on WhatsApp to proceed."}' http://127.0.0.1:8000/api/analyze-message
```

#### Response Body

```json
{
  "risk_level": "string",
  "risk_score": "integer",
  "detected_patterns": ["string"],
  "explanation": "string",
  "advice": "string"
}
```

- `risk_level`: The calculated risk level (LOW, MEDIUM, or HIGH).
- `risk_score`: A numerical score from 0 to 100.
- `detected_patterns`: A list of scam patterns found in the message.
- `explanation`: An explanation of why the message is considered risky.
- `advice`: Recommendations on how to proceed safely.

#### Example Response

```json
{
    "risk_level": "HIGH",
    "risk_score": 90,
    "detected_patterns": [
        "Urgency Manipulation",
        "Off-Platform Communication",
        "Unrealistic Job Promises"
    ],
    "explanation": "This message pressures you to act quickly, moves the conversation to a personal messaging app, and makes unrealistic promises. Legitimate jobs do not operate this way.",
    "advice": "Do not engage further. Verify the company and job opening through official channels."
}
```

### `POST /api/analyze-link`

This endpoint analyzes a given website link for potential scam patterns.

#### Request Body

```json
{
  "url": "string"
}
```

- `url` (string, required): The URL of the website to be analyzed.

#### Example Request

```bash
curl -X POST -H "Content-Type: application/json" -d '{"url": "http://example-job-site.com"}' http://127.0.0.1:8000/api/analyze-link
```

#### Response Body

```json
{
  "risk_level": "string",
  "risk_score": "integer",
  "detected_patterns": ["string"],
  "explanation": "string",
  "advice": "string"
}
```

- `risk_level`: The calculated risk level (LOW, MEDIUM, or HIGH).
- `risk_score`: A numerical score from 0 to 100.
- `detected_patterns`: A list of scam patterns found on the website.
- `explanation`: An explanation of why the website is considered risky.
- `advice`: Recommendations on how to proceed safely.

#### Example Response

```json
{
    "risk_level": "MEDIUM",
    "risk_score": 55,
    "detected_patterns": [
        "New Domain",
        "Payment Request",
        "No Contact Info"
    ],
    "explanation": "This job website was recently registered, asks for application fees, and does not provide official contact information. These are common scam indicators.",
    "advice": "Avoid sending money or applying through unofficial websites. Verify employer information independently."
}
```

## Detection Logic

The scam detection engine is rule-based and analyzes messages for the following patterns:

- **Payment Requests**: Detects requests for fees, payments, or money transfers.
- **Urgency Manipulation**: Identifies high-pressure language urging immediate action.
- **Off-Platform Communication**: Flags requests to move to WhatsApp, Telegram, or other personal messaging apps.
- **Free Email Recruiters**: Checks for recruiters using free email services (e.g., Gmail, Yahoo).
- **Unrealistic Job Promises**: Looks for claims of guaranteed high income with little to no experience required.

Each detected pattern contributes a weighted score to the overall risk assessment. The final score determines the risk level and the corresponding advice.

### `POST /api/analyze-email`

This endpoint analyzes a given email for potential scam patterns.

#### Request Body

```json
{
  "email_text": "string",
  "sender_email": "string"
}
```

- `email_text` (string, required): The text of the email to be analyzed.
- `sender_email` (string, required): The email address of the sender.

#### Example Request

```bash
curl -X POST -H "Content-Type: application/json" -d '{"email_text": "Dear candidate, please pay KES 1500 to secure your spot...", "sender_email": "hr.company@gmail.com"}' http://127.0.0.1:8000/api/analyze-email
```

#### Response Body

```json
{
  "risk_level": "string",
  "risk_score": "integer",
  "detected_patterns": ["string"],
  "explanation": "string",
  "advice": "string"
}
```

- `risk_level`: The calculated risk level (LOW, MEDIUM, or HIGH).
- `risk_score`: A numerical score from 0 to 100.
- `detected_patterns`: A list of scam patterns found in the email.
- `explanation`: An explanation of why the email is considered risky.
- `advice`: Recommendations on how to proceed safely.

#### Example Response

```json
{
    "risk_level": "HIGH",
    "risk_score": 80,
    "detected_patterns": [
        "Free Email Domain",
        "Payment Request",
        "Urgency Manipulation"
    ],
    "explanation": "This email comes from a free email domain, asks for money, and pressures you to act quickly. Legitimate employers do not charge fees or force immediate responses.",
    "advice": "Do not send money. Verify employer information on official websites. Report this email as suspicious."
}
```

## Email Analysis Logic

The email analysis logic includes the following checks:

- **Free Email Domain**: Checks if the sender's email is from a free provider (e.g., Gmail, Yahoo).
- **Payment Instructions**: Scans the email body for payment-related keywords.
- **Urgency Manipulation**: Identifies high-pressure language.
- **No Official Contact Info**: Checks for the absence of a physical address or phone number.
- **Poor Grammar / Unusual Formatting**: Detects common grammatical mistakes and unusual text formatting.

## Website Analysis Logic

The website analysis logic includes the following checks:

- **No HTTPS**: Checks if the website is using a secure connection.
- **Newly Registered Domain**: Checks the age of the domain.
- **Payment Instructions in Text**: Scans the website content for payment-related keywords.
- **No Contact Info**: Looks for contact information like an address or phone number.
- **Unrealistic Promises**: Scans the website content for unrealistic job promises.
- **Domain Mismatch**: Compares the domain name with the company name mentioned on the website.
