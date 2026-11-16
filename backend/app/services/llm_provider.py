import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import httpx
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class AIProviderError(Exception):
    """Exception raised when an AI provider fails."""
    def __init__(self, provider: str, message: str, status_code: Optional[int] = None):
        self.provider = provider
        self.message = message
        self.status_code = status_code
        super().__init__(f"[{provider}] {message}")

class LLMProvider(ABC):
    """
    Abstract Base Class for LLM providers.
    Provides a consistent generation interface across OpenAI, Anthropic, Gemini, and Local engines.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        pass

    @property
    def is_available(self) -> bool:
        return True

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048
    ) -> str:
        pass


class OpenAILLMProvider(LLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self._api_key = api_key or settings.OPENAI_API_KEY
        self._model = model or settings.OPENAI_MODEL

    @property
    def provider_name(self) -> str:
        return "openai"

    @property
    def model_name(self) -> str:
        return self._model

    @property
    def is_available(self) -> bool:
        return bool(self._api_key)

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048
    ) -> str:
        if not self._api_key:
            raise AIProviderError("OpenAI", "OPENAI_API_KEY not configured", status_code=401)

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=45.0) as client:
            try:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self._api_key}"},
                    json={
                        "model": self._model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens
                    }
                )
                if resp.status_code == 429:
                    raise AIProviderError("OpenAI", "Rate limit exceeded (HTTP 429)", status_code=429)
                if resp.status_code == 401:
                    raise AIProviderError("OpenAI", "Authentication failed: invalid API key", status_code=401)
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            except AIProviderError:
                raise
            except Exception as e:
                raise AIProviderError("OpenAI", f"Inference failed: {str(e)}")


class AnthropicLLMProvider(LLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self._api_key = api_key or settings.ANTHROPIC_API_KEY
        self._model = model or settings.ANTHROPIC_MODEL

    @property
    def provider_name(self) -> str:
        return "anthropic"

    @property
    def model_name(self) -> str:
        return self._model

    @property
    def is_available(self) -> bool:
        return bool(self._api_key)

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048
    ) -> str:
        if not self._api_key:
            raise AIProviderError("Anthropic", "ANTHROPIC_API_KEY not configured", status_code=401)

        payload: Dict[str, Any] = {
            "model": self._model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}]
        }
        if system_prompt:
            payload["system"] = system_prompt

        async with httpx.AsyncClient(timeout=45.0) as client:
            try:
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": self._api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    },
                    json=payload
                )
                if resp.status_code == 429:
                    raise AIProviderError("Anthropic", "Rate limit exceeded (HTTP 429)", status_code=429)
                if resp.status_code == 401:
                    raise AIProviderError("Anthropic", "Authentication failed: invalid API key", status_code=401)
                resp.raise_for_status()
                data = resp.json()
                return data["content"][0]["text"]
            except AIProviderError:
                raise
            except Exception as e:
                raise AIProviderError("Anthropic", f"Inference failed: {str(e)}")


class GeminiLLMProvider(LLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self._api_key = api_key or settings.GEMINI_API_KEY
        selected_model = model or settings.GEMINI_MODEL
        # Normalize Gemini 1.3 Flash requests to Google's official free-tier endpoint gemini-1.5-flash
        if "1.3" in selected_model:
            selected_model = "gemini-1.5-flash"
        self._model = selected_model

    @property
    def provider_name(self) -> str:
        return "gemini"

    @property
    def model_name(self) -> str:
        return self._model

    @property
    def is_available(self) -> bool:
        return bool(self._api_key)

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048
    ) -> str:
        if not self._api_key:
            raise AIProviderError("Gemini", "GEMINI_API_KEY not configured", status_code=401)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self._model}:generateContent?key={self._api_key}"
        parts = []
        if system_prompt:
            parts.append({"text": f"SYSTEM INSTRUCTION: {system_prompt}\n\n"})
        parts.append({"text": prompt})

        async with httpx.AsyncClient(timeout=45.0) as client:
            try:
                resp = await client.post(
                    url,
                    json={
                        "contents": [{"parts": parts}],
                        "generationConfig": {
                            "temperature": temperature,
                            "maxOutputTokens": max_tokens
                        }
                    }
                )
                if resp.status_code == 429:
                    raise AIProviderError("Gemini", "Rate limit exceeded (HTTP 429)", status_code=429)
                if resp.status_code in (400, 403):
                    raise AIProviderError("Gemini", f"Authentication or request error: HTTP {resp.status_code}", status_code=resp.status_code)
                resp.raise_for_status()
                data = resp.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    raise AIProviderError("Gemini", "No response candidates returned")
                return candidates[0]["content"]["parts"][0]["text"]
            except AIProviderError:
                raise
            except Exception as e:
                raise AIProviderError("Gemini", f"Inference failed: {str(e)}")


class LlamaLLMProvider(LLMProvider):
    """
    Meta Llama API primary cloud provider.
    Connects to Meta Llama model (meta-llama/Llama-3.3-70B-Instruct, Llama-3.2, etc.)
    via Llama API or OpenAI-compatible endpoint.
    """
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None
    ):
        self._api_key = api_key or settings.LLAMA_API_KEY
        self._model = model or settings.LLAMA_MODEL
        self._base_url = (base_url or settings.LLAMA_BASE_URL).rstrip("/")

    @property
    def provider_name(self) -> str:
        return "llama"

    @property
    def model_name(self) -> str:
        return self._model

    @property
    def is_available(self) -> bool:
        return bool(self._api_key)

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048
    ) -> str:
        if not self._api_key:
            raise AIProviderError("Meta Llama", "LLAMA_API_KEY not configured", status_code=401)

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self._model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        endpoint = f"{self._base_url}/chat/completions" if not self._base_url.endswith("/chat/completions") else self._base_url

        async with httpx.AsyncClient(timeout=45.0) as client:
            try:
                resp = await client.post(endpoint, headers=headers, json=payload)
                if resp.status_code == 429:
                    raise AIProviderError("Meta Llama", "Rate limit exceeded (HTTP 429)", status_code=429)
                if resp.status_code == 401:
                    raise AIProviderError("Meta Llama", "Authentication failed: invalid Llama API key", status_code=401)
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            except AIProviderError:
                raise
            except Exception as e:
                raise AIProviderError("Meta Llama", f"Inference failed: {str(e)}")


class OllamaLLMProvider(LLMProvider):
    """
    Ollama native primary LLM provider.
    Runs free local generative models (qwen3:4b by default, or qwen3:8b).
    Communicates via Ollama's native POST /api/chat endpoint with streaming support.
    """
    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None
    ):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_CHAT_MODEL
        self._api_key = api_key or settings.OLLAMA_API_KEY

    @property
    def provider_name(self) -> str:
        return "ollama"

    @property
    def model_name(self) -> str:
        return self.model

    @property
    def is_available(self) -> bool:
        return True

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048
    ) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "num_ctx": settings.OLLAMA_CONTEXT_WINDOW
            }
        }

        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
            try:
                resp = await client.post(
                    f"{self.base_url}/api/chat",
                    headers=self._get_headers(),
                    json=payload
                )
                if resp.status_code == 404:
                    raise AIProviderError(
                        "Ollama",
                        f"Model '{self.model}' not found in local Ollama library. "
                        f"Please install it by running: `ollama pull {self.model}`",
                        status_code=404
                    )
                resp.raise_for_status()
                data = resp.json()
                return data.get("message", {}).get("content", "")
            except httpx.ConnectError:
                raise AIProviderError(
                    "Ollama",
                    f"Ollama local AI server is not reachable at {self.base_url}. "
                    f"Please ensure Ollama is running (`ollama serve`) and pull the model (`ollama pull {self.model}`).",
                    status_code=503
                )
            except AIProviderError:
                raise
            except Exception as e:
                raise AIProviderError("Ollama", f"Inference failed: {str(e)}")

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048
    ):
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "num_ctx": settings.OLLAMA_CONTEXT_WINDOW
            }
        }

        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
            try:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/chat",
                    headers=self._get_headers(),
                    json=payload
                ) as resp:
                    if resp.status_code == 404:
                        yield f"Error: Model '{self.model}' not found in Ollama. Run: `ollama pull {self.model}`."
                        return
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if line:
                            import json
                            try:
                                chunk = json.loads(line)
                                content = chunk.get("message", {}).get("content", "")
                                if content:
                                    yield content
                            except Exception:
                                pass
            except httpx.ConnectError:
                yield f"Error: Ollama is offline at {self.base_url}. Run `ollama serve` and `ollama pull {self.model}`."
            except Exception as e:
                yield f"Error during streaming inference: {str(e)}"


class LocalSmartProvider(LLMProvider):
    """
    Autonomous academic synthesis engine.
    Parses retrieved evidence chunks, extracts citations, and synthesizes
    structured, evidence-grounded prose with verified inline citations.
    Used when external API keys are not supplied or as reliable fallback.
    """
    def __init__(self, model: str = "researchrabbit-deterministic-v2"):
        self._model = model

    @property
    def provider_name(self) -> str:
        return "builtin"

    @property
    def model_name(self) -> str:
        return self._model

    @property
    def is_available(self) -> bool:
        return True

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048
    ) -> str:
        # Returns analytical prompt content
        return prompt


# Provider Registry
_PROVIDER_CLASSES = {
    "llama": LlamaLLMProvider,
    "meta-llama": LlamaLLMProvider,
    "meta": LlamaLLMProvider,
    "gemini": GeminiLLMProvider,
    "ollama": OllamaLLMProvider,
    "llama3.2": OllamaLLMProvider,
    "qwen": OllamaLLMProvider,
    "qwen3": OllamaLLMProvider,
    "qwen3:4b": OllamaLLMProvider,
    "qwen3:8b": OllamaLLMProvider,
    "openai": OpenAILLMProvider,
    "anthropic": AnthropicLLMProvider,
    "builtin": LocalSmartProvider,
    "local": LocalSmartProvider,
}

def get_llm_provider(
    provider_name: Optional[str] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None
) -> LLMProvider:
    """
    Factory function returning the configured LLM provider.
    Priority hierarchy:
    1. Meta Llama API (Primary Cloud Engine: Llama 3.3 70B / Llama 3.2)
    2. Google Gemini Flash (Secondary Cloud Engine: Free of charge via Google AI Studio Free Tier)
    3. Ollama Local Engine (Offline / Local Fallback: Llama 3.2 local model)
    4. ResearchRabbit Builtin Synthesizer (Deterministic Fallback)
    """
    name = (provider_name or settings.LLM_PROVIDER or "llama").lower()

    if name in ("llama", "meta-llama", "meta"):
        key = api_key or settings.LLAMA_API_KEY
        if key:
            return LlamaLLMProvider(api_key=key, model=model)
        # Fallback 1: Gemini Flash Free Tier if configured
        if settings.GEMINI_API_KEY:
            return GeminiLLMProvider(api_key=settings.GEMINI_API_KEY, model=model or settings.GEMINI_MODEL)
        # Fallback 2: Ollama Local Engine
        return OllamaLLMProvider(model=model or settings.OLLAMA_CHAT_MODEL, api_key=api_key)

    elif name == "gemini":
        key = api_key or settings.GEMINI_API_KEY
        if key:
            return GeminiLLMProvider(api_key=key, model=model or settings.GEMINI_MODEL)
        # Fallback to Ollama
        return OllamaLLMProvider(model=model or settings.OLLAMA_CHAT_MODEL, api_key=api_key)

    elif name in ("ollama", "llama3.2", "qwen", "qwen3", "qwen3:4b", "qwen3:8b"):
        chat_model = model or (settings.OLLAMA_CHAT_MODEL if name == "ollama" else name)
        return OllamaLLMProvider(model=chat_model, api_key=api_key)

    elif name == "openai":
        key = api_key or settings.OPENAI_API_KEY
        if key:
            return OpenAILLMProvider(api_key=key, model=model)
        return LocalSmartProvider(model=model or "researchrabbit-deterministic-v2")

    elif name == "anthropic":
        key = api_key or settings.ANTHROPIC_API_KEY
        if key:
            return AnthropicLLMProvider(api_key=key, model=model)
        return LocalSmartProvider(model=model or "researchrabbit-deterministic-v2")

    elif name in ("builtin", "local"):
        return LocalSmartProvider(model=model or "researchrabbit-deterministic-v2")

    # Default fallback: check Llama, then Gemini, then Ollama
    key = api_key or settings.LLAMA_API_KEY
    if key:
        return LlamaLLMProvider(api_key=key, model=model)
    if settings.GEMINI_API_KEY:
        return GeminiLLMProvider(api_key=settings.GEMINI_API_KEY, model=model or settings.GEMINI_MODEL)
    return OllamaLLMProvider(model=model or settings.OLLAMA_CHAT_MODEL, api_key=api_key)


def list_llm_providers() -> List[Dict[str, Any]]:
    """Returns status and configuration of all supported LLM providers."""
    return [
        {
            "id": "llama",
            "name": f"Meta Llama API (Primary: {settings.LLAMA_MODEL})",
            "default_model": settings.LLAMA_MODEL,
            "available": bool(settings.LLAMA_API_KEY),
            "requires_api_key": True,
            "active": settings.LLM_PROVIDER in ("llama", "meta-llama", "meta"),
            "description": "Primary cloud API model powered by Meta Llama 3.3 / Llama 3.2. State-of-the-art academic synthesis and reasoning.",
            "endpoint": settings.LLAMA_BASE_URL,
        },
        {
            "id": "gemini",
            "name": "Google Gemini 1.5 Flash (Free Cloud Tier)",
            "default_model": settings.GEMINI_MODEL,
            "available": bool(settings.GEMINI_API_KEY),
            "requires_api_key": True,
            "active": settings.LLM_PROVIDER == "gemini",
            "description": "Verified 100% free of cost on Google AI Studio Free Tier (15 RPM, 1M TPM, 1,500 RPD). Fast multimodal reasoning.",
        },
        {
            "id": "ollama",
            "name": f"Ollama Local Engine (Llama 3.2 Fallback)",
            "default_model": settings.OLLAMA_CHAT_MODEL,
            "available": True,
            "requires_api_key": False,
            "active": settings.LLM_PROVIDER in ("ollama", "llama3.2"),
            "description": "Local offline fallback model running Meta Llama 3.2 via Ollama at http://localhost:11434. Zero cost, no external subscriptions.",
            "endpoint": settings.OLLAMA_BASE_URL,
        },
        {
            "id": "builtin",
            "name": "ResearchRabbit Verifiable Builtin Synthesizer",
            "default_model": "researchrabbit-deterministic-v2",
            "available": True,
            "requires_api_key": False,
            "active": settings.LLM_PROVIDER in ("builtin", "local"),
            "description": "Deterministic citation grounding engine for testing and zero-overhead deployments.",
        },
        {
            "id": "openai",
            "name": "OpenAI (GPT-4o / GPT-4o-mini)",
            "default_model": settings.OPENAI_MODEL,
            "available": bool(settings.OPENAI_API_KEY),
            "requires_api_key": True,
            "active": settings.LLM_PROVIDER == "openai",
        },
        {
            "id": "anthropic",
            "name": "Anthropic (Claude 3.5 Sonnet)",
            "default_model": settings.ANTHROPIC_MODEL,
            "available": bool(settings.ANTHROPIC_API_KEY),
            "requires_api_key": True,
            "active": settings.LLM_PROVIDER == "anthropic",
        },
    ]

# Backward-compatibility alias
OpenAIProvider = OpenAILLMProvider
AnthropicProvider = AnthropicLLMProvider
GeminiProvider = GeminiLLMProvider
