# Git Workflow & Release Process

This document outlines engineering standards for git usage, branching, and releases.

---

## 1. Core Philosophy: Trunk-Based Mindset

We follow a **Lightweight Feature Branch** workflow with a **Trunk-Based** mindset.

- **Main is Truth:** The `main` branch should always be deployable.
- **Short-Lived Branches:** Feature branches should live for hours or days, not weeks.
- **Frequent Merges:** Merge often to avoid "merge hell" and keep the codebase synchronized.

---

## 2. Commit Strategy: Atomic & Conventional

### A. Atomic Commits

Each commit must represent a **single, verifiable unit of work**.

- **✅ GOOD**: `fix(ui): Align button on mobile` (Changes CSS only)
- **❌ BAD**: `feat(ui): Redesign header and fix login bug` (Bundles unrelated changes)

**Why?** Atomic commits allow for safer reverts, easier code reviews, and better AI context understanding.

### B. Conventional Commits (Strict Enforcement)

We use the **Conventional Commits 1.0.0** specification.

**Format:**
```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Allowed Types:**

| Type | Description |
|:-----|:------------|
| `feat` | A new feature for the user (triggers MINOR version) |
| `fix` | A bug fix for the user (triggers PATCH version) |
| `docs` | Documentation only changes |
| `style` | Formatting, missing semi-colons (no code change) |
| `refactor` | Refactoring production code (no new features/fixes) |
| `perf` | Code change that improves performance |
| `test` | Adding or refactoring tests |
| `chore` | Build process, dependency updates, tooling |
| `ci` | CI/CD configuration files |
| `revert` | Reverting a previous commit |

**Example:**
```text
feat(events): add Discord reminder notifications

Implements webhook-based reminders for upcoming events.
Sends notifications 1 week and 1 day before events.

Closes #42
```

---

## 3. Branching & Pull Requests

### A. Branch Naming

Use descriptive, kebab-case names:
- `feat/discord-reminders`
- `fix/date-parsing`
- `refactor/event-schema`
- `docs/api-guide`

### B. Pull Request (PR) Etiquette

- **Size:** Keep PRs under 400 lines of code changes where possible.
- **Context:** The PR description must answer **Why** this change is needed, not just **What** it does.
- **Drafts:** Use "Draft" PRs for work-in-progress to get early feedback.
- **Squash & Merge:** Generally "Squash and Merge" PRs into `main` to maintain a linear history.

---

## 4. Security: Commit Signing

Verified commits ensure code integrity.

- **Requirement:** Sign commits using **GPG** or **SSH**.
- **Verification:** GitHub displays a "Verified" badge for signed commits.

**Quick Setup (SSH Signing):**
```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

---

## 5. Release & Tagging Process

We use **Semantic Versioning (SemVer)**.

### A. Versioning Rules (`MAJOR.MINOR.PATCH`)

- **MAJOR:** Breaking changes (e.g., API schema change)
- **MINOR:** New features (backward compatible)
- **PATCH:** Bug fixes

### B. Creating a Release

```bash
# See what changed since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Tag & Push
git tag -a v1.2.0 -m "Release v1.2.0: Feature Summary"
git push origin v1.2.0
```

---

## 6. Pre-Modification Safety Check

**RULE: ALWAYS check for uncommitted changes before starting work.**

```bash
git status
```

If there are existing, uncommitted changes:
1. Inform about the uncommitted changes
2. Recommend they commit or stash the changes
3. Wait for confirmation before proceeding

**Rationale:** This creates a clean restore point and prevents mixing unrelated changes.

---

## 7. Destructive Operations

**RULE: NEVER delete a file or function without explicit instruction.**

If you believe a file or function is obsolete:
1. State your reasoning for why it should be deleted
2. Ask for explicit permission
3. Do not proceed with deletion until you receive a clear "yes"

Favor refactoring or commenting out code over outright deletion if unsure.
