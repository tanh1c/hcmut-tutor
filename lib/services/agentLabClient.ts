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
