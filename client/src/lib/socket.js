import { io } from 'socket.io-client';

/**
 * Where to find the server.
 *
 * In production the Express server also serves this bundle, so the API lives on
 * the same origin and there is no port to guess. In dev, Vite is on :5173 and
 * the server on :4000, so we point at the same HOST the page came from — that is
 * what lets a phone on the LAN hit 192.168.x.x:5173 and reach 192.168.x.x:4000
 * rather than its own localhost.
 *
 * VITE_SERVER_URL overrides both when the API is deployed somewhere else.
 */
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.PROD
    ? window.location.origin
    : `${window.location.protocol}//${window.location.hostname}:4000`);

export const socket = io(SERVER_URL, {
  autoConnect: false, // we connect explicitly once the player picks a name
  // Skip the HTTP long-poll handshake and go straight to WebSocket: one fewer
  // round trip before the first question can reach us. Render supports
  // WebSocket on all plans; behind a proxy that blocks upgrades, add 'polling'.
  transports: ['websocket'],
  reconnectionDelay: 400,
  reconnectionDelayMax: 3000,
});

export { SERVER_URL };
