# JobShield API Documentation

This document provides a detailed guide for frontend developers on how to interact with the JobShield API.

## Base URL

The base URL for all API endpoints is:

```
http://127.0.0.1:8000/api/
```

## Authentication

Currently, the API does not require authentication.

---

## Endpoints

### 1. Analyze a Text Message

This endpoint analyzes a given text message for potential scam patterns.

- **Endpoint:** `POST /analyze-message`
- **Description:** Analyzes a block of text for keywords and patterns commonly used in job scams.
- **Request Body:**

  ```json
  {
    "message_text": "string"
  }
  ```

  - `message_text` (string, required): The text of the message to be analyzed.

- **Example Request:**

  ```javascript
  fetch('http://127.0.0.1:8000/api/analyze-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message_text: 'Congratulations! You have been selected for a work-from-home job with a guaranteed income of $5000 per month. No experience needed. Please contact us on WhatsApp to proceed.',
    }),
  })
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
  ```

- **Response Body:**

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

- **Example Response:**

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

---

### 2. Analyze a Website Link

This endpoint analyzes a given website link for potential scam patterns.

- **Endpoint:** `POST /analyze-link`
- **Description:** Fetches and analyzes the content of a website for indicators of a job scam.
- **Request Body:**

  ```json
  {
    "url": "string"
  }
  ```

  - `url` (string, required): The URL of the website to be analyzed.

- **Example Request:**

  ```javascript
  fetch('http://127.0.0.1:8000/api/analyze-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'http://example-job-site.com',
    }),
  })
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
  ```

- **Response Body:**

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

- **Example Response:**

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

### 3. Analyze an Email

This endpoint analyzes a given email for potential scam patterns.

- **Endpoint:** `POST /analyze-email`
- **Description:** Analyzes the content and sender of an email for indicators of a job scam.
- **Request Body:**

  ```json
  {
    "email_text": "string",
    "sender_email": "string"
  }
  ```

  - `email_text` (string, required): The text of the email to be analyzed.
  - `sender_email` (string, required): The email address of the sender.

- **Example Request:**

  ```javascript
  fetch('http://127.0.0.1:8000/api/analyze-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_text: 'Dear candidate, please pay KES 1500 to secure your spot...',
      sender_email: 'hr.company@gmail.com',
    }),
  })
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
  ```

- **Response Body:**

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

- **Example Response:**

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

---

## Error Handling

The API will return standard HTTP status codes to indicate the success or failure of a request.

- **400 Bad Request:** The request was malformed (e.g., missing required fields, invalid URL).
- **422 Unprocessable Entity:** The server understands the content type of the request entity, but was unable to process the contained instructions (e.g., unexpected text format).
- **503 Service Unavailable:** The server was unable to process the request (e.g., failed to fetch a website).

In case of an error, the response body will contain an `error` key with a description of the issue.

```json
{
  "error": "Could not fetch URL: ..."
}
```
