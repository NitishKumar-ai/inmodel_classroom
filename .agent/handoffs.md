# Persona Handoff Guidelines

Handoffs occur when a task's primary responsibility shifts from one expert persona to another. This ensures that the incoming persona has full context and clear objectives.

## 📝 Handoff Template

When performing a handoff, the outgoing agent should add a "Handoff Memo" to the `.agent/worklog.md` with the following structure:

```markdown
### 🔄 Handoff: [Outgoing Persona] -> [Incoming Persona]
- **Status**: (e.g., Design Complete, Implementation Blocked)
- **Artifacts**: (Links to any newly created files or plans)
- **Crucial Context**: (Specific logic, edge cases, or design decisions)
- **Next Steps**: (Immediate actions for the incoming persona)
```

## 🚥 Common Handoff Triggers

| Trigger Event | Outgoing | Incoming |
| :--- | :--- | :--- |
| Implementation Plan Approved | Architect | Backend/Frontend Lead |
| UI Component Built (Static) | Frontend Wizard | Backend Lead (Logic Hookup) |
| Code Complete | Implementation Lead | Security Auditor (Review) |
| Feature Verified | Auditor | Architect (Merge/Finalize) |

## ✅ Acceptance Criteria for Incoming Persona

1.  Read the Handoff Memo in `worklog.md`.
2.  Verify existence and content of mentioned artifacts.
3.  Synchronize the current `task.md` checklist.
4.  Proceed with the "Next Steps."
