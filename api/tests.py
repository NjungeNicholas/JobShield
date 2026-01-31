from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

class LinkAnalysisAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_analyze_link_success(self):
        """
        Test the link analysis endpoint with a valid URL.
        """
        url = "http://example.com"  # Using a safe, non-https URL for testing
        response = self.client.post('/api/analyze-link', {'url': url}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('risk_level', response.data)
        self.assertIn('risk_score', response.data)
        self.assertIn('detected_patterns', response.data)
        self.assertIn('explanation', response.data)
        self.assertIn('advice', response.data)

    def test_analyze_link_invalid_url(self):
        """
        Test the link analysis endpoint with an invalid URL.
        """
        response = self.client.post('/api/analyze-link', {'url': 'not-a-url'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_analyze_link_unreachable_url(self):
        """
        Test the link analysis endpoint with an unreachable URL.
        """
        # This will cause a requests.exceptions.RequestException, which should result in a 503 error.
        url = "http://localhost:9999" 
        response = self.client.post('/api/analyze-link', {'url': url}, format='json')
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)