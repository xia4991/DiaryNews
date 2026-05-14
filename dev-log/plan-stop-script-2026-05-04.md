# Stop script plan

## Goal

Add a command that stops processes started by the project runner scripts.

## Tasks

1. Make `run-project.sh` and `run-public.sh` write PID files while running.
2. Improve runner cleanup so child processes are stopped recursively.
3. Add `stop-project.sh` to stop local or public runner processes from those PID files.
4. Document the stop command and verify shell syntax.
