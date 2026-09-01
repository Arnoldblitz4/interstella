import { WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";

const PORT=Number(process.env.PORT||8080),wss=new WebSocketServer({port:PORT}),rooms=new Map();
const send=(ws,m)=>{if(ws.readyState===1)ws.send(JSON.stringify(m))};
const broadcast=(room,m,except)=>{for(const p of room.players)if(p!==except)send(p,m)};
const hash=text=>{let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};
const roomFor=id=>{if(!rooms.has(id))rooms.set(id,{players:new Set(),seed:hash(id),liberation:0});return rooms.get(id)};
wss.on("connection",ws=>{ws.room=null;ws.id=randomUUID();ws.on("message",raw=>{let m;try{m=JSON.parse(raw)}catch{return}if(m.type==="join"){const r=roomFor(String(m.room||"alpha"));if(r.players.size>=4)return send(ws,{type:"error",message:"Squad full"});ws.room=r;ws.state={id:ws.id,name:String(m.name||"Pilot"),x:.5,y:.8,hp:100};r.players.add(ws);send(ws,{type:"joined",id:ws.id,seed:r.seed,players:[...r.players].map(p=>p.state).filter(Boolean),liberation:r.liberation});broadcast(r,{type:"player_join",player:ws.state},ws)}else if(ws.room&&m.type==="state"){ws.state={...ws.state,x:Number(m.x)||0,y:Number(m.y)||0,hp:Number(m.hp)||0};broadcast(ws.room,{type:"player_state",player:ws.state},ws)}else if(ws.room&&m.type==="liberate"){ws.room.liberation=Math.min(100,ws.room.liberation+Math.max(0,Math.min(5,Number(m.amount)||0)));broadcast(ws.room,{type:"liberation",value:ws.room.liberation})}});ws.on("close",()=>{if(!ws.room)return;const r=ws.room;r.players.delete(ws);broadcast(r,{type:"player_leave",id:ws.id});if(!r.players.size)for(const [id,v] of rooms)if(v===r)rooms.delete(id)})});
console.log(`Interstella online server listening on :${PORT}`);
