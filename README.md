# TLC BATTLE — Men vs Women Arena

An original, cinematic TLC-branded browser battle game. Four playable arena presets, interactive power-ups, match highlights, sound, fullscreen/spectator views, and shareable recaps. The core arena is a local simulation, **not** real-time multiplayer.

**Source code:** This GitHub repository. **Hosting:** Independent of Lovable.

## Run locally

Requirements: Node.js 22 and npm.

```bash
git clone https://github.com/TLC405/gender-clash-blueprint.git
cd gender-clash-blueprint
npm install
npm run dev
```

Open the local URL printed by Vite. Check production output with `npm run build` and `npm run preview`.

## Publish free with GitHub Pages

1. Merge the reviewed Atomic Edition pull request into `main` after its CI checks pass.
2. In **GitHub → Repository Settings → Pages**, select **Source: GitHub Actions**. This one-time action must be completed by a repository administrator.
3. The workflow `.github/workflows/deploy-pages.yml` automatically builds and publishes each push to `main`.
4. Once the workflow succeeds, visit **https://tlc405.github.io/gender-clash-blueprint/**. The URL is a target, not a claim that Pages is already enabled.
5. Optional custom domain: configure it under GitHub Pages settings and set the repository Actions variable `TLC_BASE_PATH` to `/` if your domain serves the app at its root. Re-run the Pages workflow after changing the variable.

The workflow builds with `DEPLOY_BASE_PATH=/gender-clash-blueprint/` by default. React Router, game audio, service worker, and web manifest use that base path. It also creates `404.html` so direct links to app routes work on GitHub Pages.

## Host on your own server with Docker

Build and run the static site in Nginx:

```bash
docker build -t tlc-battle .
docker run -d --name tlc-battle --restart unless-stopped -p 8080:80 tlc-battle
```

Open `http://localhost:8080`. For a public VPS, place a TLS reverse proxy such as Caddy in front of port 8080, point your domain's DNS at the VPS, and configure HTTPS. The included `nginx.conf` handles SPA routes and static assets. Root hosting is the default for Docker.

## Backend and configuration

The playable arena runs in the browser. Supabase integration is retained for existing features; the ElevenLabs voice function requires its existing Supabase backend and configuration. This Docker image hosts **the frontend**, not Supabase or ElevenLabs.

Vite reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at build time. These are browser-visible public configuration values, not server secrets. **Never commit service-role keys, private API keys, or other credentials.** Keep any actual backend secrets in the backend provider's secret manager. For GitHub Pages, the build uses the existing project public configuration; migrate that configuration to GitHub Actions variables if you later remove the tracked `.env`.

## Quality checks

```bash
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

The current package-lock predates the Pixi/Howler additions; install uses npm install until the lockfile is regenerated and committed.

GitHub Actions runs the typecheck and production build for proposed changes. Pages publishing only runs from `main` or a manually dispatched workflow.
