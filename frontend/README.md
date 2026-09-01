# HOPNet Frontend

Next.js 16 application for the HOPNet graph intelligence platform.

## Stack

- **Framework**: Next.js 16 with Turbopack
- **Language**: TypeScript
- **Styling**: TailwindCSS v4, inline glassmorphism design system
- **Visualization**: React Force Graph 2D, Three.js, Vanta.js
- **Animation**: Framer Motion
- **State**: Zustand

## Development

```bash
npm install
npm run dev      # starts on http://localhost:3000
```

The dev script runs `copy-engine.js` before Next.js starts, which mirrors `shared/graph-engine/src` into `src/shared-engine/` for Turbopack compatibility.

## Environment

Create `.env.local` in this directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

If the backend is unreachable, the app falls back to the embedded college graph demo dataset automatically.

## Pages

| Route | Description |
|---|---|
| `/` | Interactive graph explorer |
| `/personal` | Personal node profile and network analytics |
| `/database` | Ranked, searchable universal node table |
| `/connectors` | Data source integrations and import flows |
| `/profile/[publicId]` | Individual node profile view |
