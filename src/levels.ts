export type LevelKind = "liberation" | "escort" | "survival" | "boss";
export type Spawn = { t:number; x:number; kind:"scout"|"zig"|"tank"|"swarmer"|"elite" };
export type GeneratedLevel = { id:number; seed:number; name:string; kind:LevelKind; duration:number; target:number; spawns:Spawn[] };

export const GALAXY_SIZE = 60;
export function levelSeed(id:number) { let x=(id*0x9e3779b9)>>>0; x^=x>>>16; x=Math.imul(x,0x85ebca6b); x^=x>>>13; return x>>>0; }
function rng(seed:number) { let s=seed>>>0; return () => { s=(Math.imul(s^s>>>16,2246822519)+3266489917)>>>0; s^=s>>>13; return (s>>>0)/4294967296; }; }
const regions=["Frontier","Orion","Vega","Cygnus","Draco","Andromeda","Perseus","Helios","Aegis","Nyx","Titan","Eclipse"];
const sites=["Outpost","Colony","Station","Moon","Citadel"];

export function generateLevel(id:number):GeneratedLevel {
  const safeId=Math.max(1,Math.min(GALAXY_SIZE,Math.floor(id)));
  const r=rng(levelSeed(safeId));
  const kind:LevelKind=safeId%11===0?"boss":safeId%3===1?"survival":safeId%3===2?"escort":"liberation";
  const duration=70+Math.min(140,safeId*4);
  const target=kind==="survival"?duration:kind==="boss"?1:100;
  const spawns:Spawn[]=[];
  const count=50+safeId*7;
  for(let i=0;i<count;i++) {
    const roll=r();
    const kind2=roll>.93?"tank":roll>.78?"elite":roll>.58?"zig":roll>.34?"swarmer":"scout";
    spawns.push({t:3+i*(duration-5)/count,x:.08+r()*.84,kind:kind2});
  }
  if(kind==="boss") spawns.push({t:Math.max(8,duration*.35),x:.5,kind:"elite"});
  const region=regions[(safeId-1)%regions.length];
  const site=sites[Math.floor((safeId-1)/regions.length)%sites.length];
  return {id:safeId,seed:levelSeed(safeId),name:`${String(safeId).padStart(2,"0")} · ${region} ${site}`,kind,duration,target,spawns};
}
