const $ = (id) => document.getElementById(id);
const saved = JSON.parse(localStorage.getItem('zier-widget-settings') || '{}');
if(saved.customTheme&&saved.themeSchema!==3){delete saved.customTheme;saved.theme='glass';localStorage.setItem('zier-widget-settings',JSON.stringify(saved));}
const state = { expanded: false, start: saved.start || '09:00', end: saved.end || '18:00', theme: saved.theme || 'minecraft', effect: 'blocks', top: saved.top !== false, city: saved.city || '', energy: 100, widgetWidth: Math.min(720,Math.max(400,Number(saved.widgetWidth)||460)), widgetHeight: Math.min(72,Math.max(44,Number(saved.widgetHeight)||48)), direction: saved.direction==='up'?'up':'down', startup: Boolean(saved.startup), displayMode: saved.displayMode==='earnings'?'earnings':'energy', monthlySalary:Math.max(0,Number(saved.monthlySalary)||0), workDays:Math.min(31,Math.max(1,Number(saved.workDays)||22)), earningsLabel:String(saved.earningsLabel||'今天赚了 {amount} 元') };
const communityThemes={
  catppuccin:{name:'Catppuccin',effect:'liquid',bg:'#1e1e2e',foreground:'#f4f4fb',panel:'#313244',line:'#585b70',accent:'#89b4fa',accent2:'#cba6f7',muted:'#bac2de',radius:'12px'},
  ocean:{name:'Ocean Breeze',effect:'liquid',bg:'#061c2b',foreground:'#f0fbff',panel:'#0b3045',line:'#28718c',accent:'#22d3ee',accent2:'#7dd3fc',muted:'#b7dce8',radius:'14px'},
  cyber:{name:'Cyberpunk',effect:'blocks-glow',bg:'#10051d',foreground:'#fff5ff',panel:'#25103d',line:'#ff36d8',accent:'#00f5ff',accent2:'#ffe600',muted:'#d7b7e8',radius:'3px'},
  minimal:{name:'Modern Minimal',effect:'solid',bg:'#f6f7f8',foreground:'#18181b',panel:'#ffffff',line:'#d8dadd',accent:'#18181b',accent2:'#3f3f46',secondary:'#eceef1',muted:'#71717a',radius:'10px'},
  sunset:{name:'Sunset Horizon',effect:'liquid',bg:'#241424',foreground:'#fff7f3',panel:'#3b2034',line:'#8f526a',accent:'#ff7a59',accent2:'#ffc56d',muted:'#e8c6cf',radius:'16px'}
};
let earningsTemplate='';
const liquidBubbles=Array.from({length:12},(_,i)=>({
  x:(i*.61803398875)%1,
  y:(i*.38196601125+.12)%1,
  speed:.075+(i%5)*.014,
  radius:.8+(i%3)*.45,
  drift:.7+(i%4)*.23,
  phase:i*1.73
}));
let lastBubbleFrame=0;

function minutes(value){ const [h,m]=value.split(':').map(Number); return h*60+m; }
function pad(n){ return String(Math.max(0,n)).padStart(2,'0'); }
function save(){ localStorage.setItem('zier-widget-settings',JSON.stringify({start:state.start,end:state.end,theme:state.theme,top:state.top,city:state.city,widgetWidth:state.widgetWidth,widgetHeight:state.widgetHeight,direction:state.direction,startup:state.startup,displayMode:state.displayMode,monthlySalary:state.monthlySalary,workDays:state.workDays,earningsLabel:state.earningsLabel,customTheme:saved.customTheme,themeSchema:3})); }
function secondsPerWorkday(){return Math.max(1,(minutes(state.end)-minutes(state.start))*60);}
function earningsPerSecond(){return state.monthlySalary/state.workDays/secondsPerWorkday();}
function earningsAmountAt(now=new Date()){
  const nowSeconds=now.getHours()*3600+now.getMinutes()*60+now.getSeconds()+now.getMilliseconds()/1000;
  const startSeconds=minutes(state.start)*60;
  return Math.min(secondsPerWorkday(),Math.max(0,nowSeconds-startSeconds))*earningsPerSecond();
}
function prepareEarningsText(){
  const template=state.earningsLabel||'{amount}';if(template===earningsTemplate&&$('earningAmount'))return;
  earningsTemplate=template;const marker='{amount}',at=template.indexOf(marker),before=at<0?template:template.slice(0,at),after=at<0?'':template.slice(at+marker.length);
  $('progressText').replaceChildren(document.createTextNode(before),Object.assign(document.createElement('strong'),{id:'earningAmount'}),document.createTextNode(after));
}
function animateEarningsAmount(){
  if(state.displayMode!=='earnings')return;prepareEarningsText();const amount=$('earningAmount');
  amount.textContent=earningsAmountAt().toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function updateEarningsSettings(){
  $('displayEnergy').classList.toggle('active',state.displayMode==='energy');$('displayEarnings').classList.toggle('active',state.displayMode==='earnings');
  $('earningsSettings').classList.toggle('active',state.displayMode==='earnings');$('battery').classList.toggle('earnings-mode',state.displayMode==='earnings');
  $('monthlySalary').value=state.monthlySalary||'';$('workDays').value=state.workDays;$('earningsLabel').value=state.earningsLabel;
  const rate=earningsPerSecond();$('formulaPreview').textContent=state.monthlySalary?`每秒 ¥${rate.toFixed(4)} · 每天 ¥${(state.monthlySalary/state.workDays).toFixed(2)}`:'填写工资后显示每秒收入';
}
function applyWidgetSize(){
  document.documentElement.style.setProperty('--mini-height',`${state.widgetHeight-4}px`);
  $('widgetWidth').value=state.widgetWidth;$('widgetHeight').value=state.widgetHeight;
  $('widgetWidthValue').textContent=`${state.widgetWidth} px`;$('widgetHeightValue').textContent=`${state.widgetHeight} px`;
  window.zierWidget.setWidgetSize({widgetWidth:state.widgetWidth,widgetHeight:state.widgetHeight});
}
function applyDirection(){
  $('directionDown').classList.toggle('active',state.direction==='down');
  $('directionUp').classList.toggle('active',state.direction==='up');
  $('battery').title=state.direction==='down'?'今日剩余工作能量':'今日已完成工作进度';
  updateClock();
}
function updateClock(){
  const now=new Date(), nowMin=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
  const start=minutes(state.start), end=minutes(state.end), duration=Math.max(1,end-start);
  let label, energy;
  if(nowMin<start){ label=`距离上班 ${pad(Math.floor((start-nowMin)/60))}:${pad(Math.floor((start-nowMin)%60))}`; energy=100; }
  else if(nowMin>=end){ label='今天下班啦 · 好好休息'; energy=0; }
  else { const left=(end-nowMin)*60; label=`还有 ${pad(Math.floor(left/3600))}:${pad(Math.floor(left%3600/60))}:${pad(Math.floor(left%60))} 下班`; energy=((end-nowMin)/duration)*100; }
  $('countdown').textContent=label; $('schedule').textContent=`${state.start} — ${state.end}`;$('currentTime').textContent=`${pad(now.getHours())}:${pad(now.getMinutes())}`;
  energy=Math.min(100,Math.max(0,energy));
  energy=state.direction==='up'?100-energy:energy;
  state.energy=energy;
  if(state.displayMode==='earnings'){
    prepareEarningsText();animateEarningsAmount();
    $('battery').title=`月工资 ÷ 工作天数 ÷ 每日工作秒数 · ¥${earningsPerSecond().toFixed(4)}/秒`;
  }else{$('progressText').textContent=`${Math.round(energy)}%`;$('battery').title=state.direction==='down'?'今日剩余工作能量':'今日已完成工作进度';}
}
async function toggle(expanded){ state.expanded=expanded; $('expandBtn').textContent=expanded?'▾':'▴'; await window.zierWidget.setExpanded(expanded);restoreCustomTheme(); }
function applyTheme(theme){if(!['minecraft','glass','mono'].includes(theme))return;state.theme=theme;state.effect=theme==='minecraft'?'blocks':theme==='glass'?'liquid':'solid';document.documentElement.dataset.theme=theme;document.documentElement.removeAttribute('style');document.querySelectorAll('.theme-pills button[data-theme]').forEach(b=>b.classList.toggle('active',b.dataset.theme===theme));save();}
function applyCommunityTheme(key,theme){
  const root=document.documentElement.style;state.theme=`custom-${key}`;state.effect=theme.effect||'liquid';document.documentElement.dataset.theme='custom';
  root.setProperty('--bg',theme.bg);root.setProperty('--panel',theme.panel);root.setProperty('--line',theme.line);root.setProperty('--accent',theme.accent);root.setProperty('--accent2',theme.accent2);root.setProperty('--muted',theme.muted);root.setProperty('--fg',theme.foreground||'#fff');root.setProperty('--secondary',theme.secondary||theme.panel);root.setProperty('--pixel',theme.radius||'12px');root.setProperty('--font-custom',theme.font||'"Microsoft YaHei UI"');root.setProperty('--theme-shadow',theme.shadow||'0 8px 26px rgba(0,0,0,.3)');
  saved.customTheme={key,...theme};document.querySelectorAll('.theme-pills button[data-theme]').forEach(b=>b.classList.remove('active'));localStorage.setItem('zier-widget-settings',JSON.stringify({...JSON.parse(localStorage.getItem('zier-widget-settings')||'{}'),theme:state.theme,customTheme:saved.customTheme,themeSchema:3}));renderCommunity();
}
function restoreCustomTheme(){if(saved.customTheme&&String(state.theme).startsWith('custom-'))applyCommunityTheme(saved.customTheme.key||'saved',saved.customTheme);}
function colorFrom(text,name,fallback){const match=text.match(new RegExp(`--${name}\\s*:\\s*([^;}{]+)`,'i'));return match?match[1].trim():fallback;}
function parseImportedTheme(text){
  let source=text;try{const json=JSON.parse(text);source=JSON.stringify(json).replace(/\\n/g,'\n');}catch{}
  if(!/--(?:background|card|primary|border)/i.test(source))throw new Error('没有找到 TweakCN CSS 变量');
  return{name:'我的 TweakCN',bg:colorFrom(source,'background','#111827'),foreground:colorFrom(source,'foreground','#fff'),panel:colorFrom(source,'card','#1f2937'),line:colorFrom(source,'border','#475569'),accent:colorFrom(source,'primary','#6366f1'),accent2:colorFrom(source,'accent',colorFrom(source,'ring','#a5b4fc')),secondary:colorFrom(source,'secondary','#27272a'),muted:colorFrom(source,'muted-foreground','#a1a1aa'),radius:colorFrom(source,'radius','12px'),font:colorFrom(source,'font-sans','"Microsoft YaHei UI"')};
}
function themeFromTweak(theme){
  // TweakCN 社区卡片默认展示浅色方案；导入链接时保持与卡片预览一致。
  const s=theme?.styles?.light||theme?.styles?.dark;if(!s)throw new Error('链接中没有可用的 TweakCN 主题数据');
  const px=v=>v||'12px',shadow=`${s['shadow-offset-x']||'0'} ${s['shadow-offset-y']||'4px'} ${s['shadow-blur']||'12px'} ${s['shadow-spread']||'0'} color-mix(in srgb, ${s['shadow-color']||'#000'} ${(Number(s['shadow-opacity']||.3)*100)}%, transparent)`;
  return{name:theme.name||'TweakCN',effect:'liquid',bg:s.background,foreground:s.foreground,panel:s.card||s.popover,line:s.border||s.input,accent:s.primary,accent2:s.accent||s.ring,secondary:s.secondary,muted:s['muted-foreground'],radius:px(s.radius),font:s['font-sans'],shadow};
}
function renderCommunity(){
  $('communityGrid').innerHTML=Object.entries(communityThemes).map(([key,t])=>`<button data-community="${key}" style="--sw1:${t.bg};--sw2:${t.accent}"><i></i><span>${t.name}</span></button>`).join('');
  document.querySelectorAll('[data-community]').forEach(b=>b.onclick=()=>applyCommunityTheme(b.dataset.community,communityThemes[b.dataset.community]));
}
function iconFor(weather){ if(/晴/.test(weather))return'☀️';if(/雨/.test(weather))return'🌧️';if(/雪/.test(weather))return'❄️';if(/雾|霾/.test(weather))return'🌫️';return'☁️'; }
async function loadWeather(){
  $('weatherText').textContent=`${state.city||'自动定位'} · 获取中`;
  const result=await window.zierWidget.getWeather({city:state.city});
  if(!result.ok){$('weatherText').textContent=result.error;return;}
  const w=result.data, city=result.location?.city||state.city||'当前位置'; $('weatherIcon').textContent=iconFor(w.weather||''); $('weatherText').textContent=`${city} · ${w.weather||'暂无数据'}`;
  $('weatherTime').textContent=`中国天气网 · ${result.source} · ${w.time||'--'}`; $('temperature').textContent=`${w.temp||'--'}℃`;
  $('humidity').textContent=w.SD||'--'; $('wind').textContent=`${w.WD||''} ${w.WS||''}`.trim()||'--'; $('rain').textContent=`${w.rain||'0'}mm`;
}

function animateBattery(now){
  const canvas=$('batteryCanvas'), dpr=Math.min(2,window.devicePixelRatio||1), rect=canvas.getBoundingClientRect();
  const W=Math.max(1,Math.round(rect.width*dpr)),H=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  const ctx=canvas.getContext('2d'), pct=state.energy/100, t=now/1000; ctx.clearRect(0,0,W,H);
  const fill=Math.max(0,Math.min(W,pct*W));
  if(state.effect==='liquid'&&fill>0){
    const styles=getComputedStyle(document.documentElement),custom=state.theme.startsWith('custom-'),validColor=(value,fallback)=>CSS.supports('color',value)?value:fallback,c1=validColor(custom?styles.getPropertyValue('--accent').trim():'#50e6ff','#50e6ff'),c2=validColor(custom?styles.getPropertyValue('--accent2').trim():'#c26aff','#c26aff');
    const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,c1);grad.addColorStop(.58,c1);grad.addColorStop(1,c2);ctx.fillStyle=grad;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.max(0,fill-3*dpr),0);
    for(let y=0;y<=H;y+=2*dpr){const x=fill+Math.sin(y/(3.2*dpr)+t*4.4)*2.2*dpr+Math.sin(y/(6*dpr)-t*2.1)*1.1*dpr;ctx.lineTo(Math.min(W,x),y);}
    ctx.lineTo(0,H);ctx.closePath();ctx.fill();
    const dt=lastBubbleFrame?Math.min(.034,(now-lastBubbleFrame)/1000):0;lastBubbleFrame=now;
    ctx.fillStyle='#fff';
    for(const bubble of liquidBubbles){
      bubble.y-=bubble.speed*dt;
      if(bubble.y<-.08){bubble.y=1.08;bubble.x=(bubble.x+.36787944117)%1;}
      const edgeFade=Math.min(1,Math.max(0,(bubble.y+.08)/.18),Math.max(0,(1.08-bubble.y)/.18));
      ctx.globalAlpha=.18+.42*edgeFade;
      const usableWidth=Math.max(3*dpr,fill-5*dpr);
      const x=Math.min(fill-2*dpr,Math.max(2*dpr,bubble.x*usableWidth+Math.sin(t*bubble.drift+bubble.phase)*1.4*dpr));
      const y=(bubble.y*(H+6*dpr)-3*dpr);
      ctx.beginPath();ctx.arc(x,y,bubble.radius*dpr,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=.58;const shine=ctx.createLinearGradient(0,0,0,H);shine.addColorStop(0,'#fff');shine.addColorStop(.44,'rgba(255,255,255,.18)');shine.addColorStop(1,'transparent');ctx.fillStyle=shine;ctx.fillRect(0,0,fill,H*.72);
  }else if(state.effect==='solid'){const color=state.theme==='mono'?'#050505':getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#111';ctx.fillStyle=color;ctx.fillRect(0,0,fill,H);ctx.fillStyle='rgba(255,255,255,.28)';ctx.fillRect(0,0,fill,2*dpr);}
  else{const color=state.effect==='blocks-glow'?(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#00f5ff'):'#9cff62';ctx.shadowColor=color;ctx.shadowBlur=state.effect==='blocks-glow'?5*dpr:0;ctx.fillStyle=color;for(let x=0;x<fill;x+=15*dpr)ctx.fillRect(x,0,Math.min(12*dpr,fill-x),H);ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,.34)';ctx.fillRect(0,0,fill,2*dpr);}
  animateEarningsAmount();requestAnimationFrame(animateBattery);
}

$('startTime').value=state.start; $('endTime').value=state.end; $('weatherCity').value=state.city; $('alwaysOnTop').checked=state.top; $('autoStartup').checked=state.startup; applyTheme(state.theme); applyWidgetSize(); updateEarningsSettings(); applyDirection();
$('expandBtn').addEventListener('click',()=>{toggle(!state.expanded);if(!state.expanded)loadWeather();});
$('closeBtn').addEventListener('click',()=>window.zierWidget.close());
$('startTime').addEventListener('change',e=>{state.start=e.target.value;save();updateClock();});
$('endTime').addEventListener('change',e=>{state.end=e.target.value;save();updateClock();});
$('weatherCity').addEventListener('change',e=>{state.city=e.target.value.trim();save();loadWeather();});
$('locateWeather').addEventListener('click',()=>{state.city='';$('weatherCity').value='';save();loadWeather();});
$('communityBtn').addEventListener('click',()=>{$('communityPanel').hidden=false;renderCommunity();});
$('openTweakCN').addEventListener('click',()=>window.zierWidget.openExternal('https://tweakcn.com/themes'));
$('closeCommunity').addEventListener('click',()=>{$('communityPanel').hidden=true;restoreCustomTheme();setTimeout(restoreCustomTheme,80);setTimeout(restoreCustomTheme,350);});
$('advancedBtn').addEventListener('click',()=>{$('communityPanel').hidden=true;$('advancedPanel').hidden=false;});
$('closeAdvanced').addEventListener('click',()=>{$('advancedPanel').hidden=true;restoreCustomTheme();});
$('widgetWidth').addEventListener('input',e=>{state.widgetWidth=Number(e.target.value);applyWidgetSize();save();});
$('widgetHeight').addEventListener('input',e=>{state.widgetHeight=Number(e.target.value);applyWidgetSize();save();});
$('directionDown').addEventListener('click',()=>{state.direction='down';applyDirection();save();});
$('directionUp').addEventListener('click',()=>{state.direction='up';applyDirection();save();});
$('displayEnergy').addEventListener('click',()=>{state.displayMode='energy';updateEarningsSettings();updateClock();save();});
$('displayEarnings').addEventListener('click',()=>{state.displayMode='earnings';updateEarningsSettings();updateClock();save();});
$('monthlySalary').addEventListener('input',e=>{state.monthlySalary=Math.max(0,Number(e.target.value)||0);updateEarningsSettings();updateClock();save();});
$('workDays').addEventListener('input',e=>{state.workDays=Math.min(31,Math.max(1,Number(e.target.value)||1));updateEarningsSettings();updateClock();save();});
$('earningsLabel').addEventListener('input',e=>{state.earningsLabel=e.target.value||'{amount}';earningsTemplate='';updateClock();save();});
$('autoStartup').addEventListener('change',async e=>{state.startup=await window.zierWidget.setStartup(e.target.checked);e.target.checked=state.startup;save();});
$('importTheme').addEventListener('click',async()=>{let value=$('themeImport').value.trim();if(!value)return;$('importStatus').textContent='正在读取主题…';try{let theme;if(/^https?:\/\//i.test(value)){const fetched=await window.zierWidget.fetchThemeUrl(value);if(!fetched.ok)throw new Error(fetched.error);theme=fetched.theme?themeFromTweak(fetched.theme):parseImportedTheme(fetched.text);}else theme=parseImportedTheme(value);applyCommunityTheme(`imported-${Date.now()}`,theme);$('importStatus').textContent=`✓ 已应用 ${theme.name}`;}catch(error){$('importStatus').textContent=`⚠ ${error.message}`;}});
$('alwaysOnTop').addEventListener('change',async e=>{state.top=e.target.checked;state.top=await window.zierWidget.setAlwaysOnTop(state.top);save();});
document.querySelectorAll('.theme-pills button[data-theme]').forEach(b=>b.addEventListener('click',()=>applyTheme(b.dataset.theme)));
$('refreshWeather').addEventListener('click',loadWeather);
window.zierWidget.onForceExpanded(()=>{state.expanded=true;$('expandBtn').textContent='▾';loadWeather();});
restoreCustomTheme();updateClock(); requestAnimationFrame(animateBattery); setInterval(updateClock,1000); loadWeather(); window.zierWidget.setAlwaysOnTop(state.top); window.zierWidget.getStartup().then(enabled=>{state.startup=Boolean(enabled);$('autoStartup').checked=state.startup;save();});
