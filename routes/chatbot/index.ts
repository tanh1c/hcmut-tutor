/**
 * Chatbot API Route
 * Handles chatbot requests using Gemini API with user context
 */

import 'dotenv/config'; // Load .env file
import { Response } from 'express';
import { AuthRequest } from '../../lib/middleware.js';
import { generateAIResponse, isGeminiConfigured } from '../../lib/services/geminiService.js';

/**
 * Chatbot handler - sends message to Gemini and returns response with user context
 */
export async function chatbotHandler(req: AuthRequest, res: Response) {
  try {
    const { message, conversationHistory = [], conversationId } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Check if user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if Gemini is configured
    if (!isGeminiConfigured()) {
      console.error('GEMINI_API_KEY is not set in environment variables');
      return res.status(500).json({
        success: false,
        error: 'Chatbot service is not configured. GEMINI_API_KEY is missing.'
      });
    }

    // Convert conversation history format from frontend to geminiService format
    // Frontend format: { sender: 'user' | 'bot', text: string }
    // geminiService format: { role: 'user' | 'assistant', content: string }
    const formattedHistory = conversationHistory.map((msg: any) => ({
      role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.text || msg.content || ''
    }));

    // Generate AI response with user context
    const userId = req.user.userId;
    const aiResponse = await generateAIResponse(
      message.trim(),
      userId,
      formattedHistory
    );

    return res.json({
      success: true,
      data: {
        message: aiResponse,
        timestamp: new Date().toISOString(),
        conversationId: conversationId || undefined // Return conversationId if provided
      }
    });

  } catch (error: any) {
    console.error('Chatbot API error:', error);
    
    // Handle specific Gemini API errors
    if (error.message?.includes('API_KEY') || error.message?.includes('cấu hình API') || error.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key. Please check your GEMINI_API_KEY.'
      });
    }

    if (error.message?.includes('quota') || error.message?.includes('rate limit') || error.message?.includes('giới hạn API') || error.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.'
      });
    }

    if (error.status === 503 || error.message?.includes('overloaded') || error.message?.includes('Service Unavailable')) {
      return res.status(503).json({
        success: false,
        error: 'The AI service is temporarily unavailable. Please try again in a few moments.'
      });
    }

    if (error.message?.includes('model') || error.status === 404) {
      return res.status(400).json({
        success: false,
        error: 'Model not found. Please check the model name.'
      });
    }

    // Return error message from geminiService (may be in Vietnamese)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate response. Please try again.'
    });
  }
}

/**
 * Get conversation history handler
 * For now, returns empty array as we're not storing conversation history
 */
export async function getHistoryHandler(req: AuthRequest, res: Response) {
  try {
    // For now, return empty conversations list
    // In the future, this can be implemented to fetch from storage
    return res.json({
      success: true,
      data: {
        conversations: []
      }
    });
  } catch (error: any) {
    console.error('Get history error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get conversation history'
    });
  }
}
