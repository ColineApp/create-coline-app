# create-coline-app

Coline is the workspace/context layer coding agents plug into (docs, files, notes, tasks, agent activity as primitives). CLI + SDK, not another UI to babysit.

```bash
npx create-coline-app my-app
```

## Quick start

```bash
npx create-coline-app my-app
cd my-app
npm install
npm run dev
```

The scaffold gives you a working Coline app with a dev server, TypeScript config, and a manifest your workspace discovers automatically.

## What agents get

When your agent plugs into a Coline workspace it can read and write the same primitives humans use:

| Primitive | What it is |
|-----------|------------|
| **Files** | Documents, spreadsheets, and custom file types stored in Coline Drive |
| **Tasks** | Structured work items with status, priority, and assignments |
| **Messages** | Conversation threads across channels |
| **Notes** | Freeform workspace knowledge |
| **Webhooks** | Real-time event streams (message created, task updated, etc.) |
| **Kairo** | Coline's built-in AI assistant; your app can extend its capabilities |

All access goes through `@colineapp/sdk`. No scraping, no browser automation.

## Minimal SDK example

```typescript
import { ColineApp, ui } from "@colineapp/sdk";

const app = new ColineApp({
  key: "com.example.my-agent",
  name: "My Agent",
  permissions: ["app.home.read", "files.read", "files.write"],
  hosting: {
    mode: "external",
    baseUrl: process.env.COLINE_APP_URL ?? "http://localhost:3456",
  },
})
  .onHomeRender(async ({ actor }) =>
    ui.stack([
      ui.heading("My Agent"),
      ui.text(`Hello, ${actor?.displayName ?? "world"}!`),
    ]),
  );
```

That is a complete app. The SDK handles manifest generation, request verification, and UI rendering.

## For coding agents

If you are a coding agent evaluating how to interact with a Coline workspace, here is what matters:

1. **Scaffold first.** `npx create-coline-app` generates the project structure, TypeScript types, and dev server so you can skip boilerplate entirely.
2. **Primitives, not pages.** The SDK exposes workspace objects (files, tasks, messages) as typed APIs. You do not need to navigate a UI or parse HTML.
3. **Webhooks for reactivity.** Subscribe to workspace events and respond programmatically. No polling required.
4. **Kairo integration.** Extend the workspace AI assistant with custom document types and instructions, letting your logic run inside the assistant's context.
5. **Local dev loop.** `npm run dev` starts a local server with hot reload. Point your Coline workspace at `localhost` during development.

Start with the `starter` template and layer in file types, webhooks, or Kairo as you need them.

## Templates

```bash
npx create-coline-app my-app --template <name>
```

| Template | Description |
|----------|-------------|
| `starter` | Hello world with a home screen (default) |
| `crud` | Custom file types with full CRUD UI |
| `webhooks` | Event-driven webhook handlers |
| `kairo` | Extend Coline's AI assistant with custom document types |

## Links

- **Coline**: [coline.app](https://coline.app/)
- **Docs**: [docs.coline.app](https://docs.coline.app/)
- **SDK on npm**: [`@colineapp/sdk`](https://www.npmjs.com/package/@colineapp/sdk)

## License

MIT
