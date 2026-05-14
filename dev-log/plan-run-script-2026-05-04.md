# One-command project runner plan

## Goal

Add a repo-local command that starts the DiaryNews backend and frontend together for local development.

## Tasks

1. Create a root shell script that validates prerequisites, starts `python main.py`, starts Vite, and stops both processes on exit.
2. Support optional dependency installation through an explicit flag instead of doing network work unexpectedly.
3. Document the command in the README.
4. Run lightweight verification for script syntax and frontend lint.
