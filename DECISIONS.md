# DECISIONS.md — HOPNet / Acdyon Frontend Challenge (Part 2)

---

## 1. Why this data architecture over the obvious alternative I rejected

My first instinct was a static JSON file. Load it on mount, pipe it into the force graph, done in 20 minutes. I actually had that version working. The problem was it felt fake — clicking a node showed metrics that were never computed, the "pathfinding" was just a hardcoded array, and there was nothing you could actually change. If I'm building something called a graph *intelligence* platform, it has to actually do the intelligence part.

I looked at Neo4j briefly. Graph-native, Cypher queries are genuinely elegant for traversal. Dropped it fast — no free hosting tier that doesn't expire in 30 days, and I'd have to learn Cypher on top of everything else. PostgreSQL I already know. Prisma I'd used once before. Adjacency lists in a relational DB work fine at the scale I'm dealing with, and the setup time was under an hour compared to spinning up a graph DB I'd never deployed.

The provider system came from a specific problem I ran into: I had the college network working, then I wanted to add IMDB data to show the platform scales to different domains. My first approach was an if-else chain in the store — `if (source === 'imdb') use this endpoint`. It got messy after two conditions. I stepped back, thought about it, and realized each data source has a different capability set. IMDB is read-only, no trust scores, no personal profiles. The college graph has CRUD, trust analysis, workspace mode. So I built a registry where each provider declares what it supports, and the UI reads capabilities instead of checking identity. Cleaner, and it meant I only had to write the nav filtering logic once.

---

## 2. One trade-off I made under the time limit

The mobile experience for the graph canvas is bad. I knew it going in and shipped it anyway.

React Force Graph on a 390px screen technically renders — the nodes are there, the simulation runs — but it's not usable. Nodes pile on top of each other, the force parameters that look good on desktop make everything collapse on a small viewport, and touch events fight with scroll in ways that are annoying to debug. I spent about 45 minutes trying to fix it with viewport-aware force parameters before deciding my time was better spent on the actual graph functionality.

What I'd do with a real week: build a completely separate mobile view. Not a responsive tweak of the canvas — a different rendering mode that shows a node's connections as a flat list, with pathfinding results displayed as a text hop chain. Same store, same API, different presentation. The canvas stays desktop-only and works well there. Mobile gets something that's actually usable on mobile. That's a better outcome than a canvas that technically fits the screen but frustrates anyone who tries to use it.

---

## 3. Where I used AI tools and what I verified or changed myself

I used AI as a lookup tool — same way I'd use Stack Overflow or docs, except faster for boilerplate. Concretely: the initial Prisma schema draft, Express route registration pattern, a few component shells to get the shape right before filling in the logic. The base TailwindCSS config. Things where the answer is mechanical and I just needed a starting point.

The parts I wrote myself or rewrote from scratch after the AI gave me something wrong:

**Traversal constraint enforcement.** The first version the AI gave me checked `REAL → DEMO → REAL` at the query level — basically a WHERE clause filter on the results. That doesn't work. If you filter after traversal you've already found the path; you're just hiding it from the response. The constraint has to live inside the BFS and Dijkstra implementations so the algorithm never explores across that boundary in the first place. I rewrote both to carry node type through the queue and skip expansion when the transition would violate the rule.

**Dijkstra edge weight.** Suggested `1 / trustScore`. I changed it to `1 - (trustScore * interactionFrequency)`. Trust and interaction frequency are both factors in relationship strength — neither alone is enough. A high trust score on a relationship you haven't interacted with recently isn't as strong as a moderate trust score with frequent contact. Multiplying them before inverting captures that. Small change but it's the right model.

**Provider registry design.** The AI's first take was a big switch statement. I pulled it apart into a typed capability interface so each provider is a data object, not a code branch. That distinction matters when you're adding a third provider — you add a registry entry, not another case.

**The Linux deployment.** Migrated the project from Windows to Fedora mid-development. PostgreSQL auth config, Prisma binary targets for the wrong OS, Next.js ESM module scope error in the config file. None of that had an AI answer that worked on the first try — I debugged each one from the actual error output.
