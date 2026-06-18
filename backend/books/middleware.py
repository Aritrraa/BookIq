import logging
from .ai_service import groq_api_key_var

logger = logging.getLogger(__name__)

class GroqApiKeyMiddleware:
    """
    Middleware that dynamically sets the user's Groq API Key in a thread-local ContextVar.
    Prioritizes:
    1. The authenticated user's profile API key.
    2. A custom 'X-Groq-Api-Key' HTTP request header.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        api_key = ""

        # 1. Check if user is authenticated and has a UserProfile
        if hasattr(request, "user") and request.user.is_authenticated:
            try:
                profile = request.user.profile
                if profile.groq_api_key:
                    api_key = profile.groq_api_key
                    logger.debug(f"Loaded Groq key from profile for user: {request.user.username}")
            except Exception:
                pass

        # 2. Check request headers (can override profile or be used for guest testing)
        if not api_key:
            header_key = request.headers.get("X-Groq-Api-Key") or request.META.get("HTTP_X_GROQ_API_KEY")
            if header_key:
                api_key = header_key.strip()
                logger.debug("Loaded Groq key from X-Groq-Api-Key header")

        # 3. Set the context variable and execute downstream request
        if api_key:
            token = groq_api_key_var.set(api_key)
            try:
                response = self.get_response(request)
            finally:
                groq_api_key_var.reset(token)
        else:
            # Clear context just in case, then execute
            token = groq_api_key_var.set("")
            try:
                response = self.get_response(request)
            finally:
                groq_api_key_var.reset(token)

        return response
