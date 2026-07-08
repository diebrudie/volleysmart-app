# Device test feedback (Expo Go)

Running log of issues flagged during on-device testing of `feat/mobile-phase3-parity`.
Each item gets a status: `open` / `fixed (commit)` / `wontfix (reason)`.

| # | Issue | Status |
|---|-------|--------|
| 1 | TopBar: title ("Events", "Clubs", "Home") floats above the avatar/notification row instead of being vertically centered with it. Cause: absolutely positioned title ignored the safe-area padding; invisible on web where inset = 0. | fixed |
| 2 | _(user re-reporting further flagged items — the original list was lost with a cleared session)_ | open |
