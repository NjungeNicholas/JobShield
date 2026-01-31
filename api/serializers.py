from rest_framework import serializers

class MessageAnalysisRequestSerializer(serializers.Serializer):
    message_text = serializers.CharField()

class MessageAnalysisResponseSerializer(serializers.Serializer):
    risk_level = serializers.CharField()
    risk_score = serializers.IntegerField()
    detected_patterns = serializers.ListField(child=serializers.CharField())
    explanation = serializers.CharField()
    advice = serializers.CharField()

class LinkAnalysisRequestSerializer(serializers.Serializer):
    url = serializers.URLField()

class LinkAnalysisResponseSerializer(serializers.Serializer):
    risk_level = serializers.CharField()
    risk_score = serializers.IntegerField()
    detected_patterns = serializers.ListField(child=serializers.CharField())
    explanation = serializers.CharField()
    advice = serializers.CharField()

class EmailAnalysisRequestSerializer(serializers.Serializer):
    email_text = serializers.CharField()
    sender_email = serializers.EmailField()

class EmailAnalysisResponseSerializer(serializers.Serializer):
    risk_level = serializers.CharField()
    risk_score = serializers.IntegerField()
    detected_patterns = serializers.ListField(child=serializers.CharField())
    explanation = serializers.CharField()
    advice = serializers.CharField()
