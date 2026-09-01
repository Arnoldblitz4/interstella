export type LevelKind = "liberation" | "escort" | "survival" | "boss";
export type Spawn = { t:number; x:number; kind:"scout"|"zig"|"tank"|"swarmer"|"elite" };
export type GeneratedLevel = { id:number; seed:number; name:string; kind:LevelKind; duration:number; target:number; spawns:Spawn[] };

// Seeded generation: the same level number always produces the same battlefield.
export function levelSeed(id:number) { let x=(id*0x9e3779b9)>>>0; x^=x>>>16; x=Math.imul(x,0x85ebca6b); x^=x>>>13; return x>>>0; }
function rng(seed:number) { let s=seed>>>0; return () => { s=(Math.imul(s^s>>>16,2246822519)+3266489917)>>>0; s^=s>>>13; return (s>>>0)/4294967296; }; }
const names=["Frontier Dawn","Red Nebula","Iron Gate","Void Run","Sovereign Reach","Eclipse Sector","Interstellar Core"];

export function generateLevel(id:number):GeneratedLevel {
  const r=rng(levelSeed(id)), kind:LevelKind=id%7===6?"boss":id%3===1?"survival":id%3===2?"escort":"liberation";
  const duration=70+Math.min(80,id*5), target=kind==="survival"?duration:kind==="boss"?1:100;
  const spawns:Spawn[]=[]; const count=45+id*10;
  for(let i=0;i<count;i++) { const roll=r(); const kind2=roll>.91?"tank":roll>.76?"elite":roll>.57?"zig":roll>.34?"swarmer":"scout"; spawns.push({t:3+i*(duration-5)/count,x:.08+r()*.84,kind:kind2}); }
  if(kind==="boss") spawns.push({t:Math.max(8,duration*.35),x:.5,kind:"elite"});
  return {id,seed:levelSeed(id),name:`${String(id).padStart(2,"0")} · ${names[(id-1)%names.length]}`,kind,duration,target,spawns};
}
