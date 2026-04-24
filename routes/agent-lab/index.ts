import { Request, Response } from 'express';
import { Readable } from 'node:stream';
import {
  createAgentChatSession,
  fetchAgentChatSession,
  fetchAgentProfiles,
  listAgentChatSessions,
  requestAgentRoadmap,
  sendAgentChatMessage,
  uploadAgentChatDocuments
} from '../../lib/services/agentLabClient.js';
import { config } from '../../lib/config.js';

export async function listAgentProfilesHandler(_req: Request, res: Response) {
  try {
    const profiles = await fetchAgentProfiles();

    return res.json({
      success: true,
      data: profiles
    });
  } catch (error: any) {
    return res.status(502).json({
      success: false,
      error: error.message || 'Failed to load agent profiles'
    });
  }
}

export async function generateAgentRoadmapHandler(req: Request, res: Response) {
  try {
    const { studentId, prompt } = req.body || {};
    const result = await requestAgentRoadmap({ studentId, prompt });

    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return res.status(502).json({
      success: false,
      error: error.message || 'Failed to generate roadmap'
    });
  }
}

export async function listAgentChatSessionsHandler(_req: Request, res: Response) {
  try {
    const sessions = await listAgentChatSessions();

    return res.json({
      success: true,
      data: sessions
    });
  } catch (error: any) {
    return res.status(502).json({
      success: false,
      error: error.message || 'Failed to load agent chat sessions'
    });
  }
}

export async function createAgentChatSessionHandler(req: Request, res: Response) {
  try {
    const { studentId, title } = req.body || {};
    const session = await createAgentChatSession({ studentId, title });

    return res.json({
      success: true,
      data: session
    });
  } catch (error: any) {
    return res.status(502).json({
      success: false,
      error: error.message || 'Failed to create agent chat session'
    });
  }
}

export async function getAgentChatSessionHandler(req: Request, res: Response) {
  try {
    const session = await fetchAgentChatSession(req.params.sessionId);

    return res.json({
      success: true,
      data: session
    });
  } catch (error: any) {
    return res.status(502).json({
      success: false,
      error: error.message || 'Failed to load agent chat session'
    });
  }
}

export async function uploadAgentChatDocumentsHandler(req: Request, res: Response) {
  try {
    console.log('[DEBUG Node] Upload documents request:', {
      sessionId: req.params.sessionId,
      body: req.body
    });
    const { studentId, documents } = req.body || {};
    const session = await uploadAgentChatDocuments(req.params.sessionId, {
      studentId,
      documents: Array.isArray(documents) ? documents : []
    });

    console.log('[DEBUG Node] Upload response:', {
      sessionId: session.id,
      documentCount: session.documents.length
    });

    return res.json({
      success: true,
      data: session
    });
  } catch (error: any) {
    console.error('[DEBUG Node] Upload error:', error);
    return res.status(502).json({
      success: false,
      error: error.message || 'Failed to upload agent chat documents'
    });
  }
}

export async function sendAgentChatMessageHandler(req: Request, res: Response) {
  try {
    const { studentId, message } = req.body || {};
    const session = await sendAgentChatMessage(req.params.sessionId, { studentId, message });

    return res.json({
      success: true,
      data: session
    });
  } catch (error: any) {
    return res.status(502).json({
      success: false,
      error: error.message || 'Failed to send agent chat message'
    });
  }
}

export async function streamAgentChatMessageHandler(req: Request, res: Response) {
  try {
    const { studentId, message } = req.body || {};
    const upstream = await fetch(`${config.agentService.url}/chat-lab/sessions/${req.params.sessionId}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson'
      },
      body: JSON.stringify({ studentId, message })
    });

    if (!upstream.ok || !upstream.body) {
      const errorText = await upstream.text();
      return res.status(502).json({
        success: false,
        error: errorText || 'Failed to stream agent chat message'
      });
    }

    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    Readable.fromWeb(upstream.body as any).pipe(res);
  } catch (error: any) {
    return res.status(502).json({
      success: false,
      error: error.message || 'Failed to stream agent chat message'
    });
  }
}
