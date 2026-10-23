#!/usr/bin/env python3
"""Split a shared Ambiflex tree at the root of a repository into one tree per project folder.

When several Claude Code sessions are opened at the root of the same repository, they share one
.ambiflex folder there. This script moves each session's work into the project folder it belongs to,
attaches each session to that folder (~/.claude/ambiflex-sessions.json, read by Ambiflex 0.21+), and
removes the root .ambiflex after a backup. Python 3 standard library only.

  python3 ambiflex-split.py <repo>                                  # look: sessions, goals, nodes, pages
  python3 ambiflex-split.py <repo> --assign SID=folder ... [--page folder=URL ...]           # dry run
  python3 ambiflex-split.py <repo> --assign SID=folder ... [--page folder=URL ...] --apply   # do it

SID is the 6-character session id shown by the first command. Every session of the log must be assigned
(or left out with --drop SID). Nothing is changed without --apply; the root .ambiflex is copied to
~/.claude/ambiflex-backups/ before anything is removed.
"""
import argparse
import datetime
import json
import os
import shutil
import sys


def read_log(path):
    events = []
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                events.append((line, json.loads(line)))
            except ValueError:
                pass  # a damaged line is left behind, as the plugin's own reader does
    return events


def describe(events):
    """Per session: event count, goals set, a few node titles."""
    by = {}
    for _, e in events:
        s = by.setdefault(e.get('s', '?'), {'n': 0, 'goals': [], 'titles': [], 'first': e.get('t', ''), 'last': e.get('t', '')})
        s['n'] += 1
        s['last'] = max(s['last'], e.get('t', ''))
        if e.get('kind') == 'goal' and e.get('goal'):
            s['goals'].append(e['goal'])
        title = (e.get('input') or {}).get('title')
        if title and title not in s['titles']:
            s['titles'].append(title)
    return by


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('repo')
    ap.add_argument('--assign', action='append', default=[], metavar='SID=folder')
    ap.add_argument('--drop', action='append', default=[], metavar='SID')
    ap.add_argument('--page', action='append', default=[], metavar='folder=URL')
    ap.add_argument('--apply', action='store_true')
    a = ap.parse_args()

    repo = os.path.abspath(a.repo)
    root = os.path.join(repo, '.ambiflex')
    log = os.path.join(root, 'log.jsonl')
    if not os.path.exists(log):
        sys.exit(f'No shared tree: {log} does not exist. Nothing to split.')
    events = read_log(log)
    sessions = describe(events)
    art = {}
    if os.path.exists(os.path.join(root, 'artifact.json')):
        try:
            art = json.load(open(os.path.join(root, 'artifact.json'), encoding='utf-8'))
        except ValueError:
            art = {}

    print(f'Shared tree: {log}  ({len(events)} events, {len(sessions)} sessions)')
    for sid, s in sorted(sessions.items(), key=lambda kv: kv[1]['first']):
        print(f'\n  session {sid}: {s["n"]} events, {s["first"][:10]} to {s["last"][:10]}')
        for g in s['goals'][-2:]:
            print(f'    goal: {g[:100]}')
        for t in s['titles'][:6]:
            print(f'    node: {t[:90]}')
    if art.get('url'):
        print(f'\n  page recorded at the root: {art["url"]} (project "{art.get("project", "?")}")')
    folders = sorted(d for d in os.listdir(repo) if os.path.isdir(os.path.join(repo, d)) and not d.startswith('.'))
    print(f'\n  folders in the repository: {", ".join(folders)}')

    if not a.assign:
        print('\nNext: assign every session to its project folder, e.g.\n  python3 ambiflex-split.py '
              f'{a.repo} --assign {next(iter(sessions), "abc123")}=stt-tashelhit --assign <SID>=new-toum-pay-platform '
              '--page stt-tashelhit=https://claude.ai/artifact/... --apply')
        return

    assign = {}
    for item in a.assign:
        sid, _, folder = item.partition('=')
        if not folder:
            sys.exit(f'--assign {item}: expected SID=folder.')
        if not os.path.isdir(os.path.join(repo, folder)):
            sys.exit(f'--assign {item}: no folder {os.path.join(repo, folder)}.')
        assign[sid] = folder
    pages = {}
    for item in a.page:
        folder, _, url = item.partition('=')
        if not url.startswith('https://claude.ai/'):
            sys.exit(f'--page {item}: expected folder=https://claude.ai/... .')
        pages[folder] = url
    unknown = [s for s in assign if s not in sessions]
    if unknown:
        sys.exit(f'Unknown session ids: {", ".join(unknown)} (the log has {", ".join(sessions)}).')
    left = [s for s in sessions if s not in assign and s not in a.drop]
    if left:
        sys.exit(f'Every session must be assigned or dropped; not yet: {", ".join(left)}.')

    plan = {}
    for line, e in events:
        folder = assign.get(e.get('s', '?'))
        if folder:
            plan.setdefault(folder, []).append(line)
    stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    home = os.path.expanduser('~')
    backup = os.path.join(home, '.claude', 'ambiflex-backups', f'{os.path.basename(repo)}-{stamp}')
    mapping_file = os.path.join(home, '.claude', 'ambiflex-sessions.json')

    # A node created by one session and changed by a session going to another folder would arrive half there.
    owners = {}
    for _, e in events:
        nid = (e.get('input') or {}).get('id')
        if nid and assign.get(e.get('s')):
            owners.setdefault(nid, set()).add(assign[e['s']])
    shared = sorted(n for n, f in owners.items() if len(f) > 1)
    if shared:
        print(f'\nWarning: nodes changed by sessions of different projects: {", ".join(shared)}. Each project gets the events of'
              ' its own sessions; check those nodes in both trees after the split.')

    print('\nPlan:')
    for folder, lines in plan.items():
        target = os.path.join(repo, folder, '.ambiflex', 'log.jsonl')
        exists = os.path.exists(target)
        print(f'  {folder}/.ambiflex/log.jsonl  <- {len(lines)} events{" (added to its existing tree)" if exists else ""}'
              f'{"; page " + pages[folder] if folder in pages else ""}')
    for sid in a.drop:
        print(f'  session {sid}: dropped (kept only in the backup)')
    print(f'  sessions attached in {mapping_file}: ' + ', '.join(f'{s} -> {f}' for s, f in assign.items()))
    print(f'  root .ambiflex copied to {backup}, then removed')
    # Never delete live git worktrees: the plugin puts each explored node's worktree under .ambiflex/worktrees/.
    wt_root = os.path.join(root, 'worktrees')
    live = []
    if os.path.isdir(wt_root):
        for dirpath, dirnames, filenames in os.walk(wt_root):
            if '.git' in filenames or '.git' in dirnames:
                live.append(os.path.relpath(dirpath, repo))
                dirnames[:] = []
    if live:
        print('\nStop: the root .ambiflex holds git worktrees that git still knows about:\n  ' + '\n  '.join(live) +
              '\nCommit or stash their changes, then for each one: git worktree remove <path> (or git worktree move it'
              ' out of .ambiflex/), run from the repository it belongs to. Then run this script again.')
        sys.exit(1)

    if not a.apply:
        print('\nDry run: nothing changed. Add --apply to do it.')
        return

    shutil.copytree(root, backup)
    for folder, lines in plan.items():
        d = os.path.join(repo, folder, '.ambiflex')
        os.makedirs(d, exist_ok=True)
        target = os.path.join(d, 'log.jsonl')
        have = set()
        if os.path.exists(target):
            have = {l.strip() for l in open(target, encoding='utf-8') if l.strip()}
        with open(target, 'a', encoding='utf-8') as f:
            for line in lines:
                if line not in have:
                    f.write(line + '\n')
        for name in ('.gitattributes', '.gitignore'):
            src = os.path.join(root, name)
            if os.path.exists(src) and not os.path.exists(os.path.join(d, name)):
                shutil.copy(src, os.path.join(d, name))
        if not os.path.exists(os.path.join(d, '.gitattributes')):
            open(os.path.join(d, '.gitattributes'), 'w').write('log.jsonl merge=union\n')
        if folder in pages:
            json.dump({'url': pages[folder], 'project': folder}, open(os.path.join(d, 'artifact.json'), 'w'))
        elif art.get('url') and art.get('project') == folder:
            json.dump(art, open(os.path.join(d, 'artifact.json'), 'w'))
        stale = os.path.join(d, 'tree.json')
        if os.path.exists(stale):
            os.remove(stale)  # the plugin rebuilds the snapshot from the log at the next session
    mapping = {}
    if os.path.exists(mapping_file):
        try:
            mapping = json.load(open(mapping_file, encoding='utf-8'))
        except ValueError:
            mapping = {}
    for sid, folder in assign.items():
        mapping[sid] = os.path.join(repo, folder)
    os.makedirs(os.path.dirname(mapping_file), exist_ok=True)
    json.dump(mapping, open(mapping_file, 'w'), indent=2)
    shutil.rmtree(root)
    print('\nDone. In each session: /reload-plugins (Ambiflex 0.21 or later), then /ambiflex project to check'
          ' which folder it uses, then /ambiflex page so it publishes and watches its own page.'
          f'\nBackup: {backup}')


if __name__ == '__main__':
    main()
