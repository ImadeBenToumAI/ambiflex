# Security policy

## Supported versions

Only the latest release on `main` receives fixes.

## Reporting a vulnerability

Please report a vulnerability privately through GitHub: **Security → Report a vulnerability** on this repository (private vulnerability reporting). Do not open a public issue for it.

You can expect a first answer within 7 days. Include the plugin version, what you observed, and the steps to reproduce.

## What the plugin does on your machine

Ambiflex runs inside Claude Code through its function-hooks plugin API. It reads and writes `.ambiflex/` in your project (the tree and its event log), runs `git` commands to create worktrees and branches for subagents, and calls `gh` only to read pull request status when it is installed. It makes no network calls of its own and collects no telemetry.
