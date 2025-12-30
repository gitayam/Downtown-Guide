# Safe Code Modification Policy

Guidelines for preventing accidental data loss or out-of-scope modifications when making changes to a codebase.

---

## 1. Principle of Minimal Scope

**RULE: ONLY modify files and functions that are DIRECTLY related to the assigned task.**

Under no circumstances should you delete, remove, or significantly alter code that is not explicitly part of the request.

**Example of a VIOLATION:**
- **Request:** "Add a feature to upload a photo and assign it to participants."
- **Incorrect Action:** Deleting an unrelated `email` function while implementing the photo feature.

**Why This Is Critical:**
Codebases have many interconnected parts. Deleting a function that seems unused might break:
- A scheduled task
- A different frontend
- An admin portal
- A webhook handler

---

## 2. Pre-Modification Safety Check (Git)

**RULE: ALWAYS check for uncommitted changes before starting work.**

Before beginning any task that involves modifying code, you **MUST** run:

```bash
git status
```

If there are existing, uncommitted changes, you must:
1. **Inform** about the uncommitted changes
2. **Strongly recommend** committing or stashing the changes
3. **Wait for confirmation** before proceeding

**Rationale:**
- Creates a clean restore point
- Mistakes can be reverted using `git checkout` or `git reset`
- Prevents mixing unrelated changes into a single commit
- Protects ongoing work

---

## 3. Destructive Operations Require Explicit Consent

**RULE: NEVER delete a file or function without explicit instruction.**

If you believe a file or function is obsolete and should be deleted:
1. State your reasoning for why it should be deleted
2. Ask for explicit permission
3. Do not proceed with deletion until you receive a clear "yes" or "go ahead"

**Favor refactoring or commenting out code over outright deletion if uncertain.**

---

## 4. Read Before Modify

**RULE: NEVER propose changes to code you haven't read.**

If asked to modify a file:
1. Read the entire file first
2. Understand the context and dependencies
3. Identify potential side effects
4. Only then propose changes

---

## 5. Avoid Over-Engineering

**RULE: Only make changes that are directly requested or clearly necessary.**

Keep solutions simple and focused:
- Don't add features beyond what was asked
- Don't refactor surrounding code unless requested
- A bug fix doesn't need surrounding code "cleaned up"
- A simple feature doesn't need extra configurability
- Don't add docstrings, comments, or type annotations to code you didn't change

**Three similar lines of code is better than a premature abstraction.**

---

## 6. No Backwards-Compatibility Hacks

**RULE: Avoid compatibility shims for removed code.**

Don't do these when removing code:
- Renaming unused variables to `_var`
- Re-exporting types "for compatibility"
- Adding `// removed` comments
- Creating empty placeholder functions

**If something is unused, delete it completely.**

---

## Summary Checklist

Before making any code changes:

- [ ] Run `git status` to check for uncommitted work
- [ ] Read all files you'll be modifying
- [ ] Confirm changes are within scope of the request
- [ ] Get explicit permission before any deletions
- [ ] Keep changes minimal and focused
- [ ] Don't add unnecessary abstractions or features
