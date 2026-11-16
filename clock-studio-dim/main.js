const MAP=[[-72,-72,-52],[-72,-72,-46],[168,168,-46],[-72,-66,-40],[-66,-54,-34],[138,150,-34],[-66,-54,-28],[18,30,-28],[120,150,-28],[-66,-42,-22],[18,30,-22],[48,48,-22],[120,144,-22],[-72,-42,-16],[12,36,-16],[48,48,-16],[126,132,-16],[144,144,-16],[-78,-36,-10],[18,36,-10],[120,120,-10],[150,150,-10],[-78,-42,-4],[12,36,-4],[120,120,-4],[138,144,-4],[-78,-54,2],[12,42,2],[114,114,2],[-78,-60,8],[-12,48,8],[126,126,8],[-90,-84,14],[-12,36,14],[48,48,14],[78,78,14],[102,108,14],[-102,-102,20],[-90,-90,20],[-12,54,20],[78,84,20],[96,102,20],[-108,-102,26],[-12,30,26],[42,48,26],[60,114,26],[-114,-84,32],[-6,12,32],[24,24,32],[36,120,32],[-120,-78,38],[-6,-6,38],[24,114,38],[126,126,38],[-120,-66,44],[0,24,44],[42,42,44],[54,132,44],[144,144,44],[-126,-72,50],[6,144,50],[-132,-90,56],[-72,-66,56],[12,12,56],[24,132,56],[156,162,56],[-162,-96,62],[-78,-78,62],[-48,-48,62],[6,12,62],[24,174,62],[-162,-120,68],[-108,-108,68],[-90,-84,68],[-72,-66,68],[-48,-36,68],[18,36,68],[54,174,68],[-120,-120,74],[-54,-24,74],[90,108,74],[-96,-18,80],[24,24,80],[96,96,80]];
// Clock Studio Duo 1.4.5. ReToon controls dimming/page switching.
const IS_DIM=!!(retoon.app&&retoon.app.id==='clock-studio-dim');
const DEFAULT_FACE=IS_DIM?'minimal':'world';
let profileCache=null,profileRaw=null;
const THEME={blauw:['#86b5ff','#b58aff'],paars:['#c49aff','#b58aff'],wit:['#eef1f7','#eef1f7'],rood:['#ff625b','#ff625b'],groen:['#69d6b1','#69d6b1']};
function S(){
 const raw=retoon.settings||{},code=String(raw.advanced_profile||'').trim();
 if(profileRaw!==code){profileRaw=code;profileCache={};try{const value=JSON.parse(code||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))profileCache=value;}catch(e){}}
 const theme=THEME[raw.theme]||THEME.blauw,layout=String(raw.layout||DEFAULT_FACE).trim().toLowerCase(),valid=FACES.includes(layout)?layout:'auto';
 const common={layout:valid};
 return {...raw,...common,accent:theme[0],hour_color:theme[1],minute_color:'#eef1f7',second_color:'#ffbd6a',...profileCache};
}
const DAYS=['zo','ma','di','wo','do','vr','za'];
const MONTHS=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const FACES=['auto','minimal','classic','square','square-small','digital','stacked','world','calendar'];
function num(k,d,lo,hi){const v=S()[k];return v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))?Math.max(lo,Math.min(hi,Number(v))):d;}
function yes(k,d=true){return S()[k]===undefined?d:S()[k]===true;}
function hex(k,d){return /^#[\da-f]{6}$/i.test(S()[k]||'')?S()[k]:d;}
function pad(n){return String(n).padStart(2,'0');}
function dateText(n,short=false){return DAYS[n.getDay()]+' '+n.getDate()+' '+(short?MONTHS[n.getMonth()].slice(0,3):MONTHS[n.getMonth()]);}
function palette(n){
 return {bg:hex('background',IS_DIM?'#000000':'#080b10'),fg:hex('foreground','#eef1f7'),muted:'#82909f',accent:hex('accent','#86b5ff'),hour:hex('hour_color','#b58aff'),minute:hex('minute_color','#eef1f7'),second:hex('second_color','#ffbd6a')};
}
function faceFor(w,h,full){
 const v=String(S().layout||'auto').toLowerCase().trim();
 let f=FACES.includes(v)?v:'auto';
 if(f==='auto')f=w/h>=1.65?'digital':w<340||h<240?'square-small':'classic';
 if(f==='calendar'&&(w<500||h<260))f='classic';
 if(f==='world'&&(w<180||h<130))f='digital';return f;
}

function text(el,t,x,y,w,font,color,align='center'){el.text(t,{x,y,w,font,color,textAlign:align});}
function stroke(el,points,width,color,round=true){el.line(points,{width,color});if(round){el.circle({x:points[0],y:points[1],r:width/2,bg:color,border:0});el.circle({x:points[points.length-2],y:points[points.length-1],r:width/2,bg:color,border:0});}}
function analog(el,r,n,p,style){
 const cx=r.x+r.w/2,cy=r.y+r.h/2,rx=Math.max(10,r.w/2-8),ry=Math.max(10,r.h/2-8),rad=Math.min(rx,ry),square=style==='square'||style==='square-small';
 const ax=style==='square'?rx:rad,ay=style==='square'?ry:rad;
 const pt=(turn,k)=>{const a=turn*2*Math.PI-Math.PI/2,s=Math.sin(a),c=Math.cos(a);const len=square?Math.min(ax/Math.max(.00001,Math.abs(c)),ay/Math.max(.00001,Math.abs(s))):rad;return [cx+c*len*k,cy+s*len*k];};
 const edge=.94;
 if(yes('dial_border',false)||style==='square-small'){if(square)el.box({x:cx-ax,y:cy-ay,w:ax*2,h:ay*2,bg:p.bg,border:2,borderColor:p.muted,radius:Math.min(ax,ay)*.13});else el.circle({x:cx,y:cy,r:rad,bg:p.bg,border:2,borderColor:p.muted});}
 const showTicks=yes('minute_ticks',true),tickCount=showTicks?60:12;
 for(let i=0;i<tickCount;i++){const t=i/tickCount,major=tickCount===12||i%5===0;const a=pt(t,edge-(major?.105:.045)),b=pt(t,edge);el.line([...a,...b],{width:major?Math.max(2,rad*.013):Math.max(1,rad*.006),color:major?p.fg:p.muted});}
 if(yes('numbers',true)&&style!=='minimal'&&rad>=56){for(const [v,t]of [['12',0],['3',.25],['6',.5],['9',.75]]){const q=pt(t,.68),font=rad>=125?'mid':rad>=75?'head':'small',fh=rad>=125?40:rad>=75?26:20;text(el,v,q[0]-28,q[1]-fh/2,56,font,p.fg);}}
 const sec=n.getSeconds(),mins=n.getMinutes()+(yes('show_seconds',false)?sec/60:0),hrs=n.getHours()%12+mins/60;
 const thick=num('hand_width',100,50,180)/100,round=yes('round_hands',true);
 if(yes('hour_hand',true))stroke(el,[...pt(hrs/12+.5,.035),...pt(hrs/12,.48)],Math.max(3,rad*.047)*thick,p.hour,round);
 if(yes('minute_hand',true))stroke(el,[...pt(mins/60+.5,.045),...pt(mins/60,.76)],Math.max(2,rad*.024)*thick,p.minute,round);
 if(yes('show_seconds',false))stroke(el,[...pt(sec/60+.5,.17),...pt(sec/60,.87)],Math.max(1,rad*.009),p.second,false);
 el.circle({x:cx,y:cy,r:Math.max(4,rad*num('center_size',5.7,2,12)/100),bg:p.minute,border:0});
}
// Classic seven-segment display, rendered with straight, bevelled segments.
const SEGMENT_RECTS={"a":[[9.5,0,41.0,1],[8.5,1,43.0,1],[7.5,2,45.0,1],[6.5,3,47.0,1],[5.5,4,49.0,2],[6.5,6,47.0,1],[7.5,7,45.0,1],[8.5,8,43.0,1],[9.5,9,41.0,1]],"b":[[54.5,7,1.0,1],[53.5,8,3.0,1],[52.5,9,5.0,1],[51.5,10,7.0,1],[50.5,11,9.0,1],[50.0,12,10.0,28],[50.5,40,9.0,1],[51.5,41,7.0,1],[52.5,42,5.0,1],[53.5,43,3.0,1],[54.5,44,1.0,1]],"c":[[54.5,55,1.0,1],[53.5,56,3.0,1],[52.5,57,5.0,1],[51.5,58,7.0,1],[50.5,59,9.0,1],[50.0,60,10.0,28],[50.5,88,9.0,1],[51.5,89,7.0,1],[52.5,90,5.0,1],[53.5,91,3.0,1],[54.5,92,1.0,1]],"d":[[9.5,90,41.0,1],[8.5,91,43.0,1],[7.5,92,45.0,1],[6.5,93,47.0,1],[5.5,94,49.0,2],[6.5,96,47.0,1],[7.5,97,45.0,1],[8.5,98,43.0,1],[9.5,99,41.0,1]],"e":[[4.5,55,1.0,1],[3.5,56,3.0,1],[2.5,57,5.0,1],[1.5,58,7.0,1],[0.5,59,9.0,1],[0.0,60,10.0,28],[0.5,88,9.0,1],[1.5,89,7.0,1],[2.5,90,5.0,1],[3.5,91,3.0,1],[4.5,92,1.0,1]],"f":[[4.5,7,1.0,1],[3.5,8,3.0,1],[2.5,9,5.0,1],[1.5,10,7.0,1],[0.5,11,9.0,1],[0.0,12,10.0,28],[0.5,40,9.0,1],[1.5,41,7.0,1],[2.5,42,5.0,1],[3.5,43,3.0,1],[4.5,44,1.0,1]],"g":[[9.5,45,41.0,1],[8.5,46,43.0,1],[7.5,47,45.0,1],[6.5,48,47.0,1],[5.5,49,49.0,2],[6.5,51,47.0,1],[7.5,52,45.0,1],[8.5,53,43.0,1],[9.5,54,41.0,1]]};
const SEGMENT_DIGITS={'0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg'};
function digits(el,value,r,color,colonOn=true){
 const chars=[...value],units=chars.map(c=>c===':'?.20:.60),total=units.reduce((a,b)=>a+b,0)+.10*(chars.length-1),height=Math.max(1,Math.min(r.h,r.w/total)),scale=height/100;
 const off='#'+[1,3,5].map(i=>Math.round(parseInt(color.slice(i,i+2),16)*.13).toString(16).padStart(2,'0')).join('');
 let x=r.x+(r.w-height*total)/2;const y=r.y+(r.h-height)/2;
 for(let i=0;i<chars.length;i++){
  const c=chars[i],gw=units[i]*height;
  if(c===':'){const d=Math.max(1,height*.075);if(colonOn)for(const dy of [.35,.65])el.box({x:x+(gw-d)/2,y:y+height*dy-d/2,w:d,h:d,bg:color,radius:0,border:0});}
  else{const lit=SEGMENT_DIGITS[c]||'';for(const key of 'abcdefg'){const bg=lit.includes(key)?color:off;const strips=SEGMENT_RECTS[key],top=y+strips[0][1]*scale,last=strips[strips.length-1],bottom=y+(last[1]+last[3])*scale;
   for(const q of strips){const sy=Math.max(top,y+q[1]*scale-.8),ey=Math.min(bottom,y+(q[1]+q[3])*scale+.8);el.box({x:x+q[0]*scale,y:sy,w:q[2]*scale,h:ey-sy,bg,radius:0,border:0});}}}
  x+=gw+height*.10;
 }
}
function timeParts(n){return [pad(yes('clock_24',true)?n.getHours():n.getHours()%12||12),pad(n.getMinutes()),pad(n.getSeconds())];}
function digital(el,r,n,p,stacked){
 const t=timeParts(n),showSec=yes('show_seconds',false),foot=!yes('clock_24',true)?25:0,colonOn=!showSec||n.getSeconds()%2===0;
 if(stacked){const gap=12,hh=(r.h-foot-gap)/2;digits(el,t[0],{x:r.x,y:r.y,w:r.w,h:hh},p.accent);digits(el,t[1],{x:r.x,y:r.y+hh+gap,w:r.w,h:hh},p.fg);}else digits(el,t[0]+':'+t[1],{...r,h:r.h-foot},p.accent,colonOn);
 if(foot)text(el,n.getHours()<12?'AM':'PM',r.x,r.y+r.h-22,r.w,'small',p.second);
}
function calendar(el,r,n,p){
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
 if(list)agendaList(el,{x:r.x,y:r.y+gridH+8,w:r.w,h:134},n,p);
 else if(connected)text(el,trimText(agendaStatus||(!agendaFresh(n)?'Agenda bijwerken…':'Stippen = afspraken'),r.w),r.x,r.y+r.h-20,r.w,'small',p.muted,'left');
}
function world(el,r,n,p){
 const sc=Math.min(r.w/360,r.h/150),ox=r.x+(r.w-360*sc)/2,oy=r.y+(r.h-140*sc)/2;
 // Static map dots: plain small boxes, rounded; no flow effect involved.
 let mapPoints=0;
 for(const a of MAP){const y=oy+(80-a[2])*sc;for(let lon=a[0];lon<=a[1];lon+=6){const size=Math.max(2,sc*2.4);el.box({x:ox+(lon+180)*sc-size/2,y:y-size/2,w:size,h:size,radius:size/2,bg:p.fg});mapPoints++;}}

 const lon=num('longitude',4.9041,-180,180),lat=num('latitude',52.3676,-56,80);
 el.circle({x:ox+(lon+180)*sc,y:oy+(80-lat)*sc,r:Math.max(3,sc*3),bg:p.accent,border:0});
 const bw=Math.min(r.w,Math.max(112,Math.min(r.w*.38,260))),bh=Math.min(r.h,Math.max(76,Math.min(r.h*.43,136))),x=r.x,y=r.y+r.h-bh;
 el.box({x:x-2,y:y-4,w:bw+4,h:bh+8,bg:p.bg,radius:8});
 text(el,String(S().place||'Amsterdam').slice(0,24),x,y,bw,'small',p.accent,'left');
 const parts=timeParts(n),big=bw>=235&&bh>=125;
 text(el,parts[0]+':'+parts[1],x,y+23,bw,big?'big':'mid',p.fg,'left');
 const extra=(yes('show_seconds',false)?parts[2]+' s':'')+(!yes('clock_24',true)?(n.getHours()<12?' AM':' PM'):'');
 if(extra)text(el,extra,x,y+(big?108:65),bw,'small',p.second,'left');
}
function draw(el,full=false){
 const w=el.width,h=el.height,n=new Date(),p=palette(n),f=faceFor(w,h,full);
 // API 9: style the entire native dim-page card, including its outer border.
 if(IS_DIM)el.set({bg:p.bg,border:0,borderColor:p.bg,radius:0});
 el.box({x:0,y:0,w,h,bg:p.bg,radius:num('corner_radius',16,0,48)});
 if(w<130||h<95){text(el,timeParts(n).slice(0,2).join(yes('show_seconds',false)&&n.getSeconds()%2?' ':':'),0,Math.max(0,h/2-20),w,w<100?'head':'mid',p.accent);return;}
 const title=String(S().title||'').trim().slice(0,40),top=title&&h>=190?32:8,showDate=yes('show_date',true)&&h>=150,footer=showDate?29:8;
 if(top===32)text(el,title,8,5,w-16,'small',p.muted);
 let r={x:12,y:top,w:w-24,h:h-top-footer};
 const zoom=num('clock_scale',100,65,100)/100;r={x:r.x+r.w*(1-zoom)/2,y:r.y+r.h*(1-zoom)/2,w:r.w*zoom,h:r.h*zoom};
 if(f==='digital'||f==='stacked')digital(el,r,n,p,f==='stacked');
 else if(f==='world')world(el,r,n,p);
 else if(f==='calendar'){const left=Math.min(r.w*.47,r.h);analog(el,{x:r.x,y:r.y,w:left,h:r.h},n,p,'classic');calendar(el,{x:r.x+left+24,y:r.y+12,w:r.w-left-24,h:r.h-24},n,p);}
 else analog(el,r,n,p,f);
 if(showDate)text(el,dateText(n,w<330),8,h-25,full&&w>=400?w-210:w-16,'small',p.muted);
 if(full&&w>=400)text(el,IS_DIM?'Gedimd 1.4.5':'Clock Studio 1.4.5',Math.max(8,w-188),h-23,178,'small',p.muted,'right');
}
retoon.tile(el=>draw(el,false));
retoon.screen(el=>draw(el,true));
retoon.onSettings(()=>{last='';resetAgenda();retoon.update();});
let last='';
setInterval(()=>{const n=new Date(),key=n.toDateString()+n.getHours()+':'+n.getMinutes()+(yes('show_seconds',false)?':'+n.getSeconds():'');if(key!==last){last=key;retoon.update();}},1000);

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
function upcoming(n){const end=new Date(n.getFullYear(),n.getMonth(),n.getDate()+num('agenda_days',14,1,60));return agendaEvents.filter(e=>e.end>n&&e.start<end).slice(0,3);}
async function loadAgenda(){
 const id=agendaId();if(!id||agendaBusy)return;
 if(!/^calendar\.[a-z0-9_]+$/.test(id)){agendaStatus='Kies een calendar.-entiteit';retoon.update();return;}
 if(typeof retoon.call!=='function'){agendaStatus='ReToon 1.36+ nodig';retoon.update();return;}
 const gen=agendaGeneration,n=new Date(),month=monthKey(n),start=new Date(n.getFullYear(),n.getMonth(),1),end=new Date(Math.max(+new Date(n.getFullYear(),n.getMonth()+1,1),+new Date(n.getFullYear(),n.getMonth(),n.getDate()+num('agenda_days',14,1,60))));
 agendaBusy=true;agendaAttempt=Date.now();if(!agendaLoaded)agendaStatus='Agenda laden…';
 try{
  const result=await retoon.call('calendar.get_events',{entity_id:id,start_date_time:start.toISOString(),end_date_time:end.toISOString()},{response:true});
  if(gen!==agendaGeneration)return;
  const events=result&&result[id]&&result[id].events;
  if(!Array.isArray(events))throw new Error('Geen agendagegevens');
  if(events.length>2000)throw new Error('Te veel afspraken');
  agendaEvents=normalizeEvents(events);agendaDays=markDays(agendaEvents,n);agendaLoaded=Date.now();agendaMonth=month;agendaStatus='';
 }catch(e){if(gen===agendaGeneration){agendaEvents=[];agendaDays=new Set();agendaLoaded=0;agendaStatus='Agenda niet beschikbaar';}}
 finally{if(gen===agendaGeneration){agendaBusy=false;retoon.update();}}
}
function resetAgenda(){agendaGeneration++;agendaBusy=false;agendaEvents=[];agendaDays=new Set();agendaLoaded=0;agendaAttempt=0;agendaMonth='';agendaStatus=agendaId()?'Agenda laden…':'';loadAgenda();}
function trimText(s,w){const max=Math.max(6,Math.floor(w/9));return s.length>max?s.slice(0,max-1)+'…':s;}
function agendaList(el,r,n,p){
 let msg=agendaStatus||(!agendaFresh(n)?'Agenda bijwerken…':'');
 if(msg){text(el,msg,r.x,r.y,r.w,'small',p.muted,'left');return;}
 const events=upcoming(n);
 if(!events.length){text(el,'Geen afspraken komende '+num('agenda_days',14,1,60)+' dagen',r.x,r.y,r.w,'small',p.muted,'left');return;}
 for(let i=0;i<events.length;i++){
  const e=events[i],active=e.start<=n&&e.end>n;
  const when=(active?'Nu · ':'')+e.start.getDate()+'/'+(e.start.getMonth()+1)+' · '+(e.allDay?'Hele dag':pad(e.start.getHours())+':'+pad(e.start.getMinutes()));
  text(el,when,r.x,r.y+i*42,r.w,'small',p.accent,'left');
  text(el,trimText(yes('agenda_titles',true)?e.title:'Afspraak',r.w),r.x,r.y+i*42+19,r.w,'small',p.fg,'left');
 }
}

resetAgenda();
setInterval(()=>{if(agendaId()&&!agendaBusy&&(Date.now()-agendaAttempt>=(agendaLoaded?300000:60000)||agendaMonth!==monthKey(new Date())&&Date.now()-agendaAttempt>=60000))loadAgenda();},60000);
