# Relay Room

A small real-time WebSocket room. Open the deployed URL on two computers, enter the same room code, and exchange messages or JSON data.

## Run locally

```bash
npm install
npm start
```

Then open <http://localhost:3000> in two browser tabs. The server exposes `GET /health` for Render health checks.

## Deploy to Render

Push this folder to GitHub and create a new **Web Service** in Render. Render can use the included `render.yaml`, or set:

- Build command: `npm install`
- Start command: `npm start`

The app automatically uses Render's `PORT` and upgrades the same HTTP server to WebSockets. Use the `https://` Render URL on both devices; the browser client automatically switches to secure `wss://`.
