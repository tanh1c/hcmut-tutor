from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin

import requests


@dataclass(slots=True)
class _Message:
    content: str | None


@dataclass(slots=True)
class _Choice:
    message: _Message


@dataclass(slots=True)
class _CompletionResponse:
    choices: list[_Choice]


class _CompletionsAPI:
    def __init__(self, parent: "OpenAICompatibleClient"):
        self._parent = parent

    def create(self, *, model: str, messages: list[dict[str, Any]], **kwargs: Any) -> _CompletionResponse:
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
        }
        payload.update(kwargs)

        headers = {
            "Content-Type": "application/json",
        }
        if self._parent.api_key:
            headers["Authorization"] = f"Bearer {self._parent.api_key}"

        response = self._parent.session.post(
            urljoin(self._parent.base_url, "chat/completions"),
            json=payload,
            headers=headers,
            timeout=self._parent.timeout_seconds,
        )
        response.raise_for_status()
        data = response.json()

        choices = []
        for raw_choice in data.get("choices", []):
            raw_message = raw_choice.get("message", {})
            choices.append(_Choice(message=_Message(content=raw_message.get("content"))))

        return _CompletionResponse(choices=choices)


class _ChatAPI:
    def __init__(self, parent: "OpenAICompatibleClient"):
        self.completions = _CompletionsAPI(parent)


class OpenAICompatibleClient:
    def __init__(
        self,
        *,
        base_url: str,
        api_key: str | None,
        timeout_seconds: float = 300.0,
        session: requests.Session | None = None,
    ):
        normalized = base_url.rstrip("/") + "/"
        self.base_url = normalized
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self.session = session or requests.Session()
        self.chat = _ChatAPI(self)
