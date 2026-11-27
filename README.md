# paseo-session-watch

A [Paseo](https://paseo.sh) plugin for the desktop app that keeps sessions waiting on you in view.

- **Approval cards.** When an agent asks for permission, a card appears at the bottom right of the window, above the message box, and stays until the request is answered or you open the session from the card. It shows the session title, the request (a shell command is shown as one `$ command` line) and the request's own actions, or allow and deny when it has none. Questions have no buttons and are answered in the session; clicking the card title opens it. At most three cards are shown, with a count for the rest. Cmd+Shift+Y allows and Cmd+Shift+N denies the first request on the top card (Ctrl on Windows and Linux).
- **Session list.** A row in the sidebar header shows how many sessions are running and how many need input. Hovering it shows the list beside the row; clicking the row, or the pin control in the list header, keeps the list open. Sessions are ordered by your most recent message, newest first, and labelled needs input, failed, running, or finished but unread. Finished sessions are folded away behind a count. Selecting a session opens it.

Both cover every online host that has this plugin installed. A host without the plugin is left out, so install it on each daemon you want included. Nothing is shown on mobile or in windows narrower than 768 pixels. The interface is in English or Korean, following the app language.

## Install

```bash
paseo plugin install github:kyago/paseo-session-watch
```

Requires Paseo 0.16.0 or later. Plugins are trusted, unsandboxed code; read the source before installing.

## What it stores and sends

- The pinned state of the session list is kept in the app's `localStorage`.
- The daemon side has one RPC, which returns the daemon's server id from `PASEO_HOME/server-id` so the app can tell hosts apart.
- Nothing is sent outside Paseo.

## Development

```bash
npm install
npm run typecheck
node --experimental-strip-types client/hosts.check.mjs
paseo plugin install /absolute/path/to/paseo-session-watch
paseo plugin reload session-watch
```

How it is put together:

- The cards and the list render in a separate React root on a click-through layer appended to `document.body` (`index.client.tsx`, `client/web.ts`), so they stay visible when the sidebar is collapsed.
- That root is outside Paseo's plugin surfaces. `usePaseo()`, `useRpc()` and `useSettings()` do not work there, and there is no `theme` prop. Use `getPaseoClient(serverId)` for Paseo calls and the theme CSS variables Paseo puts on `:root` for colors (`client/palette.ts`).
- Each host with the plugin loads its own client bundle into the same window. The bundles share a registry on `globalThis` so that only one mounts the layer (`client/hosts.ts`). The sidebar row and the layer share a second store for hover, pin and counts (`client/popover.ts`).
- Sessions open through Paseo's own route, `/h/<server>/workspace/<id>?open=agent:<id>` (`openAgentRoute` in `client/web.ts`).
