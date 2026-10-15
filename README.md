# AI Coding Tutor (Code-Mentor)

AI Coding Tutor is a small full-stack TypeScript + React project that provides context-aware Socratic hints for code. The UI lets users paste code, submit it to an LLM (Anthropic) and receive progressive hints that never give away the full answer.

Key points
- Frontend: React + TypeScript (src/)
- Build tool: Vite (vite.config.ts, tsconfig.json)
- Example project folder: full-stack-ai-coding-tutor/
- Server: server.js (simple backend used by the project)
- Uses Anthropic API for hints (you must provide your API key)

Features
- Paste code and request hints
- Keeps a small conversation history (hint depth increases with repeats)
- Lightweight UI with keyboard shortcut (Ctrl/Cmd+Enter) to request hints

Quickstart (local)
1. Clone the repo
   git clone https://github.com/Barath-S-V/Code-Mentor.git
   cd Code-Mentor

2. Install dependencies
   npm install

3. Development
   - If the project uses Vite start the dev server:
     npm run dev
   - If you need to run the backend server:
     node server.js
   (If your package.json uses different scripts, replace the commands above with the script names defined there.)

4. Environment / API key
   - The app expects an Anthropic API key to be entered in the UI (stored locally in localStorage under `tutor_api_key`).
   - Keep your key private—do not commit it to the repo.

Usage
- Open the app in your browser (dev server URL printed by `npm run dev`).
- Paste source code into the left pane, enter your Anthropic API key, then click "Get Hint" or press Ctrl/Cmd+Enter.
- Hints are displayed on the right; repeated requests increase hint "depth".

Project layout (important files)
- src/ - React + TypeScript frontend (main entry: src/main.tsx, core UI: src/App.tsx)
- full-stack-ai-coding-tutor/ - alternate project folder with index.html and its own src
- server.js - Node backend (if used by the project)
- vite.config.ts, tsconfig.json - tooling config
- package.json - project scripts and dependencies
