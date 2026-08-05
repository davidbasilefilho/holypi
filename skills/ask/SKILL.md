---
name: ask
description: Elicits material user decisions with concise choices or explicit handoffs. Use when an answer materially changes the result and cannot be derived safely.
---
# Ask

Investigate first. Ask only for missing authority, preference, credentials, or a user-only action that materially changes the result. Use `holy_ask`; state the issue and consequence in the question. Choices must be distinct, concise, and consequence-bearing. For a user-only action set `handoff: true` and state the completion signal. Do not ask for rhetorical confirmation or expose implementation trivia.
