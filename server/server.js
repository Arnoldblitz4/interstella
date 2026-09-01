import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 8080);
const wss = new WebSocketServer({ port: PORT });
const rooms = new Map();

function send(ws, message) { if (ws.readyState === 1) ws.send(JSON.stringify(message)); }
function broadcast(room, message, except) {
  for (const peer of room.players) if (peer !== except) send(peer, message);
}
function getRoom(id) {
  if (!rooms.has(id)) rooms.set(id, { players: new Set(), seed: hash(id), liberation: 0 });
  return rooms.get(id);
}
function hash(text) { let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

wss.on("connection", ws => {
  ws.room = null;
  ws.id = crypto.randomUUID();
  ws.on("message", raw => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === "join") {
      const room = getRoom(String(msg.room || "alpha"));
      if (room.players.size >= 4) return send(ws, { type:"error", message:"Squad is full (4 players)." });
      ws.room = room; room.players.add(ws);
      send(ws, { type:"joined", id:ws.id, seed:room.seed, players:[...room.players].map(p=>p.state).filter(Boolean), liberation:room.liberation });
      broadcast(room, { type:"player_join", player:{id:ws.id,name:String(msg.name||"Pilot"),x:0.5,y:0.8,hp:100} }, ws);
      ws.state = { id:ws.id, name:String(msg.name||"Pilot"), x:0.5, y:0.8, hp:100 };
    } else if (ws.room && msg.type === "state") {
      ws.state = {...ws.state, x:Number(msg.x)||0, y:Number(msg.y)||0, hp:Number(msg.hp)||0};
      broadcast(ws.room, {type:"player_state", player:ws.state}, ws);
    } else if (ws.room && msg.type === "liberate") {
      ws.room.liberation = Math.min(100, ws.room.liberation + Math.max(0, Math.min(5, Number(msg.amount)||0)));
      broadcast(ws.room, {type:"liberation", value:ws.room.liberation});
    }
  });
  ws.on("close", () => { if (ws.room) { ws.room.players.delete(ws); broadcast(ws.room,{type:"player_leave",id:ws.id}); if (!ws.room.players.size) rooms.delete([...rooms.entries()].find(([,r])=>r===ws.room)?.[0]); } });
});
console.log(`Interstella online server listening on :${PORT}`);
