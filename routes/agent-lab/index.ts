import { Request, Response } from 'express';
import { fetchAgentProfiles, requestAgentRoadmap } from '../../lib/services/agentLabClient.js';

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
