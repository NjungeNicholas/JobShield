from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import MessageAnalysisRequestSerializer, MessageAnalysisResponseSerializer, LinkAnalysisRequestSerializer, LinkAnalysisResponseSerializer
from .services import analyze_message, analyze_link

class MessageAnalysisView(APIView):
    """
    API endpoint to analyze a message for scam patterns.
    """
    def post(self, request, *args, **kwargs):
        request_serializer = MessageAnalysisRequestSerializer(data=request.data)
        if request_serializer.is_valid():
            message_text = request_serializer.validated_data['message_text']
            analysis_result = analyze_message(message_text)
            response_serializer = MessageAnalysisResponseSerializer(analysis_result)
            return Response(response_serializer.data)
        return Response(request_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LinkAnalysisView(APIView):
    """
    API endpoint to analyze a website link for scam patterns.
    """
    def post(self, request, *args, **kwargs):
        request_serializer = LinkAnalysisRequestSerializer(data=request.data)
        if request_serializer.is_valid():
            url = request_serializer.validated_data['url']
            try:
                analysis_result = analyze_link(url)
                response_serializer = LinkAnalysisResponseSerializer(analysis_result)
                return Response(response_serializer.data)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(request_serializer.errors, status=status.HTTP_400_BAD_REQUEST)