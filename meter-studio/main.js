// Meter Studio, API 10. Each card carries its own resource, sensor and appearance.
const RESOURCES={electricity:{name:'Stroom',icon:'flash',color:'#a68bfa'},gas:{name:'Gas',icon:'fire',color:'#4bb9df'},solar:{name:'Zon',icon:'solar-power',color:'#efb448'},water:{name:'Water',icon:'water',color:'#5baaff'}};
const ROOM_METERS={
 temperature:{name:'Temperatuur',icon:'thermometer',color:'#f6ab61',maximum:40},
 humidity:{name:'Luchtvochtigheid',icon:'water-percent',color:'#5baaff',maximum:100},
 voc:{name:'VOC',icon:'blur',color:'#a68bfa'},
 air:{name:'Luchtkwaliteit',icon:'weather-windy',color:'#67c4ac'},
 custom:{name:'Sensor',icon:'gauge',color:'#73b6ff'}
};
Object.assign(RESOURCES,ROOM_METERS);
const LEVEL_COLORS=['#338b65','#55a565','#7eb364','#adbf59','#d2c64e','#e5bc45','#f3aa40','#f3953c','#ed8038','#e66c37','#da5535','#ca4231'];
const LEVELS=[0,.02,.04,.06,.09,.13,.18,.25,.35,.5,.7,1];
const UNITS={w:['power',1,'W'],kw:['power',1000,'kW'],wh:['energy',.001,'Wh'],kwh:['energy',1,'kWh'],mwh:['energy',1000,'MWh'],l:['volume',1,'L'],liter:['volume',1,'L'],liters:['volume',1,'L'],m3:['volume',1000,'m³'],'l/min':['flow',1,'L/min'],'l/m':['flow',1,'L/min'],lpm:['flow',1,'L/min'],'l/h':['flow',1/60,'L/h'],'l/s':['flow',60,'L/s'],'m3/h':['flow',1000/60,'m³/h'],'m3/min':['flow',1000,'m³/min']};
const DAY_NAMES=['Zo','Ma','Di','Wo','Do','Vr','Za'];
const seen=new Map(),histories=new Map();
let queued=false,watchKey='',generation=0,activeLoads=0;
function finite(v){return typeof v==='number'&&Number.isFinite(v);}
function numeric(st){if(!st||['unknown','unavailable',''].includes(st.state))return null;if(finite(st.value))return st.value;const s=String(st.state).trim();return /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(s)?Number(s.replace(',','.')):null;}
function unitKey(u){return String(u||'').trim().toLowerCase().replace(/³/g,'3').replace(/\s/g,'');}
function entityId(v){return typeof v==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(v.trim())?v.trim():'';}
function positive(v,fallback){return typeof v!=='boolean'&&v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))&&Number(v)>0?Number(v):fallback;}
function color(v,fallback){return typeof v==='string'&&(/^#[0-9a-f]{6}$/i.test(v)||/^[a-z][a-z-]*$/.test(v))?v:fallback;}
function meterIcon(v,fallback){const s=typeof v==='string'?v.trim().toLowerCase().replace(/^mdi:/,''):'';return 'mdi:'+(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)?s:fallback);}
function config(card){
 const raw=card&&card.settings||{},kind=Object.prototype.hasOwnProperty.call(RESOURCES,raw.kind)?raw.kind:'electricity',mode=!ROOM_METERS[kind]&&['now','today','month','history'].includes(raw.mode)?raw.mode:'now';
 return {...raw,kind,mode,icon:meterIcon(raw.icon,RESOURCES[kind].icon),entity:entityId(raw.entity),style:['steps','fill','ring','icon'].includes(raw.style)?raw.style:'ring',unit:raw.unit&&raw.unit!=='auto'?String(raw.unit):'auto',bg:raw.black_background===true?'#000000':color(raw.background,'card'),accent:color(raw.accent,RESOURCES[kind].color),title:String(raw.title||'').trim().slice(0,50)||RESOURCES[kind].name+(ROOM_METERS[kind]?'':' '+({now:'nu',today:'vandaag',month:'deze maand',history:'in dagen'})[mode])};
}
function targetHistoryUnit(c){return c.unit!=='auto'?c.unit:c.kind==='water'?'L':c.kind==='gas'?'m³':'kWh';}
function historyKey(c){return c.entity+'|'+targetHistoryUnit(c);}
function dayKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function midnight(offset){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate()+offset);}
function register(c){
 if(c.entity)seen.set(c.entity,Date.now());
 for(const {id} of detailTiles(c))if(id)seen.set(id,Date.now());
 if(c.mode==='history'&&c.entity){const key=historyKey(c);if(!histories.has(key))histories.set(key,{entity:c.entity,unit:targetHistoryUnit(c),samples:[],error:'Gegevens laden…',loaded:0,day:'',attempt:0,busy:false,touched:Date.now()});else histories.get(key).touched=Date.now();}
 schedule();
}
function schedule(){if(!queued){queued=true;setTimeout(flush,0);}}
function flush(){
 queued=false;const now=Date.now();
 for(const [id,t] of seen)if(now-t>3600000)seen.delete(id);
 const ids=[...seen.keys()].sort(),key=ids.join('|');
 if(key!==watchKey){watchKey=key;retoon.watch(ids,()=>retoon.update());retoon.update();}
 for(const [key,h] of histories){if(now-h.touched>3600000&&!h.busy){histories.delete(key);continue;}if(activeLoads<2&&!h.busy&&now-h.attempt>=60000&&(now-h.loaded>=900000||h.day!==dayKey(new Date())))loadHistory(key,h);}
}
async function loadHistory(key,h){
 const current=retoon.state(h.entity),sourceUnit=current&&UNITS[unitKey(current.unit||current.attributes&&current.attributes.unit_of_measurement)],u=UNITS[unitKey(h.unit)];
 if(sourceUnit&&['power','flow'].includes(sourceUnit[0])){h.error='Kies een verbruiksteller, geen W- of flowsensor';h.attempt=Date.now();retoon.update();return;}
 if(!u||!['energy','volume'].includes(u[0])){h.error='Kies kWh, m³ of L voor daghistorie';h.attempt=Date.now();retoon.update();return;}
 h.busy=true;h.attempt=Date.now();activeLoads++;const gen=generation;
 try{
  const response=await retoon.call('recorder.get_statistics',{statistic_ids:[h.entity],start_time:midnight(-8).toISOString(),end_time:midnight(1).toISOString(),period:'day',types:['change'],units:u[0]==='energy'?{energy:h.unit}:{volume:h.unit}},{response:true});
  if(gen!==generation||histories.get(key)!==h)return;
  const list=response&&response.statistics&&response.statistics[h.entity];if(!Array.isArray(list))throw new Error('Geen dagstatistieken');
  h.samples=list.map(row=>({date:typeof row.start==='number'?new Date(row.start<1e12?row.start*1000:row.start):new Date(row.start),value:finite(row.change)&&row.change>=0?row.change:null})).filter(r=>Number.isFinite(+r.date));
  h.loaded=Date.now();h.day=dayKey(new Date());h.error=h.samples.some(s=>s.value!==null)?'':'Geen dagstatistieken voor deze teller';
 }catch(e){if(gen===generation)h.error='Historie niet beschikbaar';}
 finally{h.busy=false;activeLoads--;retoon.update();schedule();}
}
function reading(c){
 if(!c.entity)return {value:null,unit:'',error:'Kies een sensor in de tegelinstellingen'};
 const st=retoon.state(c.entity),raw=numeric(st),source=st&&(st.unit||st.attributes&&st.attributes.unit_of_measurement)||'',from=UNITS[unitKey(source)];
 if(raw===null&&ROOM_METERS[c.kind]&&st&&typeof st.state==='string'&&!['unknown','unavailable',''].includes(st.state.trim().toLowerCase())){
  return {value:null,unit:'',error:'',status:st.state.trim().slice(0,32)};
 }
 if(raw===null)return {value:null,unit:c.unit==='auto'?source:c.unit,error:'Geen meetwaarde'};
 if(c.unit==='auto')return {value:raw,unit:from?from[2]:source,error:''};
 const to=UNITS[unitKey(c.unit)];if(!from||!to||from[0]!==to[0])return {value:null,unit:c.unit,error:'Eenheid past niet bij de sensor'};
 return {value:raw*from[1]/to[1],unit:to[2],error:''};
}
function decimals(unit,value){const u=unitKey(unit);return ['w','wh','l','liter'].includes(u)?0:['l/min','l/m','lpm','l/h','m3/h'].includes(u)?1:2;}
function fmt(value,unit){return value===null?'—':value.toFixed(decimals(unit,value)).replace('.',',');}
function minimum(c){
 const n=Number(c.minimum);
 return Number.isFinite(n)?n:0;
}
function maximum(c,r){
 if(ROOM_METERS[c.kind]){
  const preset=ROOM_METERS[c.kind].maximum;
  const configured=Number(c.maximum||0);
  if(configured!==0&&Number.isFinite(configured)&&configured>minimum(c))return configured;
  return preset>minimum(c)?preset:null;
 }
 if(positive(c.maximum,0))return Number(c.maximum);
 const u=UNITS[unitKey(r.unit)],base=u&&u[0];
 if(base==='power')return 5000/u[1];
 if(base==='flow')return (c.kind==='gas'?4000/60:20)/u[1];
 if(base==='energy')return (c.mode==='month'?1000:25)/u[1];
 if(base==='volume')return (c.kind==='gas'?(c.mode==='month'?300000:10000):(c.mode==='month'?15000:500))/u[1];
 return 100;
}
function label(el,s,x,y,w,font='body',fg='text',align='center'){el.text(s,{x,y,w,font,color:fg,textAlign:align});}
function valueFont(text,w,preferred){const sizes={big:78,mid:34,head:22,body:19,small:16};for(const f of [preferred,'head','body','small'])if(text.length*sizes[f]*.58<=w-16)return f;return 'small';}
function valueText(c,r){if(r.status)return r.status;const formatted=c.kind==='humidity'&&unitKey(r.unit)==='%'&&r.value!==null?String(Math.round(r.value)):fmt(r.value,r.unit);return r.error&&r.error!=='Geen meetwaarde'&&c.entity?r.error:formatted+(r.unit?' '+r.unit:'');}
function baseWidth(w,h){return Math.max(20,Math.min(88,Math.round(Math.min(w,h)*.25)));}
function point(cx, cy, r, fraction) {
  const a = Math.PI * (1 - fraction);
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
}
// Native arcs retain the existing geometry and keep colour boundaries square.
// Single-colour tracks and fills have two rounded ends. The outer circles
// below round just the exposed ends of the three-colour band.
function ribbon(el,cx,cy,r,width,start,end,color,roundStart=false,roundEnd=false){
 if(end<=start)return;
 el.arc({
  x:cx,y:cy,r,width,
  start:180+180*start,end:180+180*end,
  color,rounded:roundStart&&roundEnd
 });
 if(roundStart&&!roundEnd){
  const [x,y]=point(cx,cy,r,start);
  el.circle({x,y,r:width/2,bg:color,border:0});
 }
 if(roundEnd&&!roundStart){
  const [x,y]=point(cx,cy,r,end);
  el.circle({x,y,r:width/2,bg:color,border:0});
 }
}
function band(el,cx,cy,r,width){
 const colors=['#43a047','#ffab00','#e04436'],cuts=[0,.47,.79,1];
 for(let i=0;i<colors.length;i++)ribbon(el,cx,cy,r,width,cuts[i],cuts[i+1],colors[i],i===0,i===colors.length-1);
}
function ringView(el,c,r,w,h,full){
 const small=h<155,big=full&&w>=500&&h>=350,top=small?29:43,numberFont=!full?'head':big?'big':small?'head':'mid',numberH=big?90:small?28:42;
 const radius=Math.max(10,Math.min((w-36)/2,h-top-numberH-12,full?190:145));
 const cx=w/2,cy=top+radius,width=Math.max(6,Math.min(12,Math.round(radius*.09)));
 const room=ROOM_METERS[c.kind],max=maximum(c,r),min=room?minimum(c):0;
 const fraction=r.value===null||max===null?0:Math.max(0,Math.min(1,((room?r.value:Math.abs(r.value))-min)/(max-min)));
 if(c.mode==='now'&&!room&&r.value!==null){
  band(el,cx,cy,radius,width);
  // A tapered pointer sits at the rim, with its broad end inside the meter.
  const outer=point(cx,cy,radius+width*.04,fraction);
  const length=Math.max(9,width*1.85);
  const inner=point(cx,cy,radius-length,fraction);
  const angle=Math.PI*(1-fraction);
  const half=Math.max(3,width*.52);
  const dx=Math.sin(angle)*half,dy=Math.cos(angle)*half;
  el.line([...outer,...inner],{width:3,color:'text'});
  for(let offset=-half;offset<=half;offset++){
   el.line([...outer,inner[0]+dx*offset/half,inner[1]+dy*offset/half],{width:2,color:'text'});
  }
  el.circle({x:inner[0],y:inner[1],r:half,bg:'text',border:0});
 }else{
  ribbon(el,cx,cy,radius,width,0,1,'#283241',true,true);
  if(r.value!==null&&max!==null)ribbon(el,cx,cy,radius,width,0,fraction,c.accent,true,true);
 }
 const text=valueText(c,r);
 if(radius>=30){
  const font=valueFont(text,Math.min(w,(full?1.35:1.7)*radius),big?'mid':numberFont);
  const textHeight={mid:38,head:26,body:22,small:19}[font];
  label(el,text,6,cy-textHeight-2,w-12,font,r.value===null&&!r.status?'muted':'text');
 }else label(el,text,6,cy+7,w-12,valueFont(text,w,numberFont),r.value===null&&!r.status?'muted':'text');
}
function iconView(el,c,r,w,h,full){
 const compact=h<130;
 const size=compact&&h<108?'mid':'big';
 const iconHeight=size==='big'?48:32;
 const font=valueFont(valueText(c,r),w,full&&!compact?'big':'head');
 const textHeight={big:90,mid:42,head:28,body:24,small:20}[font];
 const titleY=compact?4:10;
 const stackHeight=iconHeight+6+textHeight;
 const iconY=Math.max(compact?26:40,Math.floor((h+titleY+24-stackHeight)/2));
 label(el,c.title,8,titleY,w-16,compact?'small':'head','muted');
 el.icon(c.icon,{x:Math.round((w-iconHeight)/2),y:iconY,size,color:c.accent});
 label(el,c.entity?valueText(c,r):'Kies een sensor',8,iconY+iconHeight+6,w-16,c.entity?font:'small',r.value===null&&!r.status?'muted':'text');
}
function valueView(el,c,r,w,h,full,originalH){
 if(c.style==='icon'&&h>=90&&w>=120){iconView(el,c,r,w,h,full);return;}
 const combined=valueText(c,r),fg=r.value===null&&!r.status?'muted':'text';
 if(h<95||w<150){label(el,c.title.slice(0,Math.max(6,Math.floor(w/9))),6,3,w-12,'small','muted');label(el,c.entity?combined:'Kies een sensor',6,Math.max(24,h/2),w-12,c.entity?valueFont(combined,w,'head'):'small',fg);return;}
 const big=full&&w>=500,short=h<155,numberFont=!full?'head':big?'big':short?'head':'mid',numberH=big?90:short?28:42,top=short?30:44,gap=big?14:short?6:8,footer=full&&h>=300?24:0;
 label(el,c.title,8,short?4:8,w-16,short||w<200?'small':'head','muted');
 if(!c.entity){label(el,r.error,8,Math.max(38,h/2),w-16,'small','muted');return;}
 if(c.style==='ring'||ROOM_METERS[c.kind]){ringView(el,c,r,w,h,full);return;}
 const barH=Math.max(14,Math.min(full?240:190,h-top-gap-numberH-8-footer)),barW=baseWidth(w,originalH),x=(w-barW)/2,max=maximum(c,r),fraction=r.value===null?0:Math.min(1,Math.abs(r.value)/max);
 if(c.style==='steps'){
  const pitch=barH/12,thickness=Math.max(1,pitch*.61);let active=-1;
  if(r.value!==null){active=0;while(active<11&&fraction>=LEVELS[active+1])active++;}
  LEVEL_COLORS.forEach((color,i)=>{const width=i===active?barW:barW*.82;el.box({x:(w-width)/2,y:top+(11-i)*pitch,w:width,h:thickness,bg:r.value===null?'muted':color,border:0,radius:1});});
 }else{
  el.box({x,y:top,w:barW,h:barH,bg:'#283241',radius:3,border:0});
  if(r.value!==null&&fraction>0){const fill=Math.max(1,barH*fraction);el.box({x,y:top+barH-fill,w:barW,h:fill,bg:c.accent,radius:0,border:0});}
  el.line([x,top+barH/2,x+barW,top+barH/2],{width:2,color:c.bg});
 }
 label(el,combined,8,top+barH+gap,w-16,valueFont(combined,w,numberFont),fg);
 const note=r.error||(!r.unit?'Eenheid ontbreekt':r.value!==null&&r.value<0?'Negatieve waarde / teruglevering':c.mode==='now'?'Actueel':c.mode==='today'?'Vandaag':'Deze maand');
 if(footer)label(el,note,8,h-22,w-16,'small','muted');
}
function historyView(el,c,full){
 const w=el.width,h=el.height,n=full&&w>=500?7:3,state=histories.get(historyKey(c)),unit=targetHistoryUnit(c);
 label(el,c.title,8,8,w-16,'head','muted');
 if(!c.entity){label(el,'Kies een verbruiksteller in de tegelinstellingen',8,h/2,w-16,'small','muted');return;}
 if(!state||!state.samples.some(s=>s.value!==null)){el.icon(c.icon,{align:'center',y:-24,size:'big',color:c.accent});label(el,state?state.error:'Gegevens laden…',8,Math.max(82,h*.63),w-16,'small','muted');return;}
 if(h<160||w<200){label(el,'Vergroot de tegel voor daghistorie',8,h/2,w-16,'small','muted');return;}
 const items=Array.from({length:n},(_,i)=>{const date=midnight(-n+i),match=state.samples.find(row=>dayKey(row.date)===dayKey(date));return {date,value:match?match.value:null};});
 const known=items.map(i=>i.value).filter(v=>v!==null),max=positive(c.maximum,Math.max(1,...known)),top=58,bottom=h-(full?90:50),space=Math.max(15,bottom-top),col=(w-24)/n,bw=Math.min(baseWidth(w,h),col-10);
 items.forEach((item,i)=>{const x=12+i*col+(col-bw)/2;
  if(item.value!==null){const bh=item.value===0?2:Math.max(2,Math.min(1,item.value/max)*space);el.box({x,y:bottom-bh,w:bw,h:bh,bg:c.accent,radius:3,border:0});}else el.line([x,bottom,x+bw,bottom],{color:'muted',width:2});
  label(el,fmt(item.value,unit),12+i*col,35,col,'small',item.value===null?'muted':'text');
  label(el,DAY_NAMES[item.date.getDay()],12+i*col,bottom+6,col,'small','muted');
  if(full)label(el,item.date.getDate()+'/'+(item.date.getMonth()+1),12+i*col,bottom+25,col,'small','muted');
 });
 label(el,unit+' · laatste '+n+' afgeronde dagen',8,h-23,w-16,'small','muted');
 if(full)label(el,'Totaal bekende dagen: '+fmt(known.reduce((a,b)=>a+b,0),unit)+' '+unit+(known.length<n?' · ontbrekende dagen als —':''),8,h-48,w-16,'small','muted');
 if(state.error)label(el,'Bijwerken mislukt · eerder geladen gegevens',8,h-69,w-16,'small','warn');
}
function detailTiles(c){
 const rows=Array.isArray(c.detail_tiles)?c.detail_tiles:[];
 const custom=rows.slice(0,8).map(row=>({
  id:entityId(row&&row.entity),
  title:String(row&&row.title||'').trim().slice(0,50),
  icon:'gauge', color:c.accent
 })).filter(row=>row.id);
 return custom;
}
function meterDetails(el,c,r,details){
 const w=el.width,h=el.height,wide=w>=700,gap=12,padding=12;
 const meterWidth=wide?Math.floor(w*.45):w;
 const gridX=wide?meterWidth+gap:padding;
 const gridY=wide?55:Math.floor(h*.43);
 const columns=details.length===1?1:2;
 const rows=Math.ceil(details.length/columns);
 const cellWidth=Math.floor((w-gridX-padding-gap*(columns-1))/columns);
 const cellHeight=Math.floor((h-gridY-padding-gap*(rows-1))/rows);
 const meterTop=wide?Math.floor(h*.21):30;
 const meterHeight=(wide?h:gridY)-meterTop-8;
 label(el,c.kind==='water'?'Waterverbruik':c.title,16,8,w-32,'head','text','left');
 const meter=el.box({x:0,y:meterTop,w:meterWidth,h:meterHeight,bg:c.bg,border:0});
 valueView(meter,c,r,meterWidth,meterHeight,true,h);
 details.forEach(({id,title,icon,color},i)=>{
  const state=id?retoon.state(id):null;
  const value=numeric(state);
  const unit=state&&(state.unit||state.attributes&&state.attributes.unit_of_measurement)||'';
  const status=state&&String(state.state??'').trim();
  const display=value!==null?fmt(value,unit):status&&!['unknown','unavailable'].includes(status.toLowerCase())?status:'—';
  const x=gridX+(i%columns)*(cellWidth+gap);
  const y=gridY+Math.floor(i/columns)*(cellHeight+gap);
  const small=cellHeight<125,short=cellHeight<80;
  const valueY=y+(short?(cellHeight<50?20:25):Math.max(34,Math.floor(cellHeight*.38)));
  const caption=display==='—'?(id?'Geen meetwaarde':'Sensor instellen'):unit;
  const text=short&&unit&&value!==null?display+' '+unit:display;
  el.box({x,y,w:cellWidth,h:cellHeight,bg:'card',radius:16,border:0});
  if(!short)el.icon('mdi:'+icon,{x:x+12,y:y+10,size:'small',color});
  const titleInset=short?14:46;
  label(el,title||state&&state.name||id||'Detail',x+titleInset,y+(short?(cellHeight<50?2:5):15),cellWidth-titleInset-12,'small','muted','left');
  label(el,text,x+14,valueY,cellWidth-28,valueFont(text,cellWidth-28,short?'small':small?'head':'mid'),'text','left');
  if(caption&&!short)label(el,caption,x+14,valueY+(small?27:44),cellWidth-28,'small','muted','left');
 });
}
function draw(el,card,full){
 const c=config(card);register(c);const bg=full&&c.kind==='water'&&c.mode!=='history'&&c.bg==='card'?'#000000':c.bg;
 el.set({bg,border:0,borderColor:bg});
 if(c.mode==='history'){historyView(el,c,full);return;}
 const r=reading(c);
 const details=full?detailTiles(c):[];
 if(details.length&&el.width>=360&&el.height>=380){meterDetails(el,{...c,bg},r,details);return;}
 valueView(el,c,r,el.width,el.height,full,el.height);
}
retoon.tile((el,card)=>draw(el,card,false));
retoon.screen((el,card)=>draw(el,card,true));
retoon.onSettings(()=>{generation++;seen.clear();histories.clear();retoon.update();schedule();});
setInterval(()=>{flush();retoon.update();},60000);
