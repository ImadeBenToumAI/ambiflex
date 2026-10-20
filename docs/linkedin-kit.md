# Ambiflex on LinkedIn: newsletter kit

The campaign runs on your LinkedIn newsletter, one edition a week, article 1 today (19 October 2026). Each edition is one of the four articles (`docs/articles/`, editable copy in the Claude doc "Ambiflex launch articles"), plus a short post the same morning that points to it. Everything below is ready to paste; the anecdote and the signature are yours.

## 1. Calendar

| Edition | Date | Article | Cover image | Companion post |
|---|---|---|---|---|
| 1 | Mon 19 Oct | "Done" means nothing when an agent says it | `assets/launch/04-proof.png` | §3 |
| 2 | Mon 26 Oct | My estimates were off by a factor of 100, in the wrong direction | `assets/launch/07-cost.png` | §6 |
| 3 | Mon 2 Nov | Running three agents like a chess engine | `assets/launch/05-search.png` | §6 |
| 4 | Mon 9 Nov | What I learned building a plugin on Claude Code's function-hooks API | `assets/launch/02-tree.png` | §6 |

Publish between 8:00 and 10:00 Paris time. LinkedIn sends the newsletter to subscribers by notification and email at publication; the post the same morning reaches the people who are not subscribed. Reply to every comment within 24 h, and tell Claude the substantive ones: each becomes a node in the tree.

## 2. Edition 1, today

**Title (under 100 characters):** "Done" means nothing when an agent says it

**Subtitle:** I put one rule from Felix Rieseberg's ambition tutorial into software. Here is what changed.

**Cover:** `assets/launch/04-proof.png` (1920×1080; LinkedIn crops to 1280×720, the panel stays readable). Alternative: the film's first frame, `assets/launch/01-logo.png`.

**Body:** article 1, from the Claude doc once the anecdote is written and the piece signed. LinkedIn's editor takes headings, bold, italics, bullet and numbered lists, links and images; it has no tables and no code blocks, so paste the code names as plain text (they are short). Insert the figure where the italic *[Figure…]* note sits, then delete the note.

**Closing block (paste as the last paragraph):**

> Ambiflex is open source: github.com/ImadeBenToumAI/ambiflex. One line installs it in Claude Code: `/plugin install ambiflex --marketplace ImadeBenToumAI/ambiflex`. The 104-second film is in the repository. Next week: why my estimates were off by a factor of 100, in the wrong direction.

**Before you press Publish:** the anecdote at the top is yours (two or three sentences, something that happened to you); the byline is you; the figure is inserted; the closing block is there; the film link opens.

## 3. Companion post, edition 1 (same morning, link to the edition in the first comment or at the end)

English:

> An agent told me "done" and the test failed. Nothing about the word had changed.
>
> Felix Rieseberg's ambition tutorial has one line I kept coming back to: don't let the model grade its own work. I turned it into a rule inside Claude Code: a task is not "done" until it names the test or metric that proved it. Otherwise it waits for review, and only I can validate.
>
> Three things changed in practice, and one number surprised me (the agent finishes a "2-day" task in about 10 minutes). It is all in this week's edition, with the code.
>
> 👇 link in the first comment

French:

> Un agent m'a dit « done ». Le test a échoué. Le mot n'avait pas changé entre le moment où il était vrai et celui où il ne l'était plus.
>
> Dans le tutoriel de Felix Rieseberg (Anthropic) sur l'ambition avec les modèles, une phrase : ne laissez pas le modèle noter son propre travail. J'en ai fait une règle dans Claude Code : une tâche n'est « terminée » que si elle nomme le test ou la métrique qui l'a prouvée. Sinon elle attend une relecture, et je suis le seul à valider.
>
> Trois choses ont changé, et un chiffre m'a surpris : l'agent finit en dix minutes ce que j'avais estimé à deux jours. Tout est dans l'édition de cette semaine, code compris.
>
> 👇 lien en premier commentaire

Hashtags (three to five, at the end of the post, not in the newsletter): #ClaudeCode #AIAgents #DeveloperTools #OpenSource #Anthropic

First comment: the edition's link, then "Install: /plugin install ambiflex --marketplace ImadeBenToumAI/ambiflex".

## 4. Tagging

In the post, tag Felix Rieseberg only if the piece quotes his tutorial accurately (it does) and once, in the first line, not in every edition. Tag Anthropic's page in edition 4 only, the one written for the team.

## 5. Brief for the session with LinkedIn access

Give the session this brief, word for word, after linking it to your computer so Claude in Chrome can read LinkedIn in your browser:

> Read my last ten LinkedIn posts and my last three newsletter editions (do not post, like or message anything). Note: the language I write in, the average length, how I open (question, anecdote, number), whether I use emoji and how many, how I sign off, and three phrases I use often. Then open the Claude doc "Ambiflex launch articles" and, in article 1, replace the bracketed opening with an anecdote in my voice drawn from what you read; if nothing in my posts fits, leave two candidate anecdotes as a comment on that paragraph instead of inventing one. Adjust the rest of article 1 to my tone without changing any number or any claim. Add my sign-off at the end. Do not touch articles 2 to 4 yet; list what you would change in them as a comment on each title.

What the session must not do: post on my behalf, change figures, send messages, or read my LinkedIn inbox.

## 6. Companion posts, editions 2 to 4 (to adapt to your voice once the first one is out)

Edition 2:

> Project folklore says: whatever the engineer estimates, multiply by two. I measured the multiplier on an agent's work. It was 0.01. A "2-day" task, done in 9 minutes. The unit was wrong, not the estimate. This week's edition: the table, the bug it caused ($15,600 projected instead of a few hundred), and what I changed in how I estimate.

Edition 3:

> A chess engine does not ask one grandmaster for the best move. It explores several lines at once, scores them with the same evaluation, cuts the weak ones. I ran three coding agents that way on one parser: three branches, one benchmark, scores 3.15 / 6.66 / 7.3, then I ran the benchmark myself before merging. 334 ms to 44 ms. The whole run, reproducible, in this week's edition.

Edition 4:

> I built a plugin on Claude Code's new function-hooks API in one evening. Nine things worked better than expected, six I would ask the team for, every point with a commit behind it. This week's edition is the field notes, written for the people who build the API as much as for the people who use it.

## 7. Newsletter-specific edits to the articles

- Article 2's table (node, estimate, actual, ratio) becomes a four-line list in the LinkedIn editor.
- Article 3's two tables become lists too; keep the numbers in the same order.
- Links stay as plain URLs; LinkedIn makes them clickable.
- Each edition ends with the closing block of §2, with "Next week:" updated (edition 4: "This was the last of the series; the repository is where it continues").
