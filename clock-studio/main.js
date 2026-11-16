const MAP=[[-72,-72,-52],[-72,-72,-46],[168,168,-46],[-72,-66,-40],[-66,-54,-34],[138,150,-34],[-66,-54,-28],[18,30,-28],[120,150,-28],[-66,-42,-22],[18,30,-22],[48,48,-22],[120,144,-22],[-72,-42,-16],[12,36,-16],[48,48,-16],[126,132,-16],[144,144,-16],[-78,-36,-10],[18,36,-10],[120,120,-10],[150,150,-10],[-78,-42,-4],[12,36,-4],[120,120,-4],[138,144,-4],[-78,-54,2],[12,42,2],[114,114,2],[-78,-60,8],[-12,48,8],[126,126,8],[-90,-84,14],[-12,36,14],[48,48,14],[78,78,14],[102,108,14],[-102,-102,20],[-90,-90,20],[-12,54,20],[78,84,20],[96,102,20],[-108,-102,26],[-12,30,26],[42,48,26],[60,114,26],[-114,-84,32],[-6,12,32],[24,24,32],[36,120,32],[-120,-78,38],[-6,-6,38],[24,114,38],[126,126,38],[-120,-66,44],[0,24,44],[42,42,44],[54,132,44],[144,144,44],[-126,-72,50],[6,144,50],[-132,-90,56],[-72,-66,56],[12,12,56],[24,132,56],[156,162,56],[-162,-96,62],[-78,-78,62],[-48,-48,62],[6,12,62],[24,174,62],[-162,-120,68],[-108,-108,68],[-90,-84,68],[-72,-66,68],[-48,-36,68],[18,36,68],[54,174,68],[-120,-120,74],[-54,-24,74],[90,108,74],[-96,-18,80],[24,24,80],[96,96,80]];
// Clock Studio Duo 1.4.6. ReToon controls dimming/page switching.
const IS_DIM=!!(retoon.app&&retoon.app.id==='clock-studio-dim');
const DEFAULT_FACE=IS_DIM?'minimal':'world';
let profileCache=null,profileRaw=null;
const THEME={blauw:['#86b5ff','#b58aff'],paars:['#c49aff','#b58aff'],wit:['#eef1f7','#eef1f7'],rood:['#ff625b','#ff625b'],groen:['#69d6b1','#69d6b1']};
function S(){
 const raw=retoon.settings||{},code=String(raw.advanced_profile||'').trim();
 if(profileRaw!==code){profileRaw=code;profileCache={};try{const value=JSON.parse(code||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))profileCache=value;}catch(e){}}
 const theme=THEME[raw.theme]||(IS_DIM?THEME.wit:THEME.blauw),layout=String(raw.layout||DEFAULT_FACE).trim().toLowerCase(),valid=FACES.includes(layout)?layout:'auto';
 const common={layout:valid};
 return {...raw,...common,accent:raw.accent||theme[0],hour_color:raw.hour_color||theme[1],minute_color:raw.minute_color||'#eef1f7',second_color:raw.second_color||'#ffbd6a',...profileCache};
}
const DAYS=['zo','ma','di','wo','do','vr','za'];
const MONTHS=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const FACES=['auto','minimal','classic','square','square-small','digital','stacked','world','calendar'];
function num(k,d,lo,hi){const v=S()[k];return v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))?Math.max(lo,Math.min(hi,Number(v))):d;}
function yes(k,d=true){return S()[k]===undefined?d:S()[k]===true;}
function color(k,d){const v=S()[k];return typeof v==='string'&&(/^(#[\da-f]{6}|[a-z][a-z0-9_-]*)$/i.test(v))?v:d;}
function pad(n){return String(n).padStart(2,'0');}
function dateText(n,short=false){return DAYS[n.getDay()]+' '+n.getDate()+' '+(short?MONTHS[n.getMonth()].slice(0,3):MONTHS[n.getMonth()]);}
function palette(n){
 return {bg:color('background',IS_DIM?'#000000':'#080b10'),fg:color('foreground','#eef1f7'),muted:'#82909f',accent:color('accent','#86b5ff'),hour:color('hour_color','#b58aff'),minute:color('minute_color','#eef1f7'),second:color('second_color','#ffbd6a')};
}
function faceFor(w,h,full){
 const v=String(S().layout||'auto').toLowerCase().trim();
 let f=FACES.includes(v)?v:'auto';
 if(f==='auto')f=w/h>=1.65?'digital':w<340||h<240?'square-small':'classic';
 if(f==='calendar'&&(w<500||h<260))f='classic';
 if(f==='world'&&(w<180||h<130))f='digital';return f;
}

// Keep only the changing elements for each recent card or full-screen drawing.
// ReToon owns their lifetime; older drawings are bounded as in powerflow.
let drawings=[];
function rebuild(){drawings=[];retoon.update();}
function remember(d){drawings.push(d);if(drawings.length>8)drawings.shift();}
function text(el,t,x,y,w,font,color,align='center'){return el.text(t,{x,y,w,font,color,textAlign:align});}
function liveText(d,el,n,value,x,y,w,font,color,align='center'){
 let previous=value(n);const node=text(el,previous,x,y,w,font,color,align);
 d.refresh.push(now=>{const next=value(now);if(next!==previous){node.set({text:next});previous=next;}});
}
function hand(d,el,n,pointsFor,width,color,round=true){
 let points=pointsFor(n);const line=el.line(points,{width,color});
 const caps=round?[el.circle({x:points[0],y:points[1],r:width/2,bg:color,border:0}),el.circle({x:points[2],y:points[3],r:width/2,bg:color,border:0})]:[];
 d.refresh.push(now=>{const next=pointsFor(now);if(next.every((v,i)=>v===points[i]))return;
  line.set({points:next});if(round){caps[0].set({x:next[0],y:next[1]});caps[1].set({x:next[2],y:next[3]});}points=next;
 });
}
function analog(d,el,r,n,p,style){
 const cx=r.x+r.w/2,cy=r.y+r.h/2,rx=Math.max(10,r.w/2-8),ry=Math.max(10,r.h/2-8),rad=Math.min(rx,ry),square=style==='square'||style==='square-small';
 const ax=style==='square'?rx:rad,ay=style==='square'?ry:rad;
 const pt=(turn,k)=>{const a=turn*2*Math.PI-Math.PI/2,s=Math.sin(a),c=Math.cos(a);const len=square?Math.min(ax/Math.max(.00001,Math.abs(c)),ay/Math.max(.00001,Math.abs(s))):rad;return [cx+c*len*k,cy+s*len*k];};
 const edge=.94;
 if(yes('dial_border',false)||style==='square-small'){if(square)el.box({x:cx-ax,y:cy-ay,w:ax*2,h:ay*2,bg:p.bg,border:2,borderColor:p.muted,radius:Math.min(ax,ay)*.13});else el.circle({x:cx,y:cy,r:rad,bg:p.bg,border:2,borderColor:p.muted});}
 const showTicks=yes('minute_ticks',true),tickCount=showTicks?60:12;
 for(let i=0;i<tickCount;i++){const t=i/tickCount,major=tickCount===12||i%5===0;const a=pt(t,edge-(major?.105:.045)),b=pt(t,edge);el.line([...a,...b],{width:major?Math.max(2,rad*.013):Math.max(1,rad*.006),color:major?p.fg:p.muted});}
 if(yes('numbers',true)&&style!=='minimal'&&rad>=56){for(const [v,t]of [['12',0],['3',.25],['6',.5],['9',.75]]){const q=pt(t,.68),font=rad>=125?'mid':rad>=75?'head':'small',fh=rad>=125?40:rad>=75?26:20;text(el,v,q[0]-28,q[1]-fh/2,56,font,p.fg);}}
 const showSec=yes('show_seconds',false);
 const mins=now=>now.getMinutes()+(showSec?now.getSeconds()/60:0),hrs=now=>now.getHours()%12+mins(now)/60;
 const thick=num('hand_width',100,50,180)/100,round=yes('round_hands',true);
 if(yes('hour_hand',true))hand(d,el,n,now=>[...pt(hrs(now)/12+.5,.035),...pt(hrs(now)/12,.48)],Math.max(3,rad*.047)*thick,p.hour,round);
 if(yes('minute_hand',true))hand(d,el,n,now=>[...pt(mins(now)/60+.5,.045),...pt(mins(now)/60,.76)],Math.max(2,rad*.024)*thick,p.minute,round);
 if(showSec)hand(d,el,n,now=>[...pt(now.getSeconds()/60+.5,.17),...pt(now.getSeconds()/60,.87)],Math.max(1,rad*.009),p.second,false);
 el.circle({x:cx,y:cy,r:Math.max(4,rad*num('center_size',5.7,2,12)/100),bg:p.minute,border:0});
}
// Seven retained, subtly rounded segments per digit: 28 boxes for HH:MM,
// plus the two colon dots. Only segments whose state changes are recoloured.
const SEGMENTS={a:[6,0,48,10],b:[50,8,10,36],c:[50,56,10,36],d:[6,90,48,10],e:[0,56,10,36],f:[0,8,10,36],g:[6,45,48,10]};
const SEGMENT_DIGITS={'0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg'};
function digits(d,el,n,valueFor,r,color,colonFor=()=>true){
 const value=valueFor(n),chars=[...value],units=chars.map(c=>c===':'?.20:.60),total=units.reduce((a,b)=>a+b,0)+.10*(chars.length-1),height=Math.max(1,Math.min(r.h,r.w/total)),scale=height/100;
 const off=/^#[\da-f]{6}$/i.test(color)?'#'+[1,3,5].map(i=>Math.round(parseInt(color.slice(i,i+2),16)*.13).toString(16).padStart(2,'0')).join(''):'#171c25';
 let x=r.x+(r.w-height*total)/2;const y=r.y+(r.h-height)/2;
 const cells=[];let dots=[],lastColon=colonFor(n),previous=value;
 for(let i=0;i<chars.length;i++){
  const c=chars[i],gw=units[i]*height;
  if(c===':'){const size=Math.max(1,height*.075);dots=[.35,.65].map(dy=>el.box({x:x+(gw-size)/2,y:y+height*dy-size/2,w:size,h:size,bg:color,opacity:lastColon?1:0,radius:0,border:0}));}
  else{const lit=SEGMENT_DIGITS[c]||'',nodes={};for(const key of 'abcdefg'){const q=SEGMENTS[key];nodes[key]=el.box({x:x+q[0]*scale,y:y+q[1]*scale,w:q[2]*scale,h:q[3]*scale,bg:lit.includes(key)?color:off,radius:2.5*scale,border:0});}cells.push({i,nodes});}
  x+=gw+height*.10;
 }
 d.refresh.push(now=>{
  const next=valueFor(now);
  if(next!==previous){for(const cell of cells){if(next[cell.i]===previous[cell.i])continue;
   const before=SEGMENT_DIGITS[previous[cell.i]]||'',after=SEGMENT_DIGITS[next[cell.i]]||'';
   for(const key of 'abcdefg')if(before.includes(key)!==after.includes(key))cell.nodes[key].set({bg:after.includes(key)?color:off});
  }previous=next;}
  const colon=colonFor(now);if(colon!==lastColon){for(const dot of dots)dot.set({opacity:colon?1:0});lastColon=colon;}
 });
}
function timeParts(n){return [pad(yes('clock_24',true)?n.getHours():n.getHours()%12||12),pad(n.getMinutes()),pad(n.getSeconds())];}
function digital(d,el,r,n,p,stacked){
 const showSec=yes('show_seconds',false),foot=!yes('clock_24',true)?25:0;
 if(stacked){const gap=12,hh=(r.h-foot-gap)/2;digits(d,el,n,now=>timeParts(now)[0],{x:r.x,y:r.y,w:r.w,h:hh},p.accent);digits(d,el,n,now=>timeParts(now)[1],{x:r.x,y:r.y+hh+gap,w:r.w,h:hh},p.fg);}
 else digits(d,el,n,now=>timeParts(now).slice(0,2).join(':'),{...r,h:r.h-foot},p.accent,now=>!showSec||now.getSeconds()%2===0);
 if(foot)liveText(d,el,n,now=>now.getHours()<12?'AM':'PM',r.x,r.y+r.h-22,r.w,'small',p.second);
}
function calendar(d,el,r,n,p){
 const connected=!!agendaId(),list=connected&&r.h>=380,notes=connected?list?142:28:0,gridH=r.h-notes;
 const cell=r.w/7,row=(gridH-56)/6,fs=cell>=45?'head':'small';
 text(el,MONTHS[n.getMonth()]+' '+n.getFullYear(),r.x,r.y,r.w,'head',p.accent);
 ['ma','di','wo','do','vr','za','zo'].forEach((v,i)=>text(el,v,r.x+i*cell,r.y+30,cell,'small',p.muted));
 const first=(new Date(n.getFullYear(),n.getMonth(),1).getDay()+6)%7,count=new Date(n.getFullYear(),n.getMonth()+1,0).getDate();
 for(let d=1;d<=count;d++){const i=first+d-1,col=i%7,y=r.y+52+Math.floor(i/7)*row,x=r.x+col*cell;
  if(d===n.getDate())el.circle({x:x+cell/2,y:y+11,r:Math.max(8,Math.min(cell*.36,row*.43)),bg:p.accent,border:0});
  text(el,String(d),x,y,cell,fs,d===n.getDate()?p.bg:p.fg);
  if(connected&&agendaFresh(n)&&agendaDays.has(d))el.circle({x:x+cell*.78,y:y+8,r:2.5,bg:p.accent,border:0});
 }
 if(list)agendaList(d,el,{x:r.x,y:r.y+gridH+8,w:r.w,h:134},n,p);
 else if(connected)liveText(d,el,n,now=>trimText(agendaStatus||(!agendaFresh(now)?'Agenda bijwerken…':'Stippen = afspraken'),r.w),r.x,r.y+r.h-20,r.w,'small',p.muted,'left');
}
function world(d,el,r,n,p){
 const sc=Math.min(r.w/360,r.h/150),ox=r.x+(r.w-360*sc)/2,oy=r.y+(r.h-140*sc)/2;
 // Static map dots: plain small boxes, rounded; no flow effect involved.
 for(const a of MAP){const y=oy+(80-a[2])*sc;for(let lon=a[0];lon<=a[1];lon+=6){const size=Math.max(2,sc*2.4);el.box({x:ox+(lon+180)*sc-size/2,y:y-size/2,w:size,h:size,radius:size/2,bg:p.fg});}}

 const lon=num('longitude',4.9041,-180,180),lat=num('latitude',52.3676,-56,80);
 el.circle({x:ox+(lon+180)*sc,y:oy+(80-lat)*sc,r:Math.max(3,sc*3),bg:p.accent,border:0});
 const bw=Math.min(r.w,Math.max(112,Math.min(r.w*.38,260))),bh=Math.min(r.h,Math.max(76,Math.min(r.h*.43,136))),x=r.x,y=r.y+r.h-bh;
 el.box({x:x-2,y:y-4,w:bw+4,h:bh+8,bg:p.bg,radius:8});
 text(el,String(S().place||'Amsterdam').slice(0,24),x,y,bw,'small',p.accent,'left');
 const big=bw>=235&&bh>=125;
 liveText(d,el,n,now=>timeParts(now).slice(0,2).join(':'),x,y+23,bw,big?'big':'mid',p.fg,'left');
 const showSec=yes('show_seconds',false),ampm=!yes('clock_24',true);
 if(showSec||ampm)liveText(d,el,n,now=>(showSec?timeParts(now)[2]+' s':'')+(ampm?(now.getHours()<12?' AM':' PM'):''),x,y+(big?108:65),bw,'small',p.second,'left');
}
function draw(el,full=false){
 const w=el.width,h=el.height,n=new Date(),p=palette(n),f=faceFor(w,h,full),d={refresh:[],calendar:false,day:n.toDateString()};
 // API 9: style the entire native dim-page card, including its outer border.
 if(IS_DIM)el.set({bg:p.bg,border:0,borderColor:p.bg,radius:0});
 el.box({x:0,y:0,w,h,bg:p.bg,radius:num('corner_radius',16,0,48)});
 if(w<130||h<95){liveText(d,el,n,now=>timeParts(now).slice(0,2).join(yes('show_seconds',false)&&now.getSeconds()%2?' ':':'),0,Math.max(0,h/2-20),w,w<100?'head':'mid',p.accent);remember(d);return;}
 const title=String(S().title||'').trim().slice(0,40),top=title&&h>=190?32:8,showDate=yes('show_date',true)&&h>=150,footer=showDate?29:8;
 if(top===32)text(el,title,8,5,w-16,'small',p.muted);
 let r={x:12,y:top,w:w-24,h:h-top-footer};
 const zoom=num('clock_scale',100,65,100)/100;r={x:r.x+r.w*(1-zoom)/2,y:r.y+r.h*(1-zoom)/2,w:r.w*zoom,h:r.h*zoom};
 if(f==='digital'||f==='stacked')digital(d,el,r,n,p,f==='stacked');
 else if(f==='world')world(d,el,r,n,p);
 else if(f==='calendar'){d.calendar=true;d.agendaDots=agendaDotKey(n);const left=Math.min(r.w*.47,r.h);analog(d,el,{x:r.x,y:r.y,w:left,h:r.h},n,p,'classic');calendar(d,el,{x:r.x+left+24,y:r.y+12,w:r.w-left-24,h:r.h-24},n,p);}
 else analog(d,el,r,n,p,f);
 if(showDate)liveText(d,el,n,now=>dateText(now,w<330),8,h-25,full&&w>=400?w-210:w-16,'small',p.muted);
 if(full&&w>=400)text(el,IS_DIM?'Gedimd 1.4.6':'Clock Studio 1.4.6',Math.max(8,w-188),h-23,178,'small',p.muted,'right');
 remember(d);
}
retoon.tile(el=>draw(el,false));
retoon.screen(el=>draw(el,true));
retoon.onSettings(()=>{last='';resetAgenda();rebuild();});
let last='';
setInterval(()=>{
 const n=new Date(),day=n.toDateString(),key=day+n.getHours()+':'+n.getMinutes()+(yes('show_seconds',false)?':'+n.getSeconds():'');
 if(key===last)return;last=key;
 // Calendar layout/highlight changes only at midnight; other dates are text.
 refreshCurrent(n);
},1000);

// Refresh visible time elements; only calendar structure changes require a rebuild.
function refreshCurrent(n,calendarOnly=false){
 const day=n.toDateString(),dots=agendaDotKey(n);
 if(drawings.some(d=>d.calendar&&(d.day!==day||d.agendaDots!==dots))){rebuild();return;}
 // Older screen/card handles may have been invalidated by a page change.
 drawings=drawings.filter(d=>{if(calendarOnly&&!d.calendar)return true;
  try{for(const refresh of d.refresh)refresh(n);return true;}catch(e){return false;}
 });
}

// Optional read-only Home Assistant calendar connection.
let agendaEvents=[],agendaDays=new Set(),agendaStatus='',agendaGeneration=0,agendaBusy=false,agendaAttempt=0,agendaLoaded=0,agendaMonth='';
function agendaId(){return String(S().calendar_entity||'').trim();}
function monthKey(n){return n.getFullYear()+'-'+n.getMonth();}
function eventDate(v){
 if(typeof v!=='string')return null;
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
 if(m){const d=new Date(+m[1],+m[2]-1,+m[3]);return d.getFullYear()===+m[1]&&d.getMonth()===+m[2]-1&&d.getDate()===+m[3]?d:null;}
 const d=new Date(v.replace(' ','T'));return Number.isFinite(+d)?d:null;
}
function normalizeEvents(list){
 return list.map(e=>{if(!e||typeof e!=='object')return null;const start=eventDate(e.start),end=eventDate(e.end);return start&&end&&end>start?{start,end,allDay:/^\d{4}-\d{2}-\d{2}$/.test(e.start),title:String(e.summary||'Afspraak').replace(/\s+/g,' ').trim()}:null;}).filter(Boolean).sort((a,b)=>a.start-b.start);
}
function markDays(events,n){
 const marked=new Set(),count=new Date(n.getFullYear(),n.getMonth()+1,0).getDate();
 for(let d=1;d<=count;d++){const start=new Date(n.getFullYear(),n.getMonth(),d),end=new Date(n.getFullYear(),n.getMonth(),d+1);if(events.some(e=>e.start<end&&e.end>start))marked.add(d);}return marked;
}
function agendaFresh(n){return agendaLoaded&&+n-agendaLoaded<15*60000&&agendaMonth===monthKey(n);}
function agendaDotKey(n){return agendaId()&&agendaFresh(n)?[...agendaDays].join(','):'';}
function upcoming(n){const end=new Date(n.getFullYear(),n.getMonth(),n.getDate()+num('agenda_days',14,1,60));return agendaEvents.filter(e=>e.end>n&&e.start<end).slice(0,3);}
async function loadAgenda(){
 const id=agendaId();if(!id||agendaBusy)return;
 if(!/^calendar\.[a-z0-9_]+$/.test(id)){agendaStatus='Kies een calendar.-entiteit';agendaRedraw();return;}
 if(typeof retoon.call!=='function'){agendaStatus='ReToon 1.40+ nodig';agendaRedraw();return;}
 const gen=agendaGeneration,n=new Date(),start=new Date(n.getFullYear(),n.getMonth(),1),end=new Date(Math.max(+new Date(n.getFullYear(),n.getMonth()+1,1),+new Date(n.getFullYear(),n.getMonth(),n.getDate()+num('agenda_days',14,1,60))));
 agendaBusy=true;agendaAttempt=Date.now();if(!agendaLoaded)agendaStatus='Agenda laden…';
 try{
  const result=await retoon.call('calendar.get_events',{entity_id:id,start_date_time:start.toISOString(),end_date_time:end.toISOString()},{response:true});
  if(gen!==agendaGeneration)return;
  const events=result&&result[id]&&result[id].events;
  if(!Array.isArray(events))throw new Error('Geen agendagegevens');
  if(events.length>2000)throw new Error('Te veel afspraken');
  agendaEvents=normalizeEvents(events);agendaDays=markDays(agendaEvents,n);agendaLoaded=Date.now();agendaMonth=monthKey(n);agendaStatus='';
 }catch(e){if(gen===agendaGeneration){agendaEvents=[];agendaDays=new Set();agendaLoaded=0;agendaStatus='Agenda niet beschikbaar';}}
 finally{if(gen===agendaGeneration){agendaBusy=false;refreshCurrent(new Date(),true);}}
}
function agendaRedraw(){refreshCurrent(new Date(),true);}
function resetAgenda(){agendaGeneration++;agendaBusy=false;agendaEvents=[];agendaDays=new Set();agendaLoaded=0;agendaAttempt=0;agendaMonth='';agendaStatus=agendaId()?'Agenda laden…':'';loadAgenda();}
function trimText(s,w){const max=Math.max(6,Math.floor(w/9));return s.length>max?s.slice(0,max-1)+'…':s;}
function agendaRows(now,w){
 const rows=Array(6).fill(''),msg=agendaStatus||(!agendaFresh(now)?'Agenda bijwerken…':'');
 if(msg){rows[0]=msg;return rows;}
 const events=upcoming(now);
 if(!events.length){rows[0]='Geen afspraken komende '+num('agenda_days',14,1,60)+' dagen';return rows;}
 for(let i=0;i<events.length;i++){
  const e=events[i],active=e.start<=now&&e.end>now;
  rows[i*2]=(active?'Nu · ':'')+e.start.getDate()+'/'+(e.start.getMonth()+1)+' · '+(e.allDay?'Hele dag':pad(e.start.getHours())+':'+pad(e.start.getMinutes()));
  rows[i*2+1]=trimText(yes('agenda_titles',true)?e.title:'Afspraak',w);
 }
 return rows;
}
function agendaList(d,el,r,n,p){
 let previous=agendaRows(n,r.w);
 const nodes=previous.map((value,i)=>text(el,value,r.x,r.y+Math.floor(i/2)*42+(i%2?19:0),r.w,'small',i%2?p.fg:p.accent,'left'));
 d.refresh.push(now=>{const next=agendaRows(now,r.w);for(let i=0;i<nodes.length;i++)if(next[i]!==previous[i])nodes[i].set({text:next[i]});previous=next;});
}

resetAgenda();
setInterval(()=>{if(agendaId()&&!agendaBusy&&(Date.now()-agendaAttempt>=(agendaLoaded?300000:60000)||agendaMonth!==monthKey(new Date())&&Date.now()-agendaAttempt>=60000))loadAgenda();},60000);
