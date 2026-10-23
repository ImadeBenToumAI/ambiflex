# Ambiflex · kit vidéo LinkedIn (Astra) · 22 octobre 2026

Trois livrables : la cible et l'angle, le post (deux sections), le script de la vidéo scène par scène avec les écrans à donner à Astra. Les captures sont dans `screens/` (4K, 3840×2160, thème sombre, plus un plein écran clair).

## 1. La cible et l'angle

**Qui** : les développeurs, tech leads et fondateurs qui utilisent déjà Claude Code (ou Cursor, Codex) au quotidien et laissent des agents travailler seuls de plus en plus longtemps. Sur LinkedIn, ils lisent sur mobile, entre deux réunions, et s'arrêtent sur une phrase qui décrit un problème qu'ils ont vécu la veille.

**Ce qui leur fait mal** (dans l'ordre où ils le ressentent) :
1. L'agent dit « c'est fait » et ce n'est pas vrai : rien ne distingue un vrai « fini » d'un « fini » déclaré.
2. On perd le fil : plusieurs agents, plusieurs sessions, et personne ne sait qui fait quoi ni où en est le plan.
3. L'agent traite la tâche, pas le problème : il corrige le bug demandé et passe à côté de ce qu'il fallait vraiment.
4. Le coût est opaque, y compris celui des outils qu'on ajoute autour de l'agent.

**L'angle** : Ambiflex ne fait pas aller Claude plus vite ; il lui donne de la **hauteur** (viser le but derrière la demande), de la **maîtrise** (rien n'est « fini » sans preuve) et de la **visibilité** (on voit le plan vivre, en direct). Un mot porte la vidéo : **prendre de l'altitude**.

**Les chiffres qu'on peut dire, parce qu'ils sont vrais** (tous sortent des captures ou des mesures du 22/10) :
- Un plan réel de 14 nœuds tenu par Claude sur ce projet ; 101 commits, 13 fusions, visibles dans l'onglet Git.
- 38 % du travail « fait », mais seulement 28 % « prouvé » : la page montre l'écart au lieu de le cacher.
- Une revue « Take altitude » : 6 propositions, chacune avec ce qu'elle ferait gagner en preuve (+10, +8, +7, +5, +3, +2 points).
- Le coût d'Ambiflex lui-même, mesuré par un test A/B (même tâche, 3 + 3 passes) : invisible quand l'arbre est peu utilisé, **+29 %** quand Claude tient l'arbre à chaque étape, sur une petite tâche. La page l'affiche en direct.
- 74 tests automatisés ; open source ; une ligne pour l'installer.

**À ne pas dire** : un pourcentage d'économie du routage des modèles. Sur ce plan réel (surtout du marketing, donc des nœuds « risqués » qui restent sur les gros modèles), le routage ne fait gagner que 3 %, et la page le dit. L'économie dépend du plan ; la mettre en avant serait faux pour beaucoup de lecteurs.

## 2. Le post LinkedIn

À publier entre 8 h et 10 h (heure de Paris), la vidéo en natif (pas un lien YouTube), le lien du dépôt en premier commentaire. Sous-titres incrustés : 80 % des vidéos LinkedIn sont regardées sans le son.

### Version française

> Votre agent vous a déjà dit « c'est fait »… alors que le test échouait ?
>
> J'utilise Claude Code tous les jours. Le problème n'est plus la vitesse : il finit en dix minutes ce que j'estimais à deux jours. Le problème, c'est la maîtrise. Plusieurs agents en parallèle, un plan qui bouge, et une question qui revient : qu'est-ce qui est vraiment fini ?
>
> J'ai construit Ambiflex pour ça. Un plugin open source pour Claude Code qui fait trois choses :
>
> 🎯 Il fait viser le but derrière la demande. Avant de coder, Claude pose le but, puis trois pistes : l'altitude (le résultat durable), la profondeur (ce que ferait le meilleur expert), l'étendue (ce que d'autres métiers apportent).
>
> ✅ Rien n'est « fini » sans preuve. Une tâche nomme le test ou la mesure qui l'a prouvée, sinon elle attend ma relecture. Sur mon plan : 38 % fait, 28 % prouvé. L'écart est affiché, pas caché.
>
> 🛰️ « Take altitude ». Un clic, et le modèle le plus fort prend du recul sur tout le plan et propose des changements, chacun avec ce qu'il ferait gagner. J'accepte ou je refuse.
>
> Et je vois tout en direct : l'arbre, les agents qui travaillent, chaque événement qui passe, l'historique Git, le « cerveau » du projet.
>
> Dernière chose, parce que la confiance compte : Ambiflex affiche ce qu'il coûte lui-même. Je l'ai mesuré avec et sans, sur la même tâche : +29 % quand Claude tient l'arbre à chaque étape. C'est le prix de la maîtrise, et il est à l'écran.
>
> ⚙️ L'installer, en une ligne, dans Claude Code :
> /plugin install ambiflex --marketplace ImadeBenToumAI/ambiflex
>
> Dans l'app desktop : + à côté de la zone de saisie → Plugins → Add marketplace « ImadeBenToumAI/ambiflex » → Add plugin « ambiflex ».
> Puis : /ambiflex page pour la page en ligne, ou /ambiflex local pour la page sur votre machine.
>
> C'est gratuit et open source. Le lien est en commentaire 👇
>
> #ClaudeCode #AIAgents #DeveloperTools #OpenSource #Anthropic

**Premier commentaire** : « Le dépôt : github.com/ImadeBenToumAI/ambiflex. La méthode vient du tutoriel de Felix Rieseberg (Anthropic) sur l'ambition avec les modèles. Dites-moi ce qui vous manque : chaque retour devient un nœud dans l'arbre. »

### English version (same structure, for a second post or the comments)

> Has your agent ever told you "done" while the test was failing?
>
> I use Claude Code every day. Speed is no longer the problem: it finishes in ten minutes what I estimated at two days. Control is. Several agents in parallel, a plan that moves, and one question: what is actually finished?
>
> So I built Ambiflex, an open-source plugin for Claude Code:
>
> 🎯 It aims at the goal behind the ask: a goal, then three tracks (altitude, depth, range) before any code.
> ✅ Nothing is "done" without proof: the test or metric that proved it, or it waits for my review. My plan: 38 % done, 28 % proven, and the page shows the gap.
> 🛰️ "Take altitude": one click, the strongest model steps back over the whole plan and proposes changes, each with what it would gain. I accept or refuse.
>
> I see it all live: the tree, the agents at work, every event, the Git history, the project's brain.
>
> And it shows its own cost. Measured with and without, same task: +29 % when Claude keeps the tree at every step. That is the price of control, and it is on screen.
>
> ⚙️ Install, one line, in Claude Code:
> /plugin install ambiflex --marketplace ImadeBenToumAI/ambiflex
>
> Free and open source. Link in the first comment 👇

## 3. Le script vidéo pour Astra

**Format** : 16:9 1920×1080 (garder une zone sûre centrale 1:1 pour le recadrage mobile), 60 à 70 secondes, sous-titres incrustés, musique électronique calme qui monte à la scène 5. Thème sombre, fond quasi noir (#08090A), texte blanc, accents : bleu altitude #4C9AFF, turquoise profondeur #26B5A5, orange étendue #F2994A, vert preuve #4CB782. Police : Inter (titres 600), JetBrains Mono (commandes).

**Style 3D** : les captures sont des panneaux de verre flottants dans un espace sombre, avec une légère profondeur de champ ; la caméra glisse entre eux. Jamais d'interface inventée : on anime les vraies captures (zoom, parallaxe, surbrillance), on n'en dessine pas de nouvelles.

| # | Durée | Écran (fichier) | Mouvement 3D et animation | Texte à l'écran | Voix off |
|---|---|---|---|---|---|
| 1 | 0:00–0:05 | Logo (`assets/brand/ambiflex-symbol-white@2x.png` du dépôt) | Le symbole se construit en 3D sur fond noir, une lueur bleue passe dessus. | **Ambiflex** · Prenez de l'altitude. | « Votre agent code vite. Mais est-ce qu'il vise juste ? » |
| 2 | 0:05–0:12 | `A1-tree-strip.png`, puis `01-tree.png` | Plongée depuis le haut sur l'arbre ; les nœuds s'allument un à un de gauche à droite, les liens se tracent. | Un objectif. Des pistes. Des étapes. | « Ambiflex donne un plan à Claude Code : le but derrière la demande, puis trois pistes, l'altitude, la profondeur, l'étendue. » |
| 3 | 0:12–0:20 | `A7-proof-on-node.png` (la ligne « verified by claude plugin test: 48 pass ») | Zoom lent sur la fiche du nœud ; la ligne de preuve s'illumine en vert, une coche se pose. | Rien n'est fini sans preuve. | « Une tâche n'est pas finie parce que l'agent le dit. Elle nomme le test qui l'a prouvée. Sinon, elle attend ma relecture. » |
| 4 | 0:20–0:26 | `A2-header-proof-feed.png` (« 38 % done », « 28 % proven ») | Les deux chiffres se détachent en 3D et se placent côte à côte ; l'écart entre eux est souligné. | 38 % fait · 28 % prouvé | « Fait, ou prouvé : la page montre l'écart, au lieu de le cacher. » |
| 5 | 0:26–0:38 | `A5a-take-altitude-before.png` → `A5b-take-altitude-after-click.png` → `01-tree.png` vu de très haut | **La scène signature.** Un curseur clique sur « Take altitude ». La caméra s'élève verticalement : l'arbre rétrécit, devient une carte vue du ciel, des courbes de niveau apparaissent autour des nœuds, comme un relief survolé. Une silhouette au sommet d'une crête regarde la carte. | Prendre de l'altitude. Réimaginer tout le problème. | « Et quand on est perdu dans les détails, un clic : Take altitude. Le modèle le plus fort prend du recul sur tout le plan, et réimagine le problème. » |
| 6 | 0:38–0:46 | `A6-strategy-review.png` | La caméra redescend sur la revue ; les 6 propositions entrent une à une ; leurs gains « +10 pts », « +8 pts »… s'allument en vert. Un clic sur « Accept » fait vibrer la ligne. | 6 propositions · chacune chiffrée · je décide | « Il propose. Chaque changement dit ce qu'il ferait gagner. J'accepte, ou je refuse. » |
| 7 | 0:46–0:53 | `A4-working-agents.png`, `A3-live-feed-corner.png` | Panneau de gauche : les puces des agents pulsent (« Bash: python3… », « Read: docs/… »). En haut à droite, le flux défile : « Work starts », « Node done », « Your turn ». | En direct : qui fait quoi, maintenant. | « Je vois tout en direct : les agents au travail, chaque événement, à la seconde. » |
| 8 | 0:53–0:58 | `A9-brain-core.png`, puis `A10-git-lanes.png` en arrière-plan | Le cerveau tourne lentement en 3D, les liens pulsent ; derrière, les voies Git défilent vers le haut. | Le cerveau du projet · son histoire | « Le cerveau du projet, ses compétences, sa mémoire. Et toute son histoire. » |
| 9 | 0:58–1:04 | `06-overhead.png` (le panneau « What Ambiflex adds to this session ») | Zoom sur la ligne « +29 % » de la note de calibration ; un cadran de transparence se remplit. | Son propre coût, mesuré : +29 % | « Et parce que la confiance compte : Ambiflex affiche ce qu'il coûte lui-même. Mesuré, avec et sans. » |
| 10 | 1:04–1:10 | Fond noir, logo, ligne d'installation | La commande se tape lettre par lettre en JetBrains Mono ; le logo revient. | `/plugin install ambiflex --marketplace ImadeBenToumAI/ambiflex` · Open source · github.com/ImadeBenToumAI/ambiflex | « Ambiflex. Open source, une ligne pour l'installer. Prenez de l'altitude. » |

### Ce qu'il faut dire à Astra (à coller tel quel dans son prompt)

> Make a 65-second 16:9 product film for a developer tool called Ambiflex, a plugin for Claude Code. Dark, premium, calm. The provided screenshots are the real interface: show them as floating glass panels in a dark 3D space and animate them with camera moves, parallax, zooms and highlights; never redraw or invent interface. Colours: background #08090A, white text, blue #4C9AFF, teal #26B5A5, orange #F2994A, green #4CB782. Fonts: Inter and JetBrains Mono. Follow the 10 scenes of the table: the signature moment is scene 5, where a click on "Take altitude" lifts the camera vertically above the plan until it becomes a map seen from the sky, with contour lines, and a figure on a ridge looks over it. Burn in subtitles. French voice-over, warm and confident, not salesy. Calm electronic music that rises at scene 5.

### Captures fournies (`screens/`)

| Fichier | Ce qu'on y voit |
|---|---|
| `01-tree.png` | La page entière : objectif, chiffres, agents au travail, l'arbre |
| `01b-tree-light.png` | La même en thème clair |
| `02-take-altitude.png` | Juste après le clic sur « Take altitude » (« Taking altitude… ») |
| `03-review.png` | La revue stratégique r2 : 6 propositions chiffrées |
| `04-proof-node.png` | La fiche d'un nœud fini, avec sa preuve |
| `05-routing.png` | Le routage des modèles, coût d'Ambiflex inclus (ne pas mettre en avant : voir §1) |
| `06-overhead.png` | Ce qu'Ambiflex ajoute à la session, avec la calibration A/B |
| `07-live-feed.png` | Le flux d'événements en haut à droite, après quatre événements |
| `08-agent-os-brain.png` | Agent OS : le cerveau du projet en 3D |
| `09-git.png` | L'onglet Git : 8 branches, 101 commits, 13 fusions |
| `A1` à `A10` | Gros plans découpés dans les mêmes captures, en pleine résolution, pour les zooms |

**Honnêteté sur les captures** : l'arbre, la revue r2, l'historique Git et le cerveau sont les vraies données de ce projet. L'activité en direct (les trois agents, le flux) et la ligne de coût de session ont été jouées pour la capture, sur les vrais nœuds ; le +29 % de la scène 9 est la mesure réelle du test A/B. Pour la revue, les 6 propositions sont réelles (Fable, revue r2) mais déjà acceptées : la capture les montre telles qu'elles étaient avant la décision.
