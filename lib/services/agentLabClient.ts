import { config } from '../config.js';

async function parseAgentResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return {
    success: false,
    error: text || `Agent service returned ${response.status}`
  };
}

export async function fetchAgentProfiles() {
  const response = await fetch(`${config.agentService.url}/profiles`, {
    headers: {
      Accept: 'application/json'
    }
  });

  const payload = await parseAgentResponse(response);

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || payload.detail || 'Failed to load agent profiles');
  }

  return payload.data;
}

export async function requestAgentRoadmap(body: { studentId?: string; prompt?: string }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.agentService.timeoutMs);

  try {
    const response = await fetch(`${config.agentService.url}/roadmap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const payload = await parseAgentResponse(response);

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || payload.detail || 'Failed to generate roadmap');
    }

    return payload.data;
  } finally {
    clearTimeout(timeout);
  }
}

async function timedAgentRequest(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.agentService.timeoutMs);

  try {
    const response = await fetch(`${config.agentService.url}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {})
      },
      signal: controller.signal
    });

    const payload = await parseAgentResponse(response);

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || payload.detail || 'Agent service request failed');
    }

    return payload.data;
  } finally {
    clearTimeout(timeout);
  }
}

export function listAgentChatSessions() {
  return timedAgentRequest('/chat-lab/sessions');
}

export function createAgentChatSession(body: { studentId?: string; title?: string }) {
  return timedAgentRequest('/chat-lab/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

export function fetchAgentChatSession(sessionId: string) {
  return timedAgentRequest(`/chat-lab/sessions/${sessionId}`);
}

export function uploadAgentChatDocuments(
  sessionId: string,
  body: { studentId?: string; documents: Array<{ name: string; mimeType: string; size: number }> }
) {
  return timedAgentRequest(`/chat-lab/sessions/${sessionId}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

export function sendAgentChatMessage(
  sessionId: string,
  body: { studentId?: string; message: string }
) {
  return timedAgentRequest(`/chat-lab/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}
