from django.urls import path
from .views import MessageAnalysisView, LinkAnalysisView, EmailAnalysisView

urlpatterns = [
    path('analyze-message', MessageAnalysisView.as_view(), name='analyze-message'),
    path('analyze-link', LinkAnalysisView.as_view(), name='analyze-link'),
    path('analyze-email', EmailAnalysisView.as_view(), name='analyze-email'),
]
