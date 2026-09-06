export type SecretSpawn={t:number;x:number;kind:"scout"|"zig"|"tank"|"swarmer"|"elite"|"shielded"};
export type SecretLevel={id:number;name:string;kind:"survival"|"escort"|"boss"|"liberation";duration:number;target:number;spawns:SecretSpawn[];reward:number;requirement:string};
const SECRET_REQUIREMENTS:Record<number,number>={1:5,2:10,3:15,4:20,5:25,6:30};
export function secretUnlocked(id:number,completed:number[]){return completed.includes(SECRET_REQUIREMENTS[id]);}
export function unlockedSecrets(completed:number[]){return Object.keys(SECRET_REQUIREMENTS).map(Number).filter(id=>secretUnlocked(id,completed));}
export function generateSecretLevel(id:number):SecretLevel{
 const safe=Math.max(1,Math.min(6,Math.floor(id)));const names=["VOID RIFT","PHANTOM MOON","ECLIPSE RUN","LOST ARMADA","RED GIANT","ZERO HOUR"];const kinds=["survival","escort","liberation","boss","survival","boss"] as const;const duration=[48,58,70,76,62,90][safe-1];const target=kinds[safe-1]==="survival"?duration:kinds[safe-1]==="boss"?1:100;const spawns:SecretSpawn[]=[];
 for(let i=0;i<24+safe*7;i++){const roll=((i*37+safe*19)%100)/100;const kind=roll>.9?"elite":roll>.78?"shielded":roll>.62?"zig":roll>.38?"swarmer":"scout";spawns.push({t:2+i*(duration-5)/(24+safe*7),x:.08+(((i*53+safe*11)%84)/100),kind})}
 if(kinds[safe-1]==="boss")spawns.push({t:Math.max(8,duration*.28),x:.5,kind:"elite"});return{id:safe,name:"SECRET // "+names[safe-1],kind:kinds[safe-1],duration,target,spawns,reward:300+safe*175,requirement:"CLEAR MISSION "+SECRET_REQUIREMENTS[safe]};
}
