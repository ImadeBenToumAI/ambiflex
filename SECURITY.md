# Security policy

## Supported versions

Only the latest release on `main` receives fixes.

## Reporting a vulnerability

Please report a vulnerability privately through GitHub: **Security → Report a vulnerability** on this repository (private vulnerability reporting). Do not open a public issue for it.

You can expect a first answer within 7 days. Include the plugin version, what you observed, and the steps to reproduce.

## What the plugin does on your machine

Ambiflex runs inside Claude Code through its function-hooks plugin API, with the plugin's own privileges: Claude Code's tool permissions govern the model's tool calls, not code the plugin runs itself. The plugin:

- reads and writes `.ambiflex/` in your project (the tree and its event log, derived state that is git-ignored);
- runs `git` for worktrees and branches, `gh` to read pull request status when installed, and `python3` for the local page only when you run `/ambiflex local`, always from an argument vector, never through a shell;
- keeps the local page's server, key and button queue in `~/.claude/ambiflex-runtime/<project id>/` (user-only), never in the repository; the session takes a queued action only while it runs its own local page and only when the action carries that page's key, so a file shipped in a repository can never act as an instruction;
- syncs the tree to a private claude.ai page only after you publish one (`/ambiflex page`), and to the account hub only for projects you joined (`/ambiflex hub join`); activity labels hold a tool name and the task's description, never raw commands, URL queries or credential-like text;
- sends no network request of its own unless you turn on adoption counting (off by default).

See [PRIVACY.md](PRIVACY.md) for what each of these sends, where and how to turn it off.
