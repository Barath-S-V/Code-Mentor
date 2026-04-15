/**
 * AI Coding Tutor - Express Backend Server
 * 
 * This server provides the /hint endpoint that integrates with Claude API
 * to deliver context-aware hints for beginner coders.
 * 
 * Usage:
 *   1. Set ANTHROPIC_API_KEY environment variable
 *   2. Run: node server.js
 *   3. Open http://localhost:3001
 */

import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the Vite dist directory (or public)
app.use(express.static(join(__dirname, 'dist')));

// In-memory session store (use Redis or DB for production)
const sessions = new Map();

// ──────────────────────────────────────────────────────────
// System Prompt — the core tutoring behavior
// ──────────────────────────────────────────────────────────
function buildSystemPrompt(context) {
  return `You are a context-aware AI coding tutor for beginners.

You must follow these rules strictly:

NEVER provide the final or corrected code.
NEVER rewrite the user's code.
Focus only on explaining the logical or conceptual mistake.
Use simple analogies suitable for beginners.
Guide the learner using Socratic hints.
Adapt your response using the provided context below.

---
CONTEXT:
${context.previousCode ? `Previous code submitted:\n${context.previousCode}` : 'This is the first hint request.'}
---
Hint attempt number: ${context.hintCount}
---
${context.detectedErrorType ? `Previously detected error type: ${context.detectedErrorType}` : 'No error type detected yet.'}
---

HINT DEPTH RULES:
- If hintCount is 1: Give a gentle, high-level nudge. Point the user in the right direction without being specific.
- If hintCount is 2: Be slightly more specific about WHAT is wrong, but still don't give the fix.
- If hintCount is 3+: The user has likely made the same or similar mistake repeatedly. Give a more detailed explanation of the conceptual error, but still NEVER write the corrected code.

RESPONSE FORMAT:
1. First, identify what you think the user is trying to do (acknowledge their effort).
2. Point out the area of the code that seems problematic (line numbers or code section).
3. Explain the CONCEPTUAL mistake using a simple analogy.
4. End with a Socratic question that prompts the learner to think and self-correct.
5. If you detect a specific error type, name it (e.g., "Off-by-One Error", "Infinite Loop", "Type Mismatch") so they can look it up later.

Keep responses warm, encouraging, and beginner-friendly. No jargon without explanation.`;
}

// ──────────────────────────────────────────────────────────
// POST /hint — Main tutoring endpoint
// ──────────────────────────────────────────────────────────
app.post('/hint', async (req, res) => {
  try {
    const { sessionId, code } = req.body;

    if (!code || code.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide some code to analyze.' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required.' });
    }

    // Retrieve or create session
    let session = sessions.get(sessionId);
    if (!session) {
      session = {
        previousCode: '',
        hintCount: 0,
        detectedErrorType: null,
        conversationHistory: []
      };
    }

    // Update session context
    const previousCode = session.previousCode;
    const hintCount = session.hintCount + 1;

    // Detect error type by comparing with previous code
    let detectedErrorType = session.detectedErrorType;
    if (previousCode && previousCode.trim() === code.trim()) {
      detectedErrorType = detectedErrorType || 'Repeated attempt — same code';
    }

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt({
      previousCode,
      hintCount,
      detectedErrorType
    });

    // Build conversation history
    const messages = [
      ...session.conversationHistory,
      { role: 'user', content: `Here is my code:\n\n\`\`\`\n${code}\n\`\`\`` }
    ];

    // Call Claude API
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages
    });

    const hintText = claudeResponse.content[0].text;

    // Update session
    session.hintCount = hintCount;
    session.previousCode = code;
    session.detectedErrorType = detectedErrorType;
    session.conversationHistory = [
      ...session.conversationHistory,
      { role: 'user', content: `Here is my code:\n\n\`\`\`\n${code}\n\`\`\`` },
      { role: 'assistant', content: hintText }
    ];

    // Keep conversation history manageable (last 10 messages)
    if (session.conversationHistory.length > 10) {
      session.conversationHistory = session.conversationHistory.slice(-10);
    }

    sessions.set(sessionId, session);

    res.json({
      hint: hintText,
      context: {
        hintCount: session.hintCount,
        detectedErrorType: session.detectedErrorType
      }
    });

  } catch (error) {
    console.error('Error calling Claude API:', error);

    if (error.message && error.message.includes('API key')) {
      return res.status(500).json({
        error: 'API key not configured. Set the ANTHROPIC_API_KEY environment variable.'
      });
    }

    res.status(500).json({
      error: 'An error occurred while processing your hint request. Please try again.'
    });
  }
});

// ──────────────────────────────────────────────────────────
// GET /session — Get current session context
// ──────────────────────────────────────────────────────────
app.get('/session/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }
  res.json({
    hintCount: session.hintCount,
    detectedErrorType: session.detectedErrorType
  });
});

// ──────────────────────────────────────────────────────────
// DELETE /session — Reset session
// ──────────────────────────────────────────────────────────
app.delete('/session/:sessionId', (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ message: 'Session cleared.' });
});

// ──────────────────────────────────────────────────────────
// Catch-all: serve the SPA
// ──────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🎓 AI Coding Tutor server running on http://localhost:${PORT}`);
  console.log(`📝 POST /hint — Submit code for hints`);
  console.log(`📊 GET  /session/:id — Check session context`);
  console.log(`🔄 DELETE /session/:id — Reset session`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('⚠️  ANTHROPIC_API_KEY not set. Set it to enable Claude API.');
  }
});

export default app;
