# Privacy

Ambiflex is a Claude Code plugin published by Imade Ben Toum (ImadeBenToumAI on GitHub). This page says what it sends, where, when, and how to turn each part off. Questions or deletion requests: open a private report under **Security → Report a vulnerability** on this repository, or contact ImadeBenToumAI on GitHub.

## Nothing leaves your machine by default

With the default settings, Ambiflex keeps its data in your project (`.ambiflex/`) and in your home folder (`~/.claude/`). It sends data to a remote service only in the cases below, each of which you start yourself.

| What | When | Where it goes | What is in it | How to stop it |
| --- | --- | --- | --- | --- |
| Adoption count | Only if you turn on **Adoption counting** (`installPing: true`). Off by default. | GitHub (public release `install-ping` of this repository) | A download of an empty file: one the first time it runs under your home folder, one per ISO week while you use it. No account, project, path, content or identifier. GitHub, like for any download, receives your IP address and the time of the request. The maintainer sees only download totals. | Leave the setting off. Also off with `AMBIFLEX_NO_PING=1`, `DO_NOT_TRACK=1`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`, and in cloud sessions. |
| Project page | After you run `/ambiflex page` in a project | A private claude.ai page in your own Claude account | The tree: goal, nodes, summaries, proofs and verification commands, costs and estimates, live activity labels (tool name and the task's description, never raw commands, URLs with queries or credential-like text), recent commit subjects and authors, skill and brain descriptions, usage metadata. | Do not publish a page, or delete it in claude.ai. `/ambiflex doctor` says whether the session syncs. |
| Account hub | After you run `/ambiflex hub join` (or publish the hub) in a project | The private claude.ai page "Ambiflex Hub" in your own account | For each joined project: name, goal, progress, alerts, background tasks, cost, page link, "local session" or the cloud session link. Never the folder path; the machine name only with `hubShowMachine: true`. The project switcher of each joined project's page lists the other joined projects (names, links, states). | `/ambiflex hub leave` removes the project's card. Join only projects that may be listed together. |
| Infrastructure map | After you ask Claude to map a project's infrastructure (`tree_infra`) | The project's private claude.ai page (doc `infra/current`); the official icon packs are downloaded once from AWS, Microsoft and Google | Resource names and types, regions, networks, IPs and CIDRs, flows, risks, IAM bindings and secret names (never secret values). IPs, CIDRs and provider ids are masked on the page until you press Unmask. The icon downloads are ordinary GET requests to the providers. | Do not call `tree_infra`; delete `.ambiflex/infra.json`. |
| Page assets | When a page opens in your browser | Google Fonts and jsDelivr | Your browser's ordinary request for fonts and scripts. | Use `/ambiflex local` (served from your machine; it still loads those assets today). |

## On your machine only

- `.ambiflex/log.jsonl` and `.ambiflex/tree.json`: the tree (meant to be committed with the project if you wish).
- `.ambiflex/docs/`, `live.json` and similar: derived state, git-ignored.
- `~/.claude/ambiflex-runtime/<project id>/`: the local page's server, key and button queue, readable by you only. Never in the repository.
- `~/.claude/ambiflex-runtime/icons/`: the providers' icon packs, downloaded from them at run time, never bundled in the repository.
- `.ambiflex/infra.json`: the infrastructure map.
- `/ambiflex backfill` reads Claude Code's local session files to rebuild usage, model and skill history; it runs only when you call it and sends nothing anywhere except what the project page already shows.
- `~/.claude/ambiflex-installed`, `~/.claude/ambiflex-week`: written only if you turned adoption counting on.

## Retention and deletion

The maintainer keeps only GitHub's download totals. Your pages live in your Claude account until you delete them. Deleting `.ambiflex/` and `~/.claude/ambiflex-*` removes everything the plugin stored on your machine.

## What the counts mean

Download totals are estimates of participating profiles, not unique machines or people: several profiles, a reset marker or a manual download each add one. Repository traffic (clones and views) comes from GitHub's aggregate traffic API and identifies no one.
