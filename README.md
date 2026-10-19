# CyberKavach AI

![React 18](https://img.shields.io/badge/React-18-149eca)
![Vite](https://img.shields.io/badge/Build-Vite-646cff)

CyberKavach AI is a cyber-fraud awareness application for citizens. It analyzes suspicious messages, links, media, and caller numbers; keeps a citizen complaints ledger; and helps users find official reporting channels and emergency guidance.

## Quick Start

1. Open a terminal in the directory containing this README and enter the project folder:

   ```sh
   cd CyberKavach
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Start the development server:

   ```sh
   npm run dev
   ```

Vite prints the local URL when the server is ready. Create a production bundle with `npm run build` and serve it locally with `npm run preview`.

## Project Directory Map

```text
CyberKavach/
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── src/
    ├── App.jsx
    ├── main.jsx
    └── mlFraudEngine.js
```

## Module Architecture

- `src/App.jsx` contains the application views and workflows, including scam analysis, the complaints ledger, fraud data explorer, help directory, and triage chatbot.
- `src/mlFraudEngine.js` provides local fraud checks for suspicious text and telephone numbers, including risk terms, number-pattern checks, international prefixes, and complaint matching.
- `src/main.jsx` mounts the React application into the `#root` element.
- `vite.config.js` configures Vite with the React plugin for development and production builds.
- `index.html` is Vite's browser entry document and loads Tailwind CSS from its CDN.

## Optional Gemini Configuration

The application can use Gemini for additional analysis. Copy `.env.example` to `.env`, then replace the placeholder with a Google AI Studio API key:

```dotenv
VITE_GEMINI_API_KEY=your_actual_api_key
```

Restart the Vite server after changing environment variables. The local fraud checks remain available without a Gemini key. Variables prefixed with `VITE_` are included in browser code and are visible to users; do not treat this key as a server-side secret. For a public production deployment, call Gemini through a server-side endpoint and apply provider-side key restrictions.

## Key Features

- **Multimodal scam checking:** Review suspicious text, phone numbers, links, and supported image, audio, or video inputs, with Gemini assistance when configured.
- **Persistent complaints ledger:** Record and manage citizen reports in the browser, with supporting evidence and date-based organization.
- **10-year fraud data explorer:** Browse reported fraud trends and loss breakdowns from 2017 through 2026.
- **Official helpline directory:** Find national cybercrime reporting and relevant government support portals.
- **Emergency triage chatbot:** Get guided next steps for responding to suspected cyber fraud, including reporting and recovery guidance.