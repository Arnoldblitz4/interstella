type TwistState={stage:number;seen:Set<string>};
const state:TwistState={stage:0,seen:new Set()};
const lines=[
 {at:0,title:"WELCOME ABOARD, PILOT!",text:"MICA // Ship systems nominal. Keep chasing stars!",tone:"bright"},
 {at:8,title:"...THAT WASN'T ON THE MAP",text:"LYRA // I'm reading a signal beneath the combat channel. It knows our callsign.",tone:"strange"},
 {at:16,title:"THE ENEMIES AREN'T ATTACKING",text:"PIP // Wait. They're forming a pattern. They're trying to show us something.",tone:"uneasy"},
 {at:24,title:"DO NOT FOLLOW THE LIGHT",text:"MICA // I have no record of sending that message. Captain... who changed my voice?",tone:"dark"},
 {at:30,title:"INTERSTELLA // ZERO HOUR",text:"LYRA // The war was never outside the ship. We've been flying toward the source.",tone:"final"}
];
function completed(){try{return JSON.parse(localStorage.getItem("interstella-save")||localStorage.getItem("interstella")||"{}").completed||[]}catch{return []}}
function currentStage(c:number[]){let s=0;for(const x of lines)if(x.at>0&&c.includes(x.at))s=Math.max(s,lines.indexOf(x));return s}
function ensure(){let el=document.getElementById("interstella-story");if(el)return el;el=document.createElement("div");el.id="interstella-story";el.innerHTML='<div class="story-card"><div class="story-tag">SHIP COMMS</div><div class="story-title"></div><div class="story-text"></div><button class="story-close">CONTINUE</button></div>';document.body.appendChild(el);el.querySelector(".story-close")!.addEventListener("click",()=>el!.classList.remove("show"));return el}
function show(i:number){const e=ensure(),l=lines[i];e.className="show "+l.tone;(e.querySelector(".story-title") as HTMLElement).textContent=l.title;(e.querySelector(".story-text") as HTMLElement).textContent=l.text;state.seen.add(String(i));navigator.vibrate?.(i>=3?[30,30,60]:15)}
const style=document.createElement("style");style.textContent=`#interstella-story{position:fixed;inset:0;display:none;place-items:center;background:rgba(1,3,10,.68);z-index:9999;font-family:monospace;pointer-events:auto}.story-card{width:min(560px,86vw);padding:24px;border:2px solid #63e6ff;background:#071324;box-shadow:8px 8px 0 #02040a;color:#dff8ff}.story-tag{font-size:11px;letter-spacing:3px;color:#63e6ff}.story-title{font-size:clamp(18px,4vw,32px);font-weight:900;margin:12px 0}.story-text{font-size:14px;line-height:1.6;color:#b7c7d8}.story-close{margin-top:18px;padding:11px 18px;background:#102a45;color:#fff;border:1px solid #63e6ff;font-family:monospace;font-weight:900}.show{display:grid!important}.strange .story-card{border-color:#f6d365}.uneasy .story-card{border-color:#ff9d5c}.dark .story-card{border-color:#ff5477;background:#090a12}.final .story-card{border-color:#c18cff;background:#08050f}`;
document.head.appendChild(style);
let last=-1;setInterval(()=>{const c=completed(),stage=currentStage(c);if(stage>last){last=stage;if(stage>0&&!state.seen.has(String(stage)))setTimeout(()=>show(stage),450)}},900);
window.addEventListener("interstella:twist",(ev:any)=>{const i=Number(ev.detail);if(Number.isFinite(i)&&lines[i])show(i)});
export function triggerTwist(i:number){show(i)}
