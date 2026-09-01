import { WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const PORT=Number(process.env.PORT||8080),wss=new WebSocketServer({port:PORT}),rooms=new Map();
const DB="server/galaxy.json";
const send=(ws,m)=>{if(ws.readyState===1)ws.send(JSON.stringify(m))};
const broadcast=(room,m,except)=>{for(const p of room.players)if(p!==except)send(p,m)};
const hash=text=>{let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};
const seed=id=>{let x=(id*0x9e3779b9)>>>0;x^=x>>>16;x=Math.imul(x,0x85ebca6b);x^=x>>>13;return x>>>0};
const load=()=>{try{return existsSync(DB)?JSON.parse(readFileSync(DB,"utf8")):{sectors:{},leaderboard:[],fleets:{}}}catch{return {sectors:{},leaderboard:[],fleets:{}}}};
const db=load();
const sector=id=>{if(!db.sectors[id])db.sectors[id]={id,seed:seed(id),control:id===1?25:0,lastUpdated:Date.now()};return db.sectors[id]};
const save=()=>writeFileSync(DB,JSON.stringify(db,null,2));
const apply=(s,n)=>{s.control=Math.max(0,Math.min(100,s.control+Math.max(0,Math.min(10,n))));s.lastUpdated=Date.now();save();return s};
const events=()=>{const now=Date.now(),day=Math.floor(now/86400000),week=Math.floor(day/7);return [
 {id:`daily-${day}`,kind:"daily_operation",title:"DAILY: BREAK THE BLOCKADE",sector:day%60+1,starts:day*86400000,ends:(day+1)*86400000,reward:250},
 {id:`weekly-${week}`,kind:"weekly_campaign",title:"WEEKLY: LIBERATION FRONT",sector:week*7%60+1,starts:week*604800000,ends:(week+1)*604800000,reward:1500},
 {id:`boss-${Math.floor(day/3)}`,kind:"boss_invasion",title:"BOSS INVASION",sector:Math.floor(day/3)*13%60+1,starts:Math.floor(day/3)*3*86400000,ends:(Math.floor(day/3)*3+3)*86400000,reward:3000}
]};
const roomFor=id=>{if(!rooms.has(id))rooms.set(id,{players:new Set(),seed:hash(id)});return rooms.get(id)};
const leaderboard=()=>[...db.leaderboard].sort((a,b)=>b.score-a.score).slice(0,100);

wss.on("connection",ws=>{ws.room=null;ws.id=randomUUID();ws.on("message",raw=>{let m;try{m=JSON.parse(raw)}catch{return}
  if(m.type==="join"){
    const r=roomFor(String(m.room||"sector-1"));if(r.players.size>=4)return send(ws,{type:"error",message:"Squad full (4)"});
    ws.room=r;ws.sector=Math.max(1,Math.min(60,Number(m.sector)||1));ws.state={id:ws.id,name:String(m.name||"Pilot"),x:.5,y:.8,hp:100};r.players.add(ws);
    const s=sector(ws.sector);send(ws,{type:"joined",id:ws.id,seed:s.seed,sector:s,players:[...r.players].map(p=>p.state).filter(Boolean),events:events()});broadcast(r,{type:"player_join",player:ws.state},ws);
  } else if(ws.room&&m.type==="state"){
    ws.state={...ws.state,x:Number(m.x)||0,y:Number(m.y)||0,hp:Number(m.hp)||0};broadcast(ws.room,{type:"player_state",player:ws.state},ws);
  } else if(ws.room&&m.type==="liberate"){
    const s=apply(sector(ws.sector),Number(m.amount)||0);broadcast(ws.room,{type:"sector_update",sector:s});
  } else if(m.type==="sector_request"){
    const id=Math.max(1,Math.min(60,Number(m.sector)||1));send(ws,{type:"sector",sector:sector(id)});
  } else if(m.type==="score"){
    const entry={name:String(m.name||ws.state?.name||"Pilot"),score:Math.max(0,Number(m.score)||0),level:Math.max(1,Number(m.level)||1),sector:Math.max(1,Math.min(60,Number(m.sector)||1)),at:Date.now()};db.leaderboard.push(entry);db.leaderboard=db.leaderboard.sort((a,b)=>b.score-a.score).slice(0,500);save();send(ws,{type:"leaderboard",rows:leaderboard()});
  } else if(m.type==="leaderboard") send(ws,{type:"leaderboard",rows:leaderboard()});
  else if(m.type==="events") send(ws,{type:"events",events:events()});
  else if(m.type==="fleet_create") {const id=randomUUID().slice(0,8).toUpperCase();db.fleets[id]={id,name:String(m.name||"STAR FLEET"),members:[ws.id],created:Date.now()};save();ws.fleet=id;send(ws,{type:"fleet_created",fleet:db.fleets[id]});}
  else if(m.type==="fleet_join") {const f=db.fleets[String(m.fleet||"")];if(!f)return send(ws,{type:"error",message:"Fleet not found"});if(f.members.length>=20)return send(ws,{type:"error",message:"Fleet full"});if(!f.members.includes(ws.id))f.members.push(ws.id);ws.fleet=f.id;save();send(ws,{type:"fleet",fleet:f});}
  else if(m.type==="fleet_info") send(ws,{type:"fleet",fleet:db.fleets[String(m.fleet||ws.fleet||"")]||null});
});
ws.on("close",()=>{if(!ws.room)return;const r=ws.room;r.players.delete(ws);broadcast(r,{type:"player_leave",id:ws.id});if(!r.players.size)for(const [id,v] of rooms)if(v===r)rooms.delete(id)})});

console.log(`Interstella galaxy server listening on :${PORT} — 60 sectors`);
