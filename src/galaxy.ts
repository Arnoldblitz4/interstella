import { GALAXY_SIZE, levelSeed } from "./levels";

export type SectorStatus="enemy"|"contested"|"liberated";
export type Sector={id:number;seed:number;name:string;region:string;status:SectorStatus;control:number;players:number;lastUpdated:number};
export type GalaxyEvent={id:string;kind:"boss_invasion"|"weekly_campaign"|"daily_operation";title:string;sector:number;starts:number;ends:number;reward:number};

const regions=["Frontier","Orion","Vega","Cygnus","Draco","Andromeda","Perseus","Helios","Aegis","Nyx","Titan","Eclipse"];
const sites=["Outpost","Colony","Station","Moon","Citadel"];
const names=["Dawn","Haven","Forge","Beacon","Gate"];

export function sectorName(id:number){const i=id-1;return `${regions[i%regions.length]} ${names[Math.floor(i/regions.length)%names.length]} ${sites[Math.floor(i/5)%sites.length]}`;}
export function createGalaxy():Sector[]{return Array.from({length:GALAXY_SIZE},(_,i)=>({id:i+1,seed:levelSeed(i+1),name:sectorName(i+1),region:regions[i%regions.length],status:i===0?"contested":"enemy",control:i===0?25:0,players:0,lastUpdated:Date.now()}));}
export function applyContribution(sector:Sector,amount:number){sector.control=Math.max(0,Math.min(100,sector.control+amount));sector.status=sector.control>=100?"liberated":sector.control>0?"contested":"enemy";sector.lastUpdated=Date.now();return sector;}
export function decaySector(sector:Sector,minutes:number){if(sector.status!=="liberated"&&minutes>0){sector.control=Math.max(0,sector.control-minutes*.08);sector.status=sector.control>0?"contested":"enemy";}return sector;}
export function currentEvents(now=Date.now()):GalaxyEvent[]{const day=Math.floor(now/86400000),week=Math.floor(day/7);return [
 {id:`daily-${day}`,kind:"daily_operation",title:"DAILY: BREAK THE BLOCKADE",sector:(day%GALAXY_SIZE)+1,starts:day*86400000,ends:(day+1)*86400000,reward:250},
 {id:`weekly-${week}`,kind:"weekly_campaign",title:"WEEKLY: LIBERATION FRONT",sector:(week*7%GALAXY_SIZE)+1,starts:week*604800000,ends:(week+1)*604800000,reward:1500},
 {id:`boss-${Math.floor(day/3)}`,kind:"boss_invasion",title:"BOSS INVASION",sector:(Math.floor(day/3)*13%GALAXY_SIZE)+1,starts:Math.floor(day/3)*3*86400000,ends:(Math.floor(day/3)*3+3)*86400000,reward:3000}
];}
