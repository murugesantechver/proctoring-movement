const os = require("os");
const redisBaseClient = require("../config/redis");
const { createAdapter } = require("@socket.io/redis-adapter");

const sessionMap = new Map();
const REDIS_SESSION_KEY = (sessionId) => `ws:session:${sessionId}`;
const REDIS_SESSIONS_SET = "ws:sessions";
const NODE_ID = `${os.hostname()}#${process.pid}`;

const pubClient = redisBaseClient.duplicate();
const subClient = redisBaseClient.duplicate();

function log(event, details = {}) {
  const ts = new Date().toISOString();
  console.log(`[WS-Redis][${ts}][${NODE_ID}] ${event}`, details);
}

for (const [name, client] of [["pubClient", pubClient], ["subClient", subClient]]) {
  client.on("connect", () => log(`${name} connected`));
  client.on("reconnecting", () => log(`${name} reconnecting`));
  client.on("error", (err) => log(`${name} error`, { err: String(err) }));
}

let io = null;

async function attachSocketServer(ioServer) {
  if (io) { console.log("[WS-Redis] Socket.IO already has Redis adapter attached"); return; }
  if (pubClient.status !== "ready" && pubClient.status !== "connecting") await pubClient.connect();
  if (subClient.status !== "ready" && subClient.status !== "connecting") await subClient.connect();
  const awaitClientReady = (client, label) =>
    new Promise((resolve, reject) => {
      if (client.status === "ready") return resolve();
      client.once("ready", resolve);
      client.once("error", (err) => { log(`${label} init failure`, { err: String(err) }); reject(err); });
    });
  await awaitClientReady(pubClient, "pubClient");
  await awaitClientReady(subClient, "subClient");
  io = ioServer;
  io.adapter(createAdapter(pubClient, subClient));
  log("socket.io redis adapter attached");
}

async function persistSessionToRedis(session_id, meta) {
  try {
    const key = REDIS_SESSION_KEY(session_id);
    await pubClient.multi().hmset(key, { session_id, user_id: meta.user_id ?? "", organization_id: meta.organization_id ?? "", first_name: meta.first_name ?? "", last_name: meta.last_name ?? "", initialized: meta.initialized ? "true" : "false", node_id: NODE_ID }).sadd(REDIS_SESSIONS_SET, session_id).exec();
    log("persisted session", { session_id });
  } catch (e) { log("persistSessionToRedis error", { e: String(e), session_id }); }
}

async function deleteSessionFromRedis(session_id) {
  try {
    const key = REDIS_SESSION_KEY(session_id);
    await pubClient.multi().del(key).srem(REDIS_SESSIONS_SET, session_id).exec();
    log("deleted session from redis", { session_id });
  } catch (e) { log("deleteSessionFromRedis error", { e: String(e), session_id }); }
}

async function fetchSessionMeta(session_id) {
  try {
    const key = REDIS_SESSION_KEY(session_id);
    const data = await pubClient.hgetall(key);
    if (!data || Object.keys(data).length === 0) return null;
    return { session_id: data.session_id, user_id: data.user_id || null, organization_id: data.organization_id || null, first_name: data.first_name || null, last_name: data.last_name || null, initialized: data.initialized === "true", node_id: data.node_id || null };
  } catch (e) { log("fetchSessionMeta error", { e: String(e), session_id }); return null; }
}

async function registerSession(socket, session_id, user_id, organization_id, first_name, last_name) {
  try {
    socket.session_id = session_id;
    const meta = { user_id, organization_id, first_name, last_name, initialized: true };
    sessionMap.set(session_id, { ...meta, ws: socket });
    await persistSessionToRedis(session_id, meta);
    if (typeof socket.join === "function") {
      try { await socket.join(String(session_id)); } catch (err) { log("socket join failed", { session_id, err: String(err) }); }
    }
    log("registered session", { session_id, organization_id });
  } catch (e) { log("registerSession error", { e: String(e), session_id }); }
}

async function removeSession(session_id) {
  try {
    const local = sessionMap.get(session_id);
    const wsBeingRemoved = local?.ws;
    if (wsBeingRemoved && typeof wsBeingRemoved.leave === "function") {
      try { await wsBeingRemoved.leave(String(session_id)); } catch (err) { log("socket leave failed", { session_id, err: String(err) }); }
    }
    const current = sessionMap.get(session_id);
    if (!current || current.ws === wsBeingRemoved) {
      sessionMap.delete(session_id);
      await deleteSessionFromRedis(session_id);
    }
    log("removed session", { session_id });
  } catch (e) { log("removeSession error", { e: String(e), session_id }); }
}

async function getSession(session_id) {
  const local = sessionMap.get(session_id);
  if (local) return local;
  const meta = await fetchSessionMeta(session_id);
  return meta ? { ...meta, ws: undefined } : undefined;
}

function getWebSocket(session_id) { return sessionMap.get(session_id)?.ws || null; }

async function isInitialized(session_id) {
  const local = sessionMap.get(session_id);
  if (local) return !!local.initialized;
  const meta = await fetchSessionMeta(session_id);
  return !!meta?.initialized;
}

async function getUserId(session_id) {
  const local = sessionMap.get(session_id)?.user_id;
  if (local) return local;
  const meta = await fetchSessionMeta(session_id);
  return meta?.user_id || null;
}

async function getOrganizationId(session_id) {
  const local = sessionMap.get(session_id)?.organization_id;
  if (local) return local;
  const meta = await fetchSessionMeta(session_id);
  return meta?.organization_id || null;
}

function listSessions() { console.log("[SessionManager] Active sessions (local):", [...sessionMap.keys()]); }

async function sendToSession(session_id, data) {
  try {
    const socket = getWebSocket(session_id);
    if (socket) {
      if (typeof socket.emit === "function") socket.emit("message", data);
      else if (typeof socket.send === "function") socket.send(typeof data === "string" ? data : JSON.stringify(data));
      return true;
    }
    if (io) { io.to(String(session_id)).emit("message", data); log("routed message via socket.io", { session_id }); }
    else log("sendToSession warning", { session_id, issue: "io instance not attached yet" });
    return true;
  } catch (e) { log("sendToSession error", { e: String(e), session_id }); return false; }
}

module.exports = { sessionMap, attachSocketServer, registerSession, getSession, isInitialized, removeSession, getWebSocket, getUserId, getOrganizationId, listSessions, sendToSession };
