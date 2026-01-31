from django.urls import path
from .views import MessageAnalysisView, LinkAnalysisView

urlpatterns = [
    path('analyze-message', MessageAnalysisView.as_view(), name='analyze-message'),
    path('analyze-link', LinkAnalysisView.as_view(), name='analyze-link'),
]
