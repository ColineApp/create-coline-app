#!/usr/bin/env node

/**
 * create-coline-app
 *
 * Scaffold a new Coline app with the SDK — ready to run in under a minute.
 *
 * Usage:
 *   npx create-coline-app
 *   npx create-coline-app my-app
 *   npx create-coline-app my-app --template crud
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { createInterface } from "node:readline/promises";
import { execSync } from "node:child_process";

// ── Formatting ──────────────────────────────────────────────────────────────

const canColor =
  process.env.FORCE_COLOR !== "0" &&
  (process.env.FORCE_COLOR || process.stdout.isTTY);

const fmt = (open, close) => (s) =>
  canColor ? `\x1b[${open}m${s}\x1b[${close}m` : s;

const bold = fmt(1, 22);
const dim = fmt(2, 22);
const green = fmt(32, 39);
const cyan = fmt(36, 39);
const yellow = fmt(33, 39);
const red = fmt(31, 39);

const S_BAR = dim("│");
const S_BAR_END = dim("└");
const S_STEP = dim("◆");
const S_ARROW = dim("▸");
const S_CHECK = green("✔");
const S_WARN = yellow("▲");
const S_ERR = red("✖");

// ── CLI Arg Parsing ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = {};
const positional = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--help" || args[i] === "-h") {
    flags.help = true;
  } else if (args[i] === "--yes" || args[i] === "-y") {
    flags.yes = true;
  } else if (args[i].startsWith("--")) {
    const key = args[i].slice(2);
    flags[key] = args[i + 1] ?? true;
    if (typeof flags[key] === "string") i++;
  } else {
    positional.push(args[i]);
  }
}

if (flags.help) {
  console.log(`
  ${bold("create-coline-app")} — Scaffold a new Coline app

  ${dim("Usage:")}
    npx create-coline-app ${dim("[project-name] [options]")}

  ${dim("Templates:")}
    starter     ${dim("Hello world with home screen (default)")}
    crud        ${dim("Custom file types with full UI")}
    webhooks    ${dim("Event-driven webhook handlers")}
    kairo       ${dim("Extend Coline's AI assistant")}

  ${dim("Options:")}
    --template <name>   ${dim("Template to use")}
    --yes, -y           ${dim("Skip prompts, use defaults")}
    --help, -h          ${dim("Show this help")}

  ${dim("Examples:")}
    npx create-coline-app
    npx create-coline-app my-app
    npx create-coline-app my-app --template crud
`);
  process.exit(0);
}

// ── Prompts ─────────────────────────────────────────────────────────────────

const isCI = !!(
  process.env.CI ||
  process.env.CONTINUOUS_INTEGRATION ||
  process.env.GITHUB_ACTIONS
);
const isInteractive = process.stdin.isTTY && !flags.yes && !isCI;

let rl;

function setupReadline() {
  if (!rl && isInteractive) {
    rl = createInterface({ input: process.stdin, output: process.stdout });
  }
}

async function promptText(label, defaultValue) {
  setupReadline();
  const hint = defaultValue ? ` ${dim(`(${defaultValue})`)}` : "";
  const answer = await rl.question(
    `  ${S_STEP} ${bold(label)}${hint}\n  ${S_BAR} ${S_ARROW} `,
  );
  return answer.trim() || defaultValue || "";
}

async function promptSelect(label, options) {
  setupReadline();
  const pad = Math.max(...options.map((o) => o.label.length));
  console.log(`\n  ${S_STEP} ${bold(label)}\n  ${S_BAR}`);
  for (let i = 0; i < options.length; i++) {
    const o = options[i];
    const num = dim(`${i + 1}.`);
    const name = o.label.padEnd(pad + 2);
    console.log(`  ${S_BAR}  ${num} ${bold(name)}${dim(o.hint)}`);
  }
  const answer = await rl.question(
    `  ${S_BAR}\n  ${S_BAR} ${dim(`(1–${options.length})`)} ${S_ARROW} `,
  );
  const idx = Math.max(
    0,
    Math.min(parseInt(answer || "1", 10) - 1, options.length - 1),
  );
  return options[idx].value;
}

async function promptConfirm(label, defaultYes = true) {
  setupReadline();
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = await rl.question(
    `\n  ${S_STEP} ${bold(label)} ${dim(`(${hint})`)}\n  ${S_BAR} ${S_ARROW} `,
  );
  if (!answer) return defaultYes;
  return answer.toLowerCase().startsWith("y");
}

// ── Package Manager ─────────────────────────────────────────────────────────

function detectPM() {
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("yarn")) return "yarn";
  if (ua.startsWith("bun")) return "bun";
  return "npm";
}

const installCmd = (pm) => (pm === "yarn" ? "yarn" : `${pm} install`);
const runCmd = (pm) => (pm === "npm" ? "npm run" : pm);

function hasGit() {
  try {
    execSync("git --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// ── File Writer ─────────────────────────────────────────────────────────────

function write(dir, path, content) {
  const full = resolve(dir, path);
  mkdirSync(resolve(full, ".."), { recursive: true });
  writeFileSync(full, content.replace(/^\n/, ""));
  return path;
}

// ── Templates ───────────────────────────────────────────────────────────────

const TEMPLATES = [
  { value: "starter", label: "Starter", hint: "Hello world with home screen" },
  { value: "crud", label: "CRUD App", hint: "Custom file types with full UI" },
  {
    value: "webhooks",
    label: "Webhook Bot",
    hint: "Event-driven webhook handlers",
  },
  {
    value: "kairo",
    label: "Kairo Plugin",
    hint: "Extend Coline's AI assistant",
  },
];

function makeAppKey(name) {
  const slug = name
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
  return slug ? `com.example.${slug}` : "com.example.my-app";
}

// ── app.ts ──────────────────────────────────────────────────────────────────

function starterAppTs(c) {
  return `\
import { ColineApp, ui } from "@colineapp/sdk";

export const app = new ColineApp({
  key: "${c.key}",
  name: "${c.name}",
  description: "A Coline app built with the SDK.",
  permissions: ["app.home.read"],
  hosting: {
    mode: "external",
    baseUrl: process.env.COLINE_APP_URL ?? "http://localhost:${c.port}",
  },
})
  .onHomeRender(async ({ actor }) =>
    ui.stack([
      ui.heading("${c.name}"),
      ui.text(\`Hello, \${actor?.displayName ?? "world"}!\`),
      ui.divider(),
      ui.text("Edit src/app.ts to build your app.", { tone: "muted" }),
    ]),
  );
`;
}

function crudAppTs(c) {
  return `\
import { ColineApp, ui, actions } from "@colineapp/sdk";

const ITEM_TYPE = "${c.key}.item";

export const app = new ColineApp({
  key: "${c.key}",
  name: "${c.name}",
  description: "A Coline app with custom file types.",
  permissions: ["app.home.read", "files.read", "files.write", "index.write"],
  hosting: {
    mode: "external",
    baseUrl: process.env.COLINE_APP_URL ?? "http://localhost:${c.port}",
  },
})
  // Register a custom file type stored in Coline's drive
  .defineFileType({
    typeKey: ITEM_TYPE,
    name: "Item",
    description: "A custom item managed by ${c.name}",
    storage: "coline_document",
    indexable: true,
  })

  // Home screen — overview + create button
  .onHomeRender(async ({ actor }) =>
    ui.stack([
      ui.heading("${c.name}"),
      ui.text(\`Welcome, \${actor?.displayName ?? "there"}!\`),
      ui.divider(),
      ui.button("New Item", {
        variant: "primary",
        action: actions.createFile({
          name: "Untitled Item",
          typeKey: ITEM_TYPE,
          document: { status: "draft", notes: "" },
        }),
      }),
    ]),
  )

  // File detail view — renders when a user opens an item
  .onFileRender(async ({ file, document }) =>
    ui.stack([
      ui.heading(file.title ?? "Item"),
      ui.badge(String(document?.status ?? "draft"), {
        tone: document?.status === "active" ? "positive" : "muted",
      }),
      ui.divider(),
      ui.table({
        columns: [
          { key: "field", header: "Field" },
          { key: "value", header: "Value" },
        ],
        rows: Object.entries(document ?? {}).map(([field, value]) => ({
          field,
          value: String(value),
        })),
      }),
    ]),
  )

  // Search index sync — makes items searchable in Coline
  .onIndexSync(async ({ files }) =>
    files.list.map((f) => ({
      id: f.id,
      title: f.title ?? "Untitled",
      body: JSON.stringify(f.document ?? {}),
      url: f.openHref ?? "",
    })),
  );
`;
}

function webhooksAppTs(c) {
  return `\
import { ColineApp } from "@colineapp/sdk";

export const app = new ColineApp({
  key: "${c.key}",
  name: "${c.name}",
  description: "An event-driven Coline app.",
  permissions: ["webhooks.messages", "webhooks.tasks", "notifications.write"],
  hosting: {
    mode: "external",
    baseUrl: process.env.COLINE_APP_URL ?? "http://localhost:${c.port}",
  },
})
  .defineNotificationChannel({
    key: "alerts",
    name: "Alerts",
    description: "Notifications from ${c.name}",
    defaultDeliveries: ["in_app"],
  });
`;
}

function kairoAppTs(c) {
  return `\
import { ColineApp, ui } from "@colineapp/sdk";

export const app = new ColineApp({
  key: "${c.key}",
  name: "${c.name}",
  description: "A Kairo AI plugin for Coline.",
  permissions: ["app.home.read", "files.read", "files.write"],
  hosting: {
    mode: "external",
    baseUrl: process.env.COLINE_APP_URL ?? "http://localhost:${c.port}",
  },
})
  // File type for AI-generated content
  .defineFileType({
    typeKey: "${c.key}.analysis",
    name: "Analysis",
    description: "An AI-generated analysis document",
    storage: "coline_document",
    indexable: true,
  })

  // Configure Kairo AI integration
  .defineKairo({
    enabled: true,
    description: "Helps users analyze and summarize workspace content.",
    instructions: [
      "You are an analysis assistant powered by ${c.name}.",
      "When users ask you to analyze content, create structured",
      "analysis documents. Be thorough but concise.",
    ].join(" "),
    documentTypes: [
      {
        documentType: "${c.key}.analysis",
        name: "Analysis",
        description: "A structured analysis with findings and recommendations",
        instructions:
          "Include sections: Summary, Key Findings, Recommendations.",
        metadata: [
          { key: "topic", description: "The subject being analyzed" },
          {
            key: "confidence",
            description: "Confidence level: low, medium, high",
          },
        ],
      },
    ],
  })

  .onHomeRender(async () =>
    ui.stack([
      ui.heading("${c.name}"),
      ui.text("AI-powered analysis for your workspace."),
      ui.divider(),
      ui.text(
        "Ask Kairo to analyze content — it will create structured reports.",
        { tone: "muted" },
      ),
    ]),
  );
`;
}

// ── Server Entries ──────────────────────────────────────────────────────────

/**
 * Dev server entry — used by starter, crud, and kairo templates.
 * Gives you a browser-based preview of your app's UI at localhost.
 */
function devServerEntry(c) {
  return `\
import { createDevServer } from "@colineapp/sdk";
import { app } from "./app.js";

const port = Number(process.env.PORT) || ${c.port};

createDevServer({
  app,
  secret: process.env.COLINE_APP_SECRET ?? "dev-secret",
  port,
}).listen();
`;
}

/**
 * Handler-based entry — used by the webhooks template.
 * Runs a plain Node.js server with full webhook support.
 */
function webhookServerEntry(c) {
  return `\
import { createHandler } from "@colineapp/sdk";
import { app } from "./app.js";
import { handleWebhook } from "./webhooks.js";

const secret = process.env.COLINE_APP_SECRET ?? "";
if (!secret || secret === "change-me") {
  console.warn("\\n  ⚠  Set COLINE_APP_SECRET in .env to verify requests.\\n");
}

const handler = createHandler({
  app,
  secret,
  onWebhook: handleWebhook,
});

// ── Server ──────────────────────────────────────────────────────────────────
// For production, mount \`handler\` on your framework of choice:
//
//   Hono:     hono.all("/coline/*", (c) => handler(c.req.raw))
//   Next.js:  export const POST = handler  (app/coline/[...path]/route.ts)
//   Bun:      export default { fetch: handler }

const port = Number(process.env.PORT) || ${c.port};

const { createServer } = await import("node:http");

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", \`http://localhost:\${port}\`);
  const body = await new Promise<string>((r) => {
    let d = "";
    req.on("data", (chunk: Buffer) => (d += chunk));
    req.on("end", () => r(d));
  });

  const response = await handler(
    new Request(url, {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).filter(
          (e): e is [string, string] => typeof e[1] === "string",
        ),
      ),
      ...(body && req.method !== "GET" && req.method !== "HEAD"
        ? { body }
        : {}),
    }),
  );

  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(await response.text());
}).listen(port, () => {
  console.log(\`\\n  🟢 ${c.name} listening on http://localhost:\${port}\`);
  console.log(\`  📋 Manifest: http://localhost:\${port}/coline/manifest\\n\`);
});
`;
}

// ── webhooks.ts ─────────────────────────────────────────────────────────────

function webhooksHandlerTs() {
  return `\
import type { WebhookEvent } from "@colineapp/sdk";

/**
 * Handle incoming webhook events from Coline.
 *
 * Events are automatically verified by createHandler before reaching here.
 * See all event types: https://docs.coline.app/webhooks/events
 */
export async function handleWebhook(event: WebhookEvent): Promise<void> {
  switch (event.type) {
    case "message.created":
      console.log("[message.created]", {
        plaintext: event.data.plaintext,
        channelId: event.data.channelId,
        authorId: event.data.authorId,
      });
      break;

    case "task.created":
      console.log("[task.created]", {
        title: event.data.title,
        priority: event.data.priority,
        taskboardId: event.data.taskboardId,
      });
      break;

    case "note.created":
      console.log("[note.created]", {
        title: event.data.title,
        fileId: event.data.fileId,
      });
      break;

    case "member.joined":
      console.log("[member.joined]", {
        userId: event.data.userId,
      });
      break;

    default:
      console.log(\`[webhook] \${event.type}\`, event);
  }
}
`;
}

// ── Common Files ────────────────────────────────────────────────────────────

function packageJson(c) {
  return JSON.stringify(
    {
      name: c.projectName,
      version: "0.0.1",
      type: "module",
      private: true,
      scripts: {
        dev: "tsx watch src/index.ts",
        start: "tsx src/index.ts",
        build: "tsc",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        "@colineapp/sdk": "latest",
      },
      devDependencies: {
        "@types/node": "^22.0.0",
        tsx: "^4.0.0",
        typescript: "^5.8.0",
      },
    },
    null,
    2,
  );
}

function tsconfigJson() {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "Node16",
        moduleResolution: "Node16",
        lib: ["ES2022"],
        outDir: "dist",
        rootDir: "src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        declaration: true,
        sourceMap: true,
      },
      include: ["src"],
    },
    null,
    2,
  );
}

function envFile(c) {
  return `\
# Get your app secret from the Coline Developer Console.
# Used to verify signed requests from Coline.
COLINE_APP_SECRET=change-me

# Base URL for production deployments.
# COLINE_APP_URL=https://your-app.example.com

# Port for the local dev server.
PORT=${c.port}
`;
}

function gitignoreFile() {
  return `\
node_modules/
dist/
.env
.env.local
`;
}

function readmeFile(c) {
  const pm = c.pm;
  const run = runCmd(pm);
  const tmpl = TEMPLATES.find((t) => t.value === c.template);

  const isDevServer = c.template !== "webhooks";
  const devNote = isDevServer
    ? `Open http://localhost:${c.port} to see a live preview of your app.`
    : `Webhook events will be logged to the console as they arrive.`;

  return `\
# ${c.name}

${tmpl ? tmpl.hint + "." : "A Coline app."} Built with [\`@colineapp/sdk\`](https://docs.coline.app/sdk).

## Quick Start

\`\`\`bash
${installCmd(pm)}
${run} dev
\`\`\`

${devNote}

## Register with Coline

1. Open the **Developer Console** in your Coline workspace
2. Click **Create new app**
3. Enter your manifest URL: \`http://localhost:${c.port}/coline/manifest\`
4. Click **Import from app** — the console pulls your manifest automatically
5. Copy the delivery secret and paste it into \`.env\` as \`COLINE_APP_SECRET\`

## Deploy

Deploy to any Node.js hosting (Vercel, Railway, Fly.io, etc.):

1. Set \`COLINE_APP_SECRET\` and \`COLINE_APP_URL\` in your environment
2. Run \`${run} start\` or mount the handler on your framework
3. Update the base URL in the Coline Developer Console

## Learn More

- [SDK Documentation](https://docs.coline.app/sdk)
- [API Reference](https://docs.coline.app/api)
- [Example Apps](https://github.com/ColineApp/examples)
`;
}

// ── Scaffold ────────────────────────────────────────────────────────────────

function scaffold(dir, c) {
  mkdirSync(dir, { recursive: true });

  const files = [];

  // Common files
  files.push(write(dir, "package.json", packageJson(c)));
  files.push(write(dir, "tsconfig.json", tsconfigJson()));
  files.push(write(dir, ".env", envFile(c)));
  files.push(write(dir, ".gitignore", gitignoreFile()));

  // Template-specific source files
  switch (c.template) {
    case "starter":
      files.push(write(dir, "src/app.ts", starterAppTs(c)));
      files.push(write(dir, "src/index.ts", devServerEntry(c)));
      break;
    case "crud":
      files.push(write(dir, "src/app.ts", crudAppTs(c)));
      files.push(write(dir, "src/index.ts", devServerEntry(c)));
      break;
    case "webhooks":
      files.push(write(dir, "src/app.ts", webhooksAppTs(c)));
      files.push(write(dir, "src/webhooks.ts", webhooksHandlerTs()));
      files.push(write(dir, "src/index.ts", webhookServerEntry(c)));
      break;
    case "kairo":
      files.push(write(dir, "src/app.ts", kairoAppTs(c)));
      files.push(write(dir, "src/index.ts", devServerEntry(c)));
      break;
  }

  files.push(write(dir, "README.md", readmeFile(c)));

  return files;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Ctrl+C exits cleanly
  process.on("SIGINT", () => {
    console.log("\n");
    process.exit(0);
  });

  const pm = detectPM();

  console.log(`\n  ${bold("create-coline-app")} ${dim("v0.1.0")}\n`);

  // 1. Project name
  let projectName = positional[0];

  if (!projectName && isInteractive) {
    projectName = await promptText("Project name", "my-coline-app");
  }

  if (!projectName) {
    console.error(`  ${S_ERR} Project name is required.\n`);
    console.error(`  ${dim("Usage: npx create-coline-app <project-name>")}\n`);
    process.exit(1);
  }

  const targetDir = resolve(process.cwd(), projectName);
  projectName = basename(targetDir);

  if (existsSync(targetDir)) {
    console.error(
      `\n  ${S_ERR} Directory ${bold(projectName)} already exists.\n`,
    );
    process.exit(1);
  }

  // 2. Template
  let template = flags.template;

  if (!template && isInteractive) {
    template = await promptSelect("Choose a template", TEMPLATES);
  }

  if (!template || !TEMPLATES.find((t) => t.value === template)) {
    template = "starter";
  }

  // 3. Install deps?
  let shouldInstall = false;

  if (isInteractive) {
    shouldInstall = await promptConfirm(
      `Install dependencies? ${dim(`(${pm})`)}`,
      true,
    );
  }

  // Done with prompts
  if (rl) {
    rl.close();
    rl = null;
  }

  // ── Scaffold ──────────────────────────────────────────────────────────────

  const ctx = {
    projectName,
    name: projectName,
    key: makeAppKey(projectName),
    template,
    port: 4100,
    pm,
  };

  console.log();
  console.log(`  ${S_BAR}  Scaffolding ${bold(projectName)}...`);
  console.log(`  ${S_BAR}`);

  const files = scaffold(targetDir, ctx);

  for (const f of files) {
    console.log(`  ${S_BAR}  ${green("+")} ${f}`);
  }

  // 4. Git init
  if (hasGit()) {
    try {
      execSync("git init", { cwd: targetDir, stdio: "ignore" });
      execSync("git add -A", { cwd: targetDir, stdio: "ignore" });
      console.log(`  ${S_BAR}`);
      console.log(`  ${S_BAR}  ${S_CHECK} Initialized git repository`);
    } catch {
      // skip if git init fails
    }
  }

  // 5. Install deps
  if (shouldInstall) {
    console.log(`  ${S_BAR}  ${dim("Installing dependencies...")}`);
    try {
      execSync(installCmd(pm), { cwd: targetDir, stdio: "ignore" });
      console.log(`  ${S_BAR}  ${S_CHECK} Installed dependencies`);
    } catch {
      console.log(
        `  ${S_BAR}  ${S_WARN} Install failed. Run ${bold(installCmd(pm))} manually.`,
      );
    }
  }

  // ── Done ──────────────────────────────────────────────────────────────────

  const run = runCmd(pm);
  const templateLabel =
    TEMPLATES.find((t) => t.value === template)?.label ?? template;

  console.log(`  ${S_BAR}`);
  console.log(`  ${S_BAR_END}  ${bold("Done!")} ${dim(`(${templateLabel})`)}`);

  console.log(`\n  ${dim("Next steps:")}\n`);

  let step = 1;

  if (!shouldInstall) {
    console.log(
      `  ${dim(`${step}.`)} cd ${projectName} && ${installCmd(pm)}`,
    );
    step++;
  } else {
    console.log(`  ${dim(`${step}.`)} cd ${projectName}`);
    step++;
  }

  console.log(`  ${dim(`${step}.`)} ${run} dev`);
  step++;

  console.log(
    `  ${dim(`${step}.`)} Register at ${cyan(`http://localhost:${ctx.port}/coline/manifest`)}`,
  );

  console.log();
}

main().catch((error) => {
  // Ctrl+C during readline
  if (error?.code === "ERR_USE_AFTER_CLOSE") {
    process.exit(0);
  }
  console.error(`\n  ${S_ERR} ${error.message ?? error}\n`);
  process.exit(1);
});
