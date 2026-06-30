# Submission Writeup — FixIt

**Participant:** Balaji Sakthivel Marimuthu · CB.C.U4CSE23213  
**Problem:** Problem 3 — Fixing the Tool's Mistakes  
**Application:** FixIt — PII Correction Experience

---

## What I Built

FixIt is a full-stack web application for reviewing and correcting AI-suggested PII redactions in documents. It addresses the specific challenge of Sam: a reviewer who moves fast, trusts the tool too much, and is most likely to cause a data leak not by ignoring the tool — but by agreeing with it without actually checking.

The application has a **3-column review layout**:
- **Left panel** — all tool-suggested redactions (false positives sorted first by confidence score)
- **Center** — the document itself with color-coded inline PII highlights
- **Right panel** — the "Danger Zone": PII the tool missed and left visible, shown with pulsing animation

Before finalizing, a **Review Gate** modal appears and explicitly lists any unchecked high-risk items — specifically missed PII and low-confidence redactions Sam hasn't reviewed. This is the design's core safety net: it turns a passive "are you sure?" into an active inventory of risks.

The entire flow also supports **keyboard shortcuts** (A to accept, R to restore, M to mark as missed PII, D to dismiss, Tab to advance) because Sam is fast and using a mouse for every action would slow him down enough to abandon the tool.

The backend is a typed Express/TypeScript API that calls Google Gemini for PII detection. 

**Advanced Human Logic Guardrails (New):**
Because AI models are non-deterministic, I built a two-stage deterministic post-processing pipeline into the backend to catch what the LLM misses:
1. **Consistency Engine:** Mathematically ensures that if an entity (e.g. "James Harrington") is redacted once, all other exact occurrences in the document are caught.
2. **Deterministic Pattern Engine:** A regex pass that guarantees SSNs, Phone Numbers, and Emails are never missed, even if the AI hallucinates. 

This proves that sound engineering judgment means not blindly trusting AI outputs, but wrapping them in solid human-coded logic.

---

## What I Intentionally Did Not Build

**Batch processing (Problem 2).** Maya's problem — 200 files in a queue — is a different mental model entirely. Mixing it into Problem 3 would dilute both experiences. Sam is reviewing *one document carefully* (or at least he should be). I kept the scope focused.

**Export / download of the redacted document.** The challenge asks for a correction *experience*. Producing a final clean document involves significant complexity (re-rendering the document with accepted redactions applied, format-preserving, etc.) that would have consumed time better spent on the core interaction design.

**Persistent storage / user accounts.** In-memory sessions are sufficient for a hackathon prototype that demonstrates the experience. A production version would use a database, but the architecture is structured to make that swap straightforward — the `documentService.ts` service layer is the only thing that would change.

**Mobile layout.** Sam is a desktop reviewer working with a multi-panel document interface. Building a mobile layout for this use case would be premature optimization.

**Custom PII type configuration.** The type taxonomy (NAME, EMAIL, PHONE, etc.) is already expressive enough for the use case. Letting users configure it adds UI complexity without a proportional UX gain.

---

*The core engineering bet in this submission: designing for Sam's failure modes, not his success case.*
