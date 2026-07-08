# Parallel Workflow Guide: VolleySmart

## Worktree vs Branch vs Agent

| Concept | What it is | Analogy |
|---------|-----------|---------|
| **Branch** | A pointer to a line of commits | A bookmark in a book |
| **Worktree** | A separate folder on disk that checks out a branch | A second copy of the book, open to a different page |
| **Agent/Session** | A Claude Code instance running in a terminal | A person reading the book |

**Key insight:** You can only have ONE branch checked out per folder. A worktree gives you a second folder so you can have two branches open at the same time, no `git checkout` needed.

```
volleysmart-app/              <-- main worktree (e.g. feat/native-app-phase-0)
volleysmart-app-worktrees/
  feat-opponent-mode/         <-- second worktree (different branch, different files)
  feat-club-chat/             <-- third worktree
```

---

## How to Use Worktrees

### Create a worktree
```bash
# From the main repo directory:
git worktree add ../volleysmart-worktrees/my-feature feat/my-feature

# Or create a new branch at the same time:
git worktree add ../volleysmart-worktrees/my-feature -b feat/my-feature main
```

### Run Claude Code in a worktree
```bash
cd ../volleysmart-worktrees/my-feature
claude   # starts a session scoped to this worktree's branch
```

### List active worktrees
```bash
git worktree list
```

### Remove a worktree when done
```bash
git worktree remove ../volleysmart-worktrees/my-feature
```

### Important setup
- Copy `.env` and `.env.local` into each worktree (they're gitignored)
- Run `npm install` in each worktree (node_modules is not shared)
- Each worktree has its own working tree state, so uncommitted changes stay isolated

---

## Branch Dependencies

Some branches build on others. If Branch B was created from Branch A (not from `main`), then Branch B **depends on** Branch A. Merging B before A will bring A's changes along.

### Current VolleySmart dependency map

```
main
 |
 +-- feat/phase-9-create-event-improvements
 |    +-- feat/phase-10-quick-fixes-polish
 |         +-- feat/phase-11-club-overview
 |              +-- feat/phase-12-game-flow-unification
 |              +-- feat/notifications
 |
 +-- feat/native-app-phase-0  (active, core extraction)
 +-- feat/club-locations-management
 +-- [all merged branches: discovery, analytics, i18n, premium-gating, etc.]
```

### Rules
1. **Always branch from `main`** unless you specifically need another branch's changes
2. **Record the parent** in CLAUDE.md every time you create a branch
3. **Merge parent first** — if B depends on A, merge A to main before merging B

### How to check if a branch depends on another
```bash
# See where a branch diverged from main:
git merge-base main feat/my-feature

# See commits on your branch that aren't on main:
git log main..feat/my-feature --oneline

# See if your branch contains commits from another branch:
git log feat/other-branch..feat/my-feature --oneline
# If this shows nothing, your branch already includes other-branch's changes
```

---

## Detecting and Resolving Merge Problems

### Before merging: preview conflicts
```bash
# Dry-run merge (does NOT actually merge):
git merge --no-commit --no-ff main
git diff --cached          # see what would change
git merge --abort          # undo the dry run
```

### Common conflict scenarios

| Scenario | How to detect | How to fix |
|----------|--------------|------------|
| **Same file edited on both branches** | `git merge` shows `CONFLICT` | Open the file, look for `<<<<<<<` markers, pick the right version |
| **File moved on one branch, edited on the other** | Git says "deleted by us" or "deleted by them" | Decide: keep the move or keep the edit, then `git add` |
| **Branch A restructured files that B still references** | TypeScript errors after merge (imports fail) | Update imports to match new structure |
| **Migration ordering** | Two branches add migrations with close timestamps | Rename one migration's timestamp to be later |

### After merging: verify
```bash
# Check TypeScript compiles:
npx tsc --noEmit -p apps/web/tsconfig.app.json

# Check the app runs:
npm run dev

# Check nothing unexpected changed:
git diff main...HEAD --stat
```

---

## Parallel Agent Workflow

### Setup (one time)
```
Terminal 1:  cd volleysmart-app                              # main worktree
Terminal 2:  cd volleysmart-worktrees/feat-opponent-mode     # worktree 2
Terminal 3:  cd volleysmart-worktrees/feat-club-chat         # worktree 3
```

### Workflow
```
1. Pick independent tasks that don't touch the same files
2. Create a worktree + branch for each task
3. Run Claude Code in each terminal
4. When done, merge branches to main one at a time
5. After each merge, rebase remaining branches:
   git rebase main  (in each worktree)
```

### What can run in parallel safely

| Parallel-safe | Not parallel-safe |
|--------------|-------------------|
| Feature A touches pages + Feature B touches DB functions | Two features editing the same page |
| New page + new migration | Two migrations (timestamp collision risk) |
| i18n additions in different namespaces | Both editing the same JSON file |
| Bug fix on main + feature on branch | Refactor (moves files) + feature (edits those files) |

### The golden rule
> **Refactors and restructures (like Phase 0) should merge first.**
> Never build features in parallel with a refactor that moves the files those features touch.

---

## Quick Reference

```bash
# Create worktree for a new feature:
git worktree add ../volleysmart-worktrees/my-feature -b feat/my-feature main

# Check branch dependency:
git log main..feat/my-feature --oneline

# Preview merge conflicts:
git merge --no-commit --no-ff main && git diff --cached && git merge --abort

# After merging branch A, update branch B:
cd ../volleysmart-worktrees/branch-b
git fetch origin
git rebase origin/main

# Clean up:
git worktree remove ../volleysmart-worktrees/my-feature
```

---

## Checklist Before Starting Parallel Work

- [ ] Both tasks branch from `main` (not from each other)
- [ ] Tasks don't edit the same files (check with the plan)
- [ ] No ongoing refactor/restructure that moves files either task touches
- [ ] `.env` copied to each worktree
- [ ] `npm install` run in each worktree
- [ ] Branch names and parents recorded in CLAUDE.md
