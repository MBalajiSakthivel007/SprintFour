# FixIt — PII Correction Experience

**Sprintfour Hackathon 2026 · Problem 3: Fixing the Tool's Mistakes**  
**Participant:** Balaji Sakthivel Marimuthu · CB.C.U4CSE23213

---

## What is FixIt?

FixIt is a full-stack web application that helps reviewers correct AI-suggested PII (Personally Identifying Information) redactions in documents.

The AI makes two types of mistakes:
- **False positives** — harmless text that was over-redacted (e.g., public company names, legal statute numbers)
- **False negatives** — sensitive PII that was missed (e.g., names of expert witnesses, emergency contact numbers)

FixIt's design is built around one core insight: **Sam moves fast and trusts the tool a little too much.** The interface actively fights for his attention on the dangerous cases, rather than passively listing everything.

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Danger Zone panel (right)** surfaces missed PII with pulsing animation | Missed PII = real data leak. Sam must see these without effort. |
| **Low-confidence spans sorted first** in the left panel | Confidence < 65% = likely false positive. Start Sam where mistakes cluster. |
| **Keyboard-first flow** (A/R/M/D/Tab) | Sam is fast. Mouse-based review is too slow for production use. |
| **Review Gate before finalize** | Lists unchecked dangerous items. Forces a conscious decision, not a blind click. |
| **Progress bar in toolbar** | Shows Sam where he stands without requiring him to count cards. |
| **Auto-advance after action** | After each correction, Tab automatically moves to the next span. No hunting. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Node.js 20 + Express 4 + TypeScript |
| PII Detection | Google Gemini 1.5 Flash (with mock fallback) |
| Styling | Vanilla CSS (no framework) |
| State | React hooks + Context (no Redux) |

---

## Project Structure

```
SprintFour/
├── backend/
│   ├── src/
│   │   ├── app.ts                    # Express entry point
│   │   ├── types/index.ts            # Shared TypeScript interfaces
│   │   ├── routes/
│   │   │   ├── analyze.ts            # POST /api/analyze
│   │   │   └── corrections.ts        # POST/GET /api/corrections
│   │   ├── services/
│   │   │   ├── piiService.ts         # Gemini + mock PII detection
│   │   │   └── documentService.ts    # Session management
│   │   └── middleware/
│   │       └── errorHandler.ts       # Global error handler
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── App.tsx                   # App state machine + layout
    │   ├── types/index.ts            # Shared TypeScript interfaces
    │   ├── services/api.ts           # Typed fetch wrappers
    │   ├── hooks/
    │   │   ├── usePIICorrections.ts  # Correction state + actions
    │   │   └── useKeyboardShortcuts.ts
    │   └── components/
    │       ├── DocumentEditor.tsx    # Inline highlighted document
    │       ├── ReviewPanels.tsx      # Left (FP) + Right (Danger) panels
    │       ├── ReviewGate.tsx        # Safety modal before finalize
    │       └── PIIBadge.tsx          # Type badge + confidence bar
    ├── index.css                     # Full design system
    └── index.html
```

---

## Setup & Running

### Prerequisites
- Node.js 18+
- npm

### 1. Clone the repo

```bash
git clone https://github.com/MBalajiSakthivel007/SprintFour.git
cd SprintFour
```

### 2. Backend setup

```bash
cd backend
npm install

# Optional: add Gemini API key for real PII detection
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your_key_here
# Without a key, the app uses the built-in mock (fully functional)

npm run dev
# Backend runs on http://localhost:3001
```

### 3. Frontend setup (new terminal)

```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### 4. Open the app

Visit **http://localhost:5173**

Click **"Use sample document"** to immediately start a demo review session.

---

## Keyboard Shortcuts (during review)

| Key | Action |
|---|---|
| `Tab` / `↓` | Next span |
| `↑` | Previous span |
| `A` | Accept current redaction |
| `R` | Restore (remove false positive redaction) |
| `M` | Mark as missed PII (add redaction) |
| `D` | Dismiss suspected miss (not PII) |

---

## What I intentionally did NOT build

- **Batch processing** — this is Problem 2 (Maya), not Sam's use case
- **Export/download of redacted document** — out of scope; the correction UX is the point
- **User authentication** — adds friction without value for this prototype
- **Persistent storage** — in-memory sessions are fine for a demo; production would use a DB
- **Mobile layout** — Sam reviews documents at a desk; mobile is not his context
- **Custom PII type configuration** — complexity without proportional UX value

---

## API Reference

### `GET /api/health`
Returns backend status and whether Gemini is configured.

### `POST /api/analyze`
```json
{ "documentText": "string", "documentName": "string (optional)" }
```
Returns session with detected PII spans.

### `POST /api/corrections`
```json
{ "sessionId": "string", "corrections": [{ "spanId": "...", "action": "ACCEPTED|RESTORED|ADDED|DISMISSED", "timestamp": "..." }] }
```

### `GET /api/corrections/:sessionId`
Returns correction summary for a session.

---

## Author

**Balaji Sakthivel Marimuthu**  
Roll Number: CB.C.U4CSE23213  
Sprintfour Hackathon 2026