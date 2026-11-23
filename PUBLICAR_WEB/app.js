import { parseFormMovements, changedRecords } from './form-sync.mjs';
import { nextMonth, monthGrid, expenseOccurrences, expenseSummary, solesFromOriginal, currencyCode, roundRate } from './fixed-expenses.mjs';
/* IMVICTO CORP — panel financiero. JavaScript nativo, sin compilación ni npm. */
const CONFIG = window.IMVICTO_CONFIG || {};
const CLOUD_ENABLED = !!(CONFIG.SUPABASE_URL?.trim() && CONFIG.SUPABASE_ANON_KEY?.trim());
const CLOUD_REQUIRED = !!(CONFIG.REQUIRE_CLOUD || window.IMVICTO_DEPLOYMENT_REQUIRES_CLOUD);
const STORE_KEY = 'imvicto-corp-data-v1';
const GOOGLE_FORM_URL=CONFIG.GOOGLE_FORM_URL||'https://docs.google.com/forms/d/e/1FAIpQLSd6_clyLZl9xEe6_s4utDmIxz2cBRD2z6JHNhUoPN2dEvxIbA/viewform?usp=dialog';
const GOOGLE_CSV_URL=CONFIG.GOOGLE_CSV_URL||'https://docs.google.com/spreadsheets/d/e/2PACX-1vT7CeuW9MnqkIs_tBOL03xSTBX7mvzV_uydrc1Syi2VmYTb06T3z3_6Rkh9Hu42A9tkBjxsg-LdwHQV/pub?output=csv';
const TYPES = ['CONTADO', 'FINANCIADO', 'DFP', 'SIN INTERESES'];
const PARTICIPANTS = [
  ['micaela','Solo Micaela · 60 % / 40 %'],
  ['angel','Solo Ángel · 40 % / 60 %'],
  ['ambos','Ambos · 50 % / 50 %'],
  ['ninguno','Ninguno / solo vendedor · 50 % / 50 %']
];
const ACCOUNTS = [
  ['tarjeta','Tarjeta IMVICTO'],
  ['micaela','Saldo de Micaela'],
  ['angel','Saldo de Ángel'],
  ['ambos','Micaela y Ángel · mitad cada uno']
];
const PAYERS = [['imvicto','IMVICTO'],['micaela','Micaela'],['angel','Ángel'],['ambos','Ángel y Micaela'],['otro','Otro']];
const DEFAULT_SETTINGS = {
  id:1, card_initial:0, micaela_initial:0, angel_initial:0,
  card_sales_basis:'neto'
};
const ICON_PATHS = {
  dashboard:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  sales:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 4V2m8 2V2M3 9h18M8 14h3m-3 4h6"/>',
  movements:'<path d="M3 7h16m-4-4 4 4-4 4M21 17H5m4-4-4 4 4 4"/>',
  reports:'<path d="M3 3v18h18M7 16l5-6 4 3 5-7"/>',
  settings:'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06-2.1 2.1-.06-.06a1.7 1.7 0 0 0-1.88-.35 1.7 1.7 0 0 0-1.06 1.56V21H9.3v-.82a1.7 1.7 0 0 0-1.06-1.56 1.7 1.7 0 0 0-1.88.35l-.06.06-2.1-2.1.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.06H2.2v-3.88h.84A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06 2.1-2.1.06.06a1.7 1.7 0 0 0 1.88.35A1.7 1.7 0 0 0 9.3 3.82V3h5.4v.82a1.7 1.7 0 0 0 1.06 1.56 1.7 1.7 0 0 0 1.88-.35l.06-.06 2.1 2.1-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1.06h.84v3.88h-.84A1.7 1.7 0 0 0 19.4 15Z"/>',
  wallet:'<path d="M20 7H5a3 3 0 0 1 0-6h13v6"/><path d="M3 4v15a3 3 0 0 0 3 3h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5"/><path d="M22 14h-5a2 2 0 0 0 0 4h5"/>',
  coins:'<circle cx="10" cy="10" r="7"/><path d="M10 6v8m-2-6h3a2 2 0 0 1 0 4H8m-1-2h6M17 15a7 7 0 0 1-7 7"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.13a4 4 0 0 1 0 7.75M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4M5 17v3h14v-3"/>',
  upload:'<path d="M12 17V5m-4 4 4-4 4 4M4 17v4h16v-4"/>',
  search:'<circle cx="10.7" cy="10.7" r="7.2"/><path d="m16.2 16.2 5 5"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  left:'<path d="m15 18-6-6 6-6"/>',
  edit:'<path d="M12 20h9M15.5 4.5l4 4M3 17l-1 5 5-1L20.4 7.6a2.83 2.83 0 0 0-4-4Z"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m5 4v7m4-7v7"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  refresh:'<path d="M20 11a8 8 0 0 0-14.8-3M4 4v5h5M4 13a8 8 0 0 0 14.8 3M20 20v-5h-5"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  out:'<path d="M12 19V5m-5 5 5-5 5 5M4 19h16"/>',
  in:'<path d="M12 5v14m-5-5 5 5 5-5M4 5h16"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  logout:'<path d="M10 17l5-5-5-5m5 5H3M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/>',
  alert:'<path d="M10.3 3.6a2 2 0 0 1 3.4 0l9 15.3A2 2 0 0 1 21 22H3a2 2 0 0 1-1.7-3.1Z"/><path d="M12 9v5m0 4h.01"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  repeat:'<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'
};
function icon(name,size=18) {return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]||ICON_PATHS.info}</svg>`;}
function h(value) {return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function c2(n) {return Math.round((Number(n||0)+Number.EPSILON)*100)/100;}
function money(v) {return new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0);}
function originalMoney(v,currency='PEN') {return currencyCode(currency)==='USD'?'US$ '+plain(v):money(v);}
function showRate(v) {return Number(v||1).toFixed(4);}
function parseRate(v,label='Tipo de cambio') {const n=num(v);if(!Number.isFinite(n)||n<=0||n>1000||n<0.0001)throw Error(`${label}: introduce un valor mayor que cero y menor que 1000.`);return roundRate(n);}
function originalAndSoles(o) {return o.currency==='USD'?`${originalMoney(o.original_amount,'USD')} · TC ${showRate(o.exchange_rate)} · ${money(o.expected_amount)}`:money(o.expected_amount);}

function plain(n) {return Number(n||0).toFixed(2);}
function num(s) {if(typeof s==='number')return s; let t=String(s??'').trim().replace(/\s/g,''); if(t.includes(',')&&t.includes('.'))t=t.lastIndexOf(',')>t.lastIndexOf('.')?t.replace(/\./g,'').replace(',','.'):t.replace(/,/g,'');else if(t.includes(','))t=t.replace(',','.');return t===''?0:Number(t);}
function today() {const d=new Date();const yy=d.getFullYear(),mm=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');return `${yy}-${mm}-${dd}`;}
function dateShow(s) {if(!s)return '—';const [y,m,d]=String(s).split('-');return `${d}/${m}/${y}`;}
function dateLong(d=new Date()) {return new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d);}
function uuid() {return globalThis.crypto?.randomUUID?.()||'id-'+Date.now()+'-'+Math.random().toString(36).slice(2);}
function selOptions(items,selected) {return items.map(([v,l])=>`<option value="${h(v)}" ${v===selected?'selected':''}>${h(l)}</option>`).join('');}
function participationLabel(p) {return PARTICIPANTS.find(x=>x[0]===p)?.[1].split(' · ')[0]||'—';}
function accountLabel(a) {return ACCOUNTS.find(x=>x[0]===a)?.[1]||'—';}
function payerLabel(p) {return PAYERS.find(x=>x[0]===p)?.[1]||'—';}
function split(s) {const liquid=c2(num(s.net_income)-num(s.profit)-num(s.seller_payment));const p=s.participation==='micaela'?.6:s.participation==='angel'?.4:.5;const micaela=c2(liquid*p);return {liquid, micaela, angel:c2(liquid-micaela),pm:Math.round(p*100),pa:Math.round((1-p)*100)};}
function saleCardValue(s,basis) {return basis==='neto'?num(s.net_income):basis==='liquido'?split(s).liquid:0;}
function movementContrib(m,account) {const amount=c2(m.amount)*(m.kind==='egreso'?-1:1);if(m.account===account)return amount;if(m.account==='ambos'&&account==='micaela')return c2(amount/2);if(m.account==='ambos'&&account==='angel')return c2(amount-c2(amount/2));return 0;}
function totals() {
  const a=state.sales,b=activeMovements(),z=state.settings;
  const liquid=c2(a.reduce((s,x)=>s+split(x).liquid,0));
  const commissionM=c2(a.reduce((s,x)=>s+split(x).micaela,0));
  const commissionA=c2(a.reduce((s,x)=>s+split(x).angel,0));
  const net=c2(a.reduce((s,x)=>s+num(x.net_income),0));
  const cardSales=c2(a.reduce((s,x)=>s+saleCardValue(x,z.card_sales_basis),0));
  const flowCard=c2(b.reduce((s,x)=>s+movementContrib(x,'tarjeta'),0));
  const flowM=c2(b.reduce((s,x)=>s+movementContrib(x,'micaela'),0));
  const flowA=c2(b.reduce((s,x)=>s+movementContrib(x,'angel'),0));
  return {card:c2(num(z.card_initial)+cardSales+flowCard), micaela:c2(num(z.micaela_initial)+commissionM+flowM),angel:c2(num(z.angel_initial)+commissionA+flowA), liquid,net,commissionM,commissionA,cardSales,flowCard,flowM,flowA,profit:c2(a.reduce((s,x)=>s+num(x.profit),0)),sellerPay:c2(a.reduce((s,x)=>s+num(x.seller_payment),0)),incomeMov:c2(b.filter(x=>x.kind==='ingreso').reduce((s,x)=>s+num(x.amount),0)),expensesMov:c2(b.filter(x=>x.kind==='egreso').reduce((s,x)=>s+num(x.amount),0))};
}
const state={mode:CLOUD_ENABLED?'cloud':'local',supabase:null,user:null,sales:[],movements:[],settings:{...DEFAULT_SETTINGS},page:'dashboard',filterSales:'',filterMov:'',periodSales:'all',periodMov:'all',salePage:1,movPage:1,reportYear:new Date().getFullYear(),modal:null,sidebarOpen:false,busy:false,authError:'',cloudError:'',loading:CLOUD_ENABLED,formSyncBusy:false,formSyncAt:null,formSyncError:'',formSyncAdded:0,formSyncSkipped:0,showDeletedForms:false,fixedExpenses:[],fixedOverrides:[],calendarMonth:today().slice(0,7),openMonths:new Set([today().slice(0,7)])};
function loadLocal() {try {const d=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');state.sales=Array.isArray(d.sales)?d.sales:[];state.movements=Array.isArray(d.movements)?d.movements:[];state.settings={...DEFAULT_SETTINGS,...d.settings};state.fixedExpenses=Array.isArray(d.fixedExpenses)?d.fixedExpenses:[];state.fixedOverrides=Array.isArray(d.fixedOverrides)?d.fixedOverrides:[];}catch(e){console.error(e);toast('No se pudo leer el almacenamiento local','error');}}
function persistLocal() {try{localStorage.setItem(STORE_KEY,JSON.stringify({sales:state.sales,movements:state.movements,settings:state.settings,fixedExpenses:state.fixedExpenses,fixedOverrides:state.fixedOverrides}));}catch(e){toast('Almacenamiento local lleno o deshabilitado','error');}}
function sortedSales() {return [...state.sales].sort((a,b)=>b.sale_date.localeCompare(a.sale_date)||(b.created_at||'').localeCompare(a.created_at||''));}
function activeMovements() {return state.movements.filter(x=>!x.is_deleted);}
function deletedFormMovements() {return state.movements.filter(x=>x.source==='google_form'&&x.is_deleted);}
function sortedMovs() {return activeMovements().sort((a,b)=>b.move_date.localeCompare(a.move_date)||(b.created_at||'').localeCompare(a.created_at||''));}
function qfilter(list, search, period, key, textKeys) {let a=list;const q=search.trim().toLocaleLowerCase('es');if(q)a=a.filter(x=>textKeys.some(k=>String(x[k]??'').toLocaleLowerCase('es').includes(q)));if(period!=='all')a=a.filter(x=>period==='month'?x[key]?.slice(0,7)===today().slice(0,7):period==='year'?x[key]?.slice(0,4)===today().slice(0,4):true);return a;}
function paged(list,page,per=8) {const total=Math.max(1,Math.ceil(list.length/per));let current=Math.max(1,Math.min(page,total));return {rows:list.slice((current-1)*per,current*per),page:current,pages:total};}
function toast(msg,kind='success') {const root=document.getElementById('toast-root');const wrap=root.querySelector('.toast-wrap')||Object.assign(document.createElement('div'),{className:'toast-wrap'});if(!wrap.isConnected)root.appendChild(wrap);const el=document.createElement('div');el.className=`toast ${kind==='error'?'error':''}`;el.textContent=msg;wrap.appendChild(el);setTimeout(()=>{el.remove();if(!wrap.childElementCount)wrap.remove()},4200);}
function sectionTitle(title,desc,actions='') {return `<div class="page-intro"><div><p class="eyebrow">IMVICTO CORP / FINANZAS</p><h1>${title}</h1><p class="page-description">${desc}</p></div>${actions?`<div class="intro-actions">${actions}</div>`:''}</div>`;}
function button(action,label,cls='btn-outline',ico='',more='') {return `<button type="button" class="btn ${cls}" data-action="${action}" ${more}>${ico?icon(ico,15):''}${label}</button>`;}
function syncStatus() {return state.mode==='cloud'?`<span class="sync-hint"><span class="dot-live"></span> Cuenta compartida</span>`:`<span class="sync-hint">${icon('info',13)} Guardado en este navegador</span>`;}
function shell() {
 const p=state.page, titles={dashboard:'Resumen general',sales:'Registro de ventas',movements:'Ingresos y egresos',fixed:'Calendario de gastos fijos',reports:'Reportes',settings:'Configuración'};
 const nav=[['dashboard','dashboard','Panel principal'],['sales','sales','Ventas y comisiones'],['movements','movements','Movimientos'],['fixed','calendar','Gastos fijos'],['reports','reports','Reportes'],['settings','settings','Configuración']];
 return `<div class="app-shell">
 <aside class="sidebar ${state.sidebarOpen?'open':''}">
  <div class="brand"><img class="brand-emblem" src="./assets/emblema.png" alt="Emblema IMVICTO"/><div class="brand-text"><span class="brand-name">IMVICTO</span><span class="brand-sub">CORP</span></div></div>
  <div class="nav-caption">MENÚ PRINCIPAL</div>
  <nav class="nav" aria-label="Menú principal">${nav.map(([key,i,txt])=>`<button class="nav-item ${p===key?'active':''}" data-action="nav" data-page="${key}" ${p===key?'aria-current="page"':''}>${icon(i,18)}<span>${txt}</span></button>`).join('')}</nav>
  <div class="sidebar-bottom"><div class="session-pill"><div class="session-icon">${icon(state.mode==='cloud'?'shield':'wallet',19)}</div><div><div class="session-title">${state.mode==='cloud'?'Acceso compartido':'Modo local'}</div><div class="session-sub">${h(state.mode==='cloud'?(state.user?.email||'Sesión iniciada'):'Solo este navegador')}</div></div></div><div class="sidebar-foot">© ${new Date().getFullYear()} IMVICTO CORP</div></div>
 </aside>
 <div class="main"><header class="topbar"><div class="breadcrumb"><button class="mobile-menu" data-action="menu" aria-label="Abrir menú">${icon('menu',22)}</button>${icon('dashboard',16)}<span>/</span><strong>${titles[p]}</strong></div><div class="topbar-right"><span class="top-date">${h(dateLong())}</span><span class="top-separator"></span><span class="avatar">${state.mode==='cloud'?h((state.user?.email||'I').slice(0,2).toUpperCase()):'IC'}</span>${state.mode==='cloud'?button('logout','Cerrar sesión','btn-outline header-logout','logout'):''}</div></header>
 <main class="content">${state.mode==='local'?`<div class="notice">${icon('info',16)}<span><b>Modo local:</b> los registros se guardan únicamente en este navegador. Para que Ángel y Micaela vean la misma información desde distintos dispositivos, configura Supabase según el archivo README. <button type="button" class="btn-ghost" data-action="nav" data-page="settings" style="font-weight:800;color:#916a2f;padding:2px 4px">Ver configuración</button></span></div>`:''}
 ${p==='dashboard'?renderDashboard():p==='sales'?renderSales():p==='movements'?renderMovements():p==='fixed'?renderFixedExpenses():p==='reports'?renderReports():renderSettings()}
 </main></div></div>`;
}
function kpi(label,value,foot,ico,style='') {return `<article class="kpi ${style}"><div class="kpi-top"><span class="kpi-label">${label}</span><div class="kpi-icon">${icon(ico,18)}</div></div><div class="kpi-value">${money(value)}</div><div class="kpi-foot">${foot}</div></article>`;}
function kpiGrid(t) {return `<div class="kpi-grid">${kpi('Saldo tarjeta IMVICTO',t.card,'Saldo acumulado en la tarjeta','wallet','primary')}${kpi('Saldo de Micaela',t.micaela,'Comisiones y movimientos','user','gold')}${kpi('Saldo de Ángel',t.angel,'Comisiones y movimientos','user')}${kpi('Ingreso líquido de ventas',t.liquid,`${state.sales.length} venta(s) registrada(s)`,'coins')}</div>`;}
function monthsFor(year, upto) {return Array.from({length:upto},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`);}
const MONTH_NAMES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function monthlyData(keys) {return keys.map(key=>{const sales=state.sales.filter(s=>s.sale_date?.slice(0,7)===key);const movs=activeMovements().filter(m=>m.move_date?.slice(0,7)===key&&m.account==='tarjeta');const incoming=sales.reduce((s,x)=>s+saleCardValue(x,state.settings.card_sales_basis),0)+movs.filter(m=>m.kind==='ingreso').reduce((s,m)=>s+num(m.amount),0);const outgoing=movs.filter(m=>m.kind==='egreso').reduce((s,m)=>s+num(m.amount),0);return {key,name:MONTH_NAMES[Number(key.slice(5))-1],incoming:c2(incoming),outgoing:c2(outgoing)};});}
function flowChart(data) {
 const W=750,H=245,l=48,r=10,t=22,b=35;const max=Math.max(1,...data.flatMap(x=>[x.incoming,x.outgoing]));const yMax=max*1.16;const hgt=H-t-b,space=(W-l-r)/Math.max(1,data.length);const bar=Math.min(27,space*.25);
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico mensual de entradas y salidas de la tarjeta"><defs><linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e0bd74"/><stop offset="1" stop-color="#b58c44"/></linearGradient><linearGradient id="barBlue" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#284b77"/><stop offset="1" stop-color="#17365e"/></linearGradient></defs>`;
 for(let i=0;i<=4;i++){let y=t+hgt*(1-i/4);svg+=`<line x1="${l}" y1="${y}" x2="${W-r}" y2="${y}" stroke="#ecf0f4" stroke-dasharray="${i===0?'0':'3 4'}"/><text x="${l-9}" y="${y+4}" fill="#a2adba" font-size="10" text-anchor="end">${i===0?'0':new Intl.NumberFormat('es-PE',{notation:'compact',maximumFractionDigits:1}).format(yMax*i/4)}</text>`;}
 for(let i=0;i<data.length;i++){const d=data[i],xc=l+space*(i+.5),ih=d.incoming/yMax*hgt,oh=d.outgoing/yMax*hgt;svg+=`<rect x="${xc-bar-3}" y="${t+hgt-ih}" width="${bar}" height="${ih}" rx="4" fill="url(#barGold)"><title>${d.name}: ingresos ${money(d.incoming)}</title></rect><rect x="${xc+3}" y="${t+hgt-oh}" width="${bar}" height="${oh}" rx="4" fill="url(#barBlue)"><title>${d.name}: egresos ${money(d.outgoing)}</title></rect><text x="${xc}" y="${H-12}" text-anchor="middle" font-size="11" fill="#8f9caf">${d.name}</text>`;}
 return svg+'</svg>';
}
function recentSalesTable(items,small=false) {return `<div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Cliente / Producto</th><th>Tipo</th><th>Ingreso líquido</th><th>Micaela</th><th>Ángel</th>${small?'':'<th>Participación</th>'}</tr></thead><tbody>${items.length?items.map(s=>{const v=split(s);return `<tr><td style="white-space:nowrap">${dateShow(s.sale_date)}</td><td><span class="cell-main">${h(s.client)}</span><span class="cell-sub">${h(s.product)}</span></td><td><span class="badge-type ${s.sale_type==='FINANCIADO'?'finance':''}">${h(s.sale_type)}</span></td><td class="money money-bold">${money(v.liquid)}</td><td class="money money-gold">${money(v.micaela)}</td><td class="money money-navy">${money(v.angel)}</td>${small?'':`<td>${participationLabel(s.participation)}</td>`}</tr>`;}).join(''):`<tr><td colspan="${small?6:7}" class="empty">Todavía no hay ventas registradas.</td></tr>`}</tbody></table></div>`;}
function renderDashboard() {
 const t=totals();const d=new Date();const keys=Array.from({length:6},(_,i)=>{const x=new Date(d.getFullYear(),d.getMonth()-5+i,1);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`;});const commissionAbs=Math.abs(t.commissionM)+Math.abs(t.commissionA);const pct=commissionAbs?100*Math.abs(t.commissionM)/commissionAbs:50;
 const recent=sortedMovs().slice(0,4);
 return `${sectionTitle('Control financiero','Resumen de ingresos, comisiones y movimientos de IMVICTO CORP.',`${button('open-sale','Nueva venta','btn-gold','plus')}${button('open-movement','Nuevo movimiento','btn-outline','movements')}<a class="btn btn-outline" href="${h(GOOGLE_FORM_URL)}" target="_blank" rel="noopener noreferrer">${icon('plus',15)} Registrar gasto desde celular</a>`)}${kpiGrid(t)}
 <div class="grid-panels"><section class="panel"><div class="panel-head"><div><h2 class="panel-title">Flujo de la tarjeta</h2><p class="panel-sub">Ingresos y egresos de los últimos 6 meses</p></div><div class="small-legend"><span><i class="legend-dot" style="background:#cba65f"></i>Ingresos</span><span><i class="legend-dot" style="background:#1b406c"></i>Egresos</span></div></div><div class="chart-box">${flowChart(monthlyData(keys))}</div></section>
 <section class="panel"><div class="panel-head"><div><h2 class="panel-title">Distribución de comisiones</h2><p class="panel-sub">Participación acumulada en las ventas</p></div>${icon('users',17)}</div><div class="alloc"><div class="alloc-top"><span class="alloc-names"><span style="color:#aa8848">Micaela ${pct.toFixed(1)} %</span></span><span style="font-weight:700;color:#26496e">Ángel ${(100-pct).toFixed(1)} %</span></div><div class="alloc-track"><span class="m" style="width:${pct}%"></span><span class="a" style="width:${100-pct}%"></span></div><div class="alloc-cards"><div class="alloc-card"><div class="label"><i class="dot" style="background:#c9a562"></i>Micaela</div><div class="value">${money(t.commissionM)}</div></div><div class="alloc-card"><div class="label"><i class="dot" style="background:#1b406c"></i>Ángel</div><div class="value">${money(t.commissionA)}</div></div></div><p class="form-footnote">Las comisiones se calculan sobre el ingreso líquido de cada venta.</p></div></section></div>
 <div class="grid-panels"><section class="panel table-panel"><div class="table-top"><div><h2 class="panel-title">Últimas ventas</h2><p class="panel-sub">Detalle de las comisiones generadas</p></div>${button('nav','Ver todas','btn-outline','chevron','data-page="sales"')}</div>${recentSalesTable(sortedSales().slice(0,5),true)}</section>
 <section class="panel"><div class="panel-head"><div><h2 class="panel-title">Actividad reciente</h2><p class="panel-sub">Últimos movimientos registrados</p></div>${icon('clock',17)}</div><div style="padding:0 22px 13px">${recent.length?recent.map(m=>`<div class="mini-stat"><div><div class="name">${h(m.concept)}</div><div class="detail">${dateShow(m.move_date)} · ${h(accountLabel(m.account))}</div></div><div class="amount ${m.kind==='egreso'?'money-red':'money-green'}">${m.kind==='egreso'?'−':'+'}${money(m.amount)}</div></div>`).join(''):`<p style="font-size:12px;color:#97a2af;padding:18px 0">Aún no hay movimientos.</p>`}</div></section></div>`;
}
function controls(kind) {const sale=kind==='sales';return `<div class="table-actions"><label class="search-input">${icon('search',15)}<input id="${sale?'search-sales':'search-movements'}" type="search" placeholder="Buscar ${sale?'cliente o producto':'concepto o responsable'}..." value="${h(sale?state.filterSales:state.filterMov)}" aria-label="Buscar" /></label><select class="filter-select" id="${sale?'period-sales':'period-movements'}" aria-label="Filtrar por fecha">${selOptions([['all','Todo el historial'],['month','Este mes'],['year','Este año']],sale?state.periodSales:state.periodMov)}</select></div>`;}
function pagination(page,pages,total) {return `<div class="table-footer"><span>Mostrando <strong>${total===0?0:(page-1)*8+1}–${Math.min(page*8,total)}</strong> de <strong>${total}</strong> registros</span><div class="paginator"><button data-action="page-prev" ${page<=1?'disabled':''} aria-label="Página anterior">${icon('left',15)}</button><span>${page} / ${pages}</span><button data-action="page-next" ${page>=pages?'disabled':''} aria-label="Página siguiente">${icon('chevron',15)}</button></div></div>`;}
function renderSales() {
 const a=qfilter(sortedSales(),state.filterSales,state.periodSales,'sale_date',['client','product','sale_type','participation']);const pg=paged(a,state.salePage);state.salePage=pg.page;
 return `${sectionTitle('Ventas y comisiones','Registra cada venta. Los cálculos de ingreso líquido y comisiones son automáticos.',`${button('export-sales','Exportar CSV','btn-outline','download')}${button('open-sale','Añadir venta','btn-gold','plus')}`)}
 <div class="panel table-panel"><div class="table-top"><div><h2 class="panel-title">Registro de ventas</h2><p class="panel-sub">Estructura fija, con importes en soles (PEN)</p></div>${controls('sales')}</div><div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Venta</th><th>Tipo</th><th>Ingreso neto</th><th>Utilidad</th><th>Pago vendedor</th><th>Ingreso líquido</th><th>Comisión Micaela</th><th>Comisión Ángel</th><th>Participaron</th><th>Acciones</th></tr></thead><tbody>${pg.rows.length?pg.rows.map(s=>{const v=split(s);return `<tr><td style="white-space:nowrap">${dateShow(s.sale_date)}</td><td class="cell-main">${h(s.client)}</td><td style="min-width:158px">${h(s.product)}</td><td><span class="badge-type ${s.sale_type==='FINANCIADO'?'finance':''}">${h(s.sale_type)}</span></td><td class="money">${money(s.net_income)}</td><td class="money">${money(s.profit)}</td><td class="money">${money(s.seller_payment)}</td><td class="money money-bold">${money(v.liquid)}</td><td class="money money-gold">${money(v.micaela)} <span class="cell-sub">${v.pm} %</span></td><td class="money money-navy">${money(v.angel)} <span class="cell-sub">${v.pa} %</span></td><td style="white-space:nowrap">${participationLabel(s.participation)}</td><td><div style="display:flex;gap:6px"><button class="btn-icon" data-action="edit-sale" data-id="${h(s.id)}" aria-label="Editar venta" title="Editar">${icon('edit',15)}</button><button class="btn-icon" data-action="delete-sale" data-id="${h(s.id)}" aria-label="Eliminar venta" title="Eliminar">${icon('trash',15)}</button></div></td></tr>`;}).join(''):`<tr><td class="empty" colspan="12"><div class="empty-icon">${icon('sales',24)}</div><div class="empty-title">Sin ventas en este listado</div>Agrega tu primera venta con el botón «Añadir venta».</td></tr>`}</tbody></table></div>${pagination(pg.page,pg.pages,a.length)}</div>
 <p class="form-footnote">Fórmula: <strong>Ingreso líquido = ingreso neto − utilidad − pago vendedor.</strong> Distribución: Micaela sola 60/40; Ángel solo 40/60; ambos o ninguno 50/50. Todos los importes se redondean a céntimos.</p>`;
}
function fullMonthTitle(key) {const [y,m]=key.split('-').map(Number);return new Intl.DateTimeFormat('es-PE',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));}
function calOccurrences(month=state.calendarMonth) {return expenseOccurrences(state.fixedExpenses,state.fixedOverrides,activeMovements(),month);}
function expenseNameStatus(x) {return x.actual?'Pagado':x.due_date<today()?'Vencido':'Pendiente';}
function expenseOverview() {
 const current=calOccurrences(today().slice(0,7)),r=expenseSummary(current,today());
 return `<div class="fixed-overview"><div class="panel"><span class="kpi-label">Gastos programados este mes</span><div class="overview-value">${money(r.total)}</div></div><div class="panel"><span class="kpi-label">Pagados este mes</span><div class="overview-value money-green">${money(r.paid)}</div></div><div class="panel"><span class="kpi-label">Aún por pagar</span><div class="overview-value money-red">${money(r.pending)}</div></div></div>`;
}
function renderFixedExpenses() {
 const month=state.calendarMonth,occ=calOccurrences(month),sum=expenseSummary(occ,today()),days=monthGrid(month);
 const byDay=new Map();for(const o of occ){const d=Number(o.due_date.slice(8));if(!byDay.has(d))byDay.set(d,[]);byDay.get(d).push(o);}
 const totalActive=state.fixedExpenses.filter(x=>x.active).length;
 const cells=days.map(day=>!day?'<div class="calendar-day empty-day" aria-hidden="true"></div>':`<div class="calendar-day ${month+'-'+String(day).padStart(2,'0')===today()?'current-day':''}"><span class="day-num">${day}</span>${(byDay.get(day)||[]).map(o=>`<button class="day-event ${o.actual?'done':'pending'}" data-action="fixed-detail" data-id="${h(o.id)}" title="${h(o.concept)} · ${h(originalAndSoles(o))}">${o.actual?'✓ ':''}${h(o.concept)}<small>${money(o.expected_amount)}${o.currency==='USD'?'<br>US$ '+plain(o.original_amount):''}</small></button>`).join('')}</div>`).join('');
 return `${sectionTitle('Calendario de gastos fijos','Planifica obligaciones mensuales y comprueba cuáles se pagaron. Las previsiones no descuentan saldo hasta que registres el pago.',`${button('add-fixed','Nuevo gasto fijo','btn-gold','plus')}${button('export-fixed-month','Exportar previsión','btn-outline','download')}`)}
 ${expenseOverview()}
 <section class="panel fixed-calendar"><div class="calendar-head"><div><p class="eyebrow">PROGRAMACIÓN Y PREVISIÓN</p><h2>${h(fullMonthTitle(month))}</h2><p>${occ.length} obligaciones · ${sum.paidCount} pagadas</p></div><div class="calendar-controls"><button class="btn-icon" data-action="fixed-prev" title="Mes anterior">${icon('left')}</button><input aria-label="Mes a consultar" type="month" id="fixed-month-picker" value="${month}"/><button class="btn-icon" data-action="fixed-next" title="Mes siguiente">${icon('chevron')}</button><button class="btn btn-outline" data-action="fixed-today">Hoy</button></div></div>
 <div class="cal-legend"><span><i class="legend-dot" style="background:#b48b42"></i>Pendiente</span><span><i class="legend-dot" style="background:#168762"></i>Pagado</span><span class="tiny">Los días 29–31 pasan al último día en meses más cortos.</span></div>
 <div class="calendar-grid">${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(x=>`<div class="weekday">${x}</div>`).join('')}${cells}</div>
 <div class="calendar-totals"><div><span>Presupuesto</span><strong>${money(sum.total)}</strong></div><div><span>Pagado real</span><strong class="money-green">${money(sum.paid)}</strong></div><div><span>Pendiente estimado</span><strong class="money-red">${money(sum.pending)}</strong></div><div><span>Vencidos</span><strong>${sum.late}</strong></div></div></section>
 <section class="panel table-panel fixed-list"><div class="table-top"><div><h2 class="panel-title">Obligaciones de ${h(fullMonthTitle(month))}</h2><p class="panel-sub">Puedes modificar el presupuesto de este mes sin cambiar el resto.</p></div>${button('add-fixed','Añadir gasto fijo','btn-outline','plus')}</div>
 <div class="table-scroll"><table><thead><tr><th>Vence</th><th>Concepto</th><th>Importe presupuestado</th><th>Saldo afectado</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${occ.length?occ.map(o=>`<tr><td>${dateShow(o.due_date)}</td><td><span class="cell-main">${h(o.concept)}</span>${o.currency==='USD'?`<span class="cell-sub">US$ ${plain(o.original_amount)} · TC ${showRate(o.exchange_rate)} S/ por USD</span>`:''}${o.override?'<span class="cell-sub">Monto especial este mes</span>':''}${o.notes?`<span class="cell-sub">${h(o.notes)}</span>`:''}</td><td class="money money-bold">${money(o.expected_amount)}${o.currency==='USD'?'<span class="cell-sub">'+originalMoney(o.original_amount,o.currency)+'</span>':''}</td><td>${h(accountLabel(o.account))}</td><td><span class="fixed-status ${o.actual?'done':o.due_date<today()?'late':'pending'}">${expenseNameStatus(o)}</span>${o.actual?`<span class="cell-sub">Real: ${money(o.actual.amount)}</span>`:''}</td><td><div class="fixed-buttons">${o.actual?`<button class="btn btn-outline btn-sm" data-action="edit-movement" data-id="${h(o.actual.id)}">${icon('edit',13)} Ver pago</button><button class="btn btn-outline btn-sm" data-action="unlink-fixed" data-id="${h(o.actual.id)}">Desvincular</button>`:`<button class="btn btn-gold btn-sm" data-action="pay-fixed" data-id="${h(o.id)}">Pagar</button><button class="btn btn-outline btn-sm" data-action="link-fixed" data-id="${h(o.id)}">Vincular gasto</button>`}<button class="btn-icon" data-action="adjust-fixed" data-id="${h(o.id)}" title="Cambiar monto de este mes">${icon('coins',15)}</button><button class="btn-icon" data-action="edit-fixed" data-id="${h(o.id)}" title="Editar gasto recurrente">${icon('edit',15)}</button></div></td></tr>`).join(''):`<tr><td colspan="6" class="empty">No tienes gastos fijos programados en este mes. Agrega el primero.</td></tr>`}</tbody></table></div></section>
 <section class="panel fixed-presets"><div class="panel-head"><div><h2 class="panel-title">Gastos habituales</h2><p class="panel-sub">Agrega conceptos sin asumir importes ni fechas.</p></div><span class="badge-type">${totalActive} activos</span></div><div class="preset-list">${['Pago Oficina','Rappi Mensual','Equifax','ChatGPT empresarial'].map(x=>`<button data-action="preset-fixed" data-concept="${h(x)}" class="preset-btn">${icon('plus',14)} ${h(x)}</button>`).join('')}</div><p class="form-footnote">«ChatGPT empresarial» es sólo una propuesta de presupuesto, no una suscripción contratada ni un cobro real.</p>
 ${state.fixedExpenses.length?`<div class="fixed-master"><strong>Administrar gastos recurrentes</strong>${state.fixedExpenses.map(x=>`<div class="fixed-master-row"><span>${h(x.concept)} · ${originalMoney(x.amount,x.currency)}${x.currency==='USD'?' · TC base '+showRate(x.exchange_rate):''} · día ${x.due_day} ${x.active?'':'· Inactivo'}</span><div><button class="btn-icon" title="Editar" data-action="edit-fixed" data-id="${h(x.id)}">${icon('edit',14)}</button><button class="btn-icon" title="${x.active?'Desactivar':'Reactivar'}" data-action="toggle-fixed" data-id="${h(x.id)}">${icon(x.active?'x':'check',14)}</button><button class="btn-icon" title="Eliminar regla" data-action="delete-fixed" data-id="${h(x.id)}">${icon('trash',14)}</button></div></div>`).join('')}</div>`:''}</section>`;
}
function movementRow(m) {return `<tr><td style="white-space:nowrap">${dateShow(m.move_date)}</td><td class="cell-main" style="min-width:180px">${h(m.concept)}${m.source==='google_form'?`<span class="source-label">Google Form${m.form_locked?' · Editado':''}</span>`:''}${m.recurring_id?'<span class="source-label recurring-label">Gasto fijo</span>':''}</td><td class="money money-red">${m.kind==='egreso'?`− ${money(m.amount)}`:'—'}</td><td class="money money-green">${m.kind==='ingreso'?`+ ${money(m.amount)}`:'—'}</td><td>${h(payerLabel(m.payer))}</td><td><span class="badge-type ${m.kind==='egreso'?'out':'in'}">${h(accountLabel(m.account))}</span></td><td><div style="display:flex;gap:6px"><button class="btn-icon" data-action="edit-movement" data-id="${h(m.id)}" title="Editar">${icon('edit',15)}</button><button class="btn-icon" data-action="delete-movement" data-id="${h(m.id)}" title="Eliminar">${icon('trash',15)}</button></div></td></tr>`;}
function renderMovements() {
 const a=qfilter(sortedMovs(),state.filterMov,state.periodMov,'move_date',['concept','account','payer','kind']);
 const tin=c2(a.filter(x=>x.kind==='ingreso').reduce((v,x)=>v+num(x.amount),0));const tout=c2(a.filter(x=>x.kind==='egreso').reduce((v,x)=>v+num(x.amount),0));
 const deleted=deletedFormMovements().sort((a,b)=>b.move_date.localeCompare(a.move_date));
 return `${sectionTitle('Ingresos y egresos','Cada movimiento afecta la tarjeta IMVICTO o el saldo de uno o ambos agentes.',`<a class="btn btn-outline" href="${h(GOOGLE_FORM_URL)}" target="_blank" rel="noopener noreferrer">${icon('plus',15)} Abrir Google Form</a>${button('sync-form','Sincronizar Form','btn-outline','refresh')}${deleted.length?button('toggle-form-trash',state.showDeletedForms?'Ocultar eliminados':`Eliminados (${deleted.length})`,'btn-outline','trash'):''}${button('open-expense','Añadir egreso','btn-outline','out')}${button('open-income','Añadir ingreso','btn-gold','plus')}`)}
 <section class="forms-bridge" aria-label="Integración Google Forms"><div class="forms-badge">${icon('refresh',19)}</div><div class="forms-copy"><strong>Importación desde Google Forms</strong><p>Cada respuesta respeta «Saldo afectado»: IMVICTO = tarjeta, MICAELA = saldo de Micaela y ANGEL = saldo de Ángel. «Pagado por» es informativo y no determina a quién se descuenta. Los ingresos suman y los egresos restan. Puedes editar o eliminar movimientos importados sin que reaparezcan al sincronizar.</p><span class="forms-status ${state.formSyncError?'bad':''}">${state.formSyncBusy?'Sincronizando movimientos…':state.formSyncError?'Error de sincronización: '+h(state.formSyncError):state.formSyncAt?'Última revisión: '+h(state.formSyncAt.toLocaleTimeString('es-PE'))+' · Nuevos o actualizados: '+state.formSyncAdded+' · Filas descartadas: '+state.formSyncSkipped:'Pendiente de primera sincronización'}</span><div class="forms-extra"><a href="${h(GOOGLE_CSV_URL)}" target="_blank" rel="noopener noreferrer">Ver CSV publicado</a><span>·</span>${button('upload-forms-csv','Importar CSV manual','btn-ghost','upload')}<input id="forms-csv-file" type="file" accept=".csv,text/csv" hidden /></div></div></section>
 <div class="stat-pair" style="margin-bottom:18px"><div class="panel"><span class="kpi-label">Ingresos en el listado</span><span class="v money-green">${money(tin)}</span></div><div class="panel"><span class="kpi-label">Egresos en el listado</span><span class="v money-red">${money(tout)}</span></div></div>
 <div class="panel table-panel"><div class="table-top"><div><h2 class="panel-title">Historial de movimientos por mes</h2><p class="panel-sub">Cada mes se puede expandir, cerrar y exportar individualmente.</p></div>${controls('movements')}</div>
 ${(()=>{const groups=new Map();for(const m of a){const key=m.move_date.slice(0,7);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}return [...groups].map(([key,rows])=>{const isOpen=state.openMonths.has(key);const inn=c2(rows.filter(m=>m.kind==='ingreso').reduce((v,m)=>v+num(m.amount),0));const out=c2(rows.filter(m=>m.kind==='egreso').reduce((v,m)=>v+num(m.amount),0));return `<section class="monthly-group"><div class="monthly-head"><button class="monthly-toggle" data-action="toggle-month" data-month="${key}" aria-expanded="${isOpen}">${icon(isOpen?'out':'chevron',15)}<span><b>${h(fullMonthTitle(key))}</b><small>${rows.length} movimiento(s) · ${key===today().slice(0,7)?'Mes actual':key<today().slice(0,7)?'Mes histórico':'Mes futuro'}</small></span></button><div class="monthly-values"><span class="money-green">+ ${money(inn)}</span><span class="money-red">− ${money(out)}</span><b> ${money(inn-out)}</b></div><button class="btn btn-outline btn-sm" data-action="export-month" data-month="${key}">${icon('download',14)} Exportar mes</button></div>${isOpen?`<div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Egresos</th><th>Ingresos</th><th>Pagado / recibido por</th><th>Saldo afectado</th><th>Acciones</th></tr></thead><tbody>${rows.map(movementRow).join('')}</tbody></table></div>`:''}</section>`;}).join('')||'<div class="empty">No hay movimientos que coincidan con el filtro.</div>';})()}</div>
 ${state.showDeletedForms&&deleted.length?`<section class="panel table-panel form-trash"><div class="table-top"><div><h2 class="panel-title">Movimientos eliminados de Google Forms</h2><p class="panel-sub">No suman ni restan saldos. Se mantienen para impedir que la sincronización los vuelva a agregar.</p></div>${button('toggle-form-trash','Ocultar','btn-outline','x')}</div><div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Importe</th><th>Cuenta</th><th>Acción</th></tr></thead><tbody>${deleted.map(m=>`<tr><td>${dateShow(m.move_date)}</td><td class="cell-main">${h(m.concept)}</td><td>${m.kind==='egreso'?'Egreso':'Ingreso'}</td><td class="money">${money(m.amount)}</td><td>${h(accountLabel(m.account))}</td><td><button class="btn btn-outline" data-action="restore-form-movement" data-id="${h(m.id)}">${icon('refresh',15)} Restaurar</button></td></tr>`).join('')}</tbody></table></div></section>`:''}
 <p class="form-footnote">Cada grupo mensual es desplegable y se puede exportar. Los gastos recurrentes se programan desde «Gastos fijos». Todos los movimientos, incluidos los de Google Forms, se pueden editar o eliminar. Los cambios hechos aquí tienen prioridad y no se reemplazan al sincronizar. Los eliminados dejan de afectar los saldos, pero no se borran de Google Sheets. Si seleccionas «Micaela y Ángel», el importe se divide 50/50. «Pagado / recibido por» es informativo.</p>`;
}
function renderReports() {
 const t=totals(),y=state.reportYear,data=monthlyData(monthsFor(y,12));const totalTransactions=state.sales.length+activeMovements().length;
 const counts=Object.fromEntries(TYPES.map(z=>[z,state.sales.filter(s=>s.sale_type===z).length]));
 const netByType=TYPES.map(type=>({type,count:counts[type],amount:c2(state.sales.filter(s=>s.sale_type===type).reduce((sum,s)=>sum+num(s.net_income),0))}));
 return `${sectionTitle('Reportes financieros','Estadísticas anuales, comisiones acumuladas y distribución por tipos de venta.',`${button('export-sales','Exportar ventas','btn-outline','download')}${button('export-movements','Exportar movimientos','btn-outline','download')}${button('export-month-current','Exportar mes actual','btn-gold','calendar')}`)}
 ${kpiGrid(t)}
 <div class="grid-panels"><section class="panel"><div class="panel-head"><div><h2 class="panel-title">Flujo anual de la tarjeta</h2><p class="panel-sub">Ingresos y egresos reales configurados para la tarjeta</p></div><div class="month-toggle"><button data-action="year-prev">${icon('left',13)}</button><button class="active" aria-label="Año del reporte">${y}</button><button data-action="year-next">${icon('chevron',13)}</button></div></div><div class="chart-box">${flowChart(data)}</div></section>
 <section class="panel"><div class="panel-head"><div><h2 class="panel-title">Indicadores acumulados</h2><p class="panel-sub">Desde el comienzo de los registros</p></div>${icon('reports',17)}</div><div class="report-facts">${[['Ventas registradas',state.sales.length,'Número de operaciones'],['Ingreso neto de ventas',money(t.net),'Base de los cálculos'],['Utilidad retenida',money(t.profit),'Descontada antes de comisiones'],['Pago a vendedor',money(t.sellerPay),'Descontado antes de comisiones'],['Movimientos registrados',activeMovements().length,'Ingresos y egresos'],['Egresos adicionales',money(t.expensesMov),'Todos los destinos']].map(([a,b,c])=>`<div class="mini-stat"><div><div class="name">${a}</div><div class="detail">${c}</div></div><b class="amount">${b}</b></div>`).join('')}</div></section></div>
 <div class="panel table-panel"><div class="table-top"><div><h2 class="panel-title">Ventas por modalidad</h2><p class="panel-sub">Recuento y monto neto por tipo de venta</p></div></div><div class="table-scroll"><table><thead><tr><th>Modalidad</th><th>N.° de ventas</th><th>Ingreso neto total</th><th>Participación del ingreso</th></tr></thead><tbody>${netByType.map(x=>`<tr><td class="cell-main">${x.type}</td><td>${x.count}</td><td class="money money-bold">${money(x.amount)}</td><td style="min-width:190px"><div class="alloc-track" style="height:8px"><span class="m" style="width:${t.net?Math.max(0,Math.min(100,x.amount/t.net*100)):0}%"></span></div></td></tr>`).join('')}</tbody></table></div><div class="table-footer"><span>${totalTransactions} operaciones registradas en total</span>${syncStatus()}</div></div>`;
}
function renderSettings() {
 const z=state.settings;
 return `${sectionTitle('Configuración','Define los saldos iniciales y cómo las ventas afectan la tarjeta empresarial.',state.mode==='cloud'?button('logout','Cerrar sesión','btn-outline','logout'):'')}
 <div class="settings-layout"><section class="panel settings-card"><h3>Parámetros financieros</h3><p>Estos valores forman la base del cálculo. Las comisiones de cada venta se calculan automáticamente a partir del ingreso líquido.</p>
 <form id="settings-form"><div class="form-grid"><div class="field"><label for="initial-card">Saldo inicial de la tarjeta IMVICTO (S/)</label><input id="initial-card" name="card_initial" type="text" inputmode="decimal" value="${h(plain(z.card_initial))}" required /></div><div class="field"><label for="initial-m">Saldo inicial de Micaela (S/)</label><input id="initial-m" name="micaela_initial" type="text" inputmode="decimal" value="${h(plain(z.micaela_initial))}" required /></div><div class="field"><label for="initial-a">Saldo inicial de Ángel (S/)</label><input id="initial-a" name="angel_initial" type="text" inputmode="decimal" value="${h(plain(z.angel_initial))}" required /></div><div class="field"><label for="sales-card">¿Cuánto entra a la tarjeta con cada venta?</label><select id="sales-card" name="card_sales_basis">${selOptions([['neto','Todo el ingreso neto (predeterminado)'],['liquido','Solo el ingreso líquido'],['ninguno','No registrar abono automático']],z.card_sales_basis)}</select></div></div>
 <div class="tip" style="margin:18px 0 19px">${icon('info',16)} <strong>Importante:</strong> el ingreso líquido sirve siempre para repartir comisiones. El selector determina, por separado, cuánto se registra en el saldo de la tarjeta. Los pagos efectivamente realizados desde la tarjeta deben registrarse como egresos para que su saldo físico coincida con el banco.</div><button type="submit" class="btn btn-gold">${icon('check',16)} Guardar configuración</button></form>
 <div class="section-rule"></div><h3>Respaldo y exportación</h3><p>Descarga un respaldo completo de tus registros y configuración. Úsalo también para conservar una copia fuera del navegador.</p><div class="intro-actions">${button('export-backup','Descargar respaldo JSON','btn-outline','download')}${state.mode==='local'?button('import-backup','Restaurar JSON','btn-outline','upload'):button('import-backup','Importar datos locales al iniciar','btn-outline','upload')}</div><input type="file" id="backup-file" accept=".json,application/json" hidden />
 ${state.mode==='local'?`<div class="section-rule"></div><h3>Datos de prueba</h3><p>Para revisar el funcionamiento, puedes agregar ventas de ejemplo basadas en las capturas compartidas. No reemplazan tus propios registros.</p><div class="intro-actions">${button('seed-demo','Cargar ventas de ejemplo','btn-outline','plus')}${button('reset-local','Borrar todos los registros locales','btn-danger','trash')}</div>`:''}
 </section><aside class="panel settings-card"><h3>${state.mode==='cloud'?'Sincronización compartida':'Acceso desde dos dispositivos'}</h3><p>${state.mode==='cloud'?'Los movimientos guardados se comparten entre las dos cuentas autorizadas.':'Para que Micaela y Ángel puedan iniciar sesión y editar la misma información se requiere una base de datos online.'}</p>
 <div class="tip">${icon(state.mode==='cloud'?'shield':'info',17)} <strong>${state.mode==='cloud'?'Modo en línea activado':'Configuración inicial'}</strong><div style="margin-top:8px">${state.mode==='cloud'?`Usuario: ${h(state.user?.email)}. Los datos de Supabase tienen permisos restringidos a usuarios autorizados.`:'El archivo <code>README.md</code> explica cómo crear un proyecto gratuito de Supabase, ejecutar la base de datos, dar acceso a dos cuentas y pegar las claves públicas en <code>config.js</code>.'}</div></div>
 <ol class="steps"><li>La tabla de ventas calcula el reparto sin fórmulas manuales.</li><li>La tabla de movimientos afecta el saldo que selecciones.</li><li>Los cambios se pueden modificar o eliminar.</li><li>Los importes se guardan con dos decimales.</li></ol>
 <div class="section-rule"></div><div class="tiny">Versión 4.0 · Calendario, Google Forms y cierre mensual · Moneda PEN · IMVICTO CORP</div>${state.mode==='cloud'?`<div style="margin-top:16px">${button('refresh','Actualizar datos','btn-outline','refresh')}</div>`:''}</aside></div>`;
}
function render() {
 if(state.loading){document.getElementById('app').innerHTML='<div class="loading-first">IMVICTO <span>CORP</span></div>';return;}
 if(state.mode==='cloud'&&!state.user){renderAuth();return;}
 document.getElementById('app').innerHTML=shell();
}
function renderAuth() {
 document.getElementById('app').innerHTML=`<div class="auth-layout"><div class="auth-brand"><img src="./assets/logo-imvicto.png" alt="IMVICTO CORP"/><div class="auth-quote">CONTROL FINANCIERO INTELIGENTE</div></div><div class="auth-right"><div class="auth-form"><p class="eyebrow">BIENVENIDOS A IMVICTO CORP</p><h1>Accede a tu cuenta</h1><p>Un espacio compartido y privado para gestionar las ventas, comisiones y finanzas de la empresa.</p>${state.cloudError?`<div class="auth-err">${h(state.cloudError)}</div>`:''}${state.authError?`<div class="auth-err">${h(state.authError)}</div>`:''}<form id="login-form"><div class="field"><label>Correo electrónico</label><input name="email" type="email" autocomplete="username" placeholder="correo@ejemplo.com" required /></div><div class="field"><label>Contraseña</label><input name="password" type="password" autocomplete="current-password" placeholder="Tu contraseña" required /></div><button type="submit" class="btn btn-gold" style="width:100%;margin-top:12px">${icon('shield',17)} Iniciar sesión</button></form><p class="tiny" style="margin-top:22px">Acceso exclusivo para Ángel y Micaela. Las cuentas se crean en Supabase y se autorizan mediante la lista de acceso.</p></div></div></div>`;
}
function inputField(name,title,value='',type='text',more='') {
 const v=value??'';return `<div class="field"><label for="f-${name}">${title}</label><input id="f-${name}" name="${name}" type="${type}" value="${h(v)}" ${more} required /></div>`;
}
function selectField(name,title,opts,val) {return `<div class="field"><label for="f-${name}">${title}</label><select id="f-${name}" name="${name}" required>${selOptions(opts,val)}</select></div>`;}
function modalShell(title,subtitle,body,wide=true) {return `<div class="modal-layer" data-overlay="true" role="presentation"><div class="modal ${wide?'':'sm'}" role="dialog" aria-modal="true" aria-label="${h(title)}"><div class="modal-header"><div><h2>${title}</h2><p>${subtitle}</p></div><button type="button" class="btn-icon" data-action="close-modal" aria-label="Cerrar">${icon('x',18)}</button></div>${body}</div></div>`;}
function saleModal(id) {
 const s=id?state.sales.find(x=>x.id===id):null;if(id&&!s){toast('No se encontró la venta','error');return;}
 const z=s||{sale_date:today(),client:'',product:'',sale_type:'CONTADO',net_income:'',profit:'',seller_payment:'',participation:'ambos'};
 const inputs=`<div class="form-grid">${inputField('sale_date','Fecha',z.sale_date,'date')}${selectField('sale_type','Tipo de venta',TYPES.map(x=>[x,x]),z.sale_type)}${inputField('client','Cliente',z.client,'text','maxlength="120" placeholder="Ej. GUILLERMO R."')}${inputField('product','Venta / Producto',z.product,'text','maxlength="160" placeholder="Ej. SET DE 10"')}${inputField('net_income','Ingreso neto (S/)',s?plain(z.net_income):'','text','inputmode="decimal" placeholder="0,00"')}${inputField('profit','Utilidad (S/)',s?plain(z.profit):'','text','inputmode="decimal" placeholder="0,00"')}${inputField('seller_payment','Pago vendedor (S/)',s?plain(z.seller_payment):'','text','inputmode="decimal" placeholder="0,00"')}${selectField('participation','¿Quién participó en la venta?',PARTICIPANTS,z.participation)}</div>
 <div class="calc-preview"><div class="preview-header">${icon('coins',16)} DISTRIBUCIÓN AUTOMÁTICA</div><div class="preview-grid"><div class="preview-item"><span>Ingreso líquido</span><b id="p-liquid">${money(0)}</b></div><div class="preview-item"><span id="p-label-m">Micaela · 50 %</span><b id="p-m">${money(0)}</b></div><div class="preview-item"><span id="p-label-a">Ángel · 50 %</span><b id="p-a">${money(0)}</b></div></div></div><p id="sale-negative-notice" class="sale-negative-notice" hidden>Esta venta tiene ingreso líquido negativo. Se puede guardar: el importe negativo se repartirá entre Micaela y Ángel y descontará sus saldos.</p><p class="form-footnote">Ingreso líquido = ingreso neto − utilidad − pago vendedor. El total se distribuye entre los dos saldos y se redondea a céntimos, incluso si es negativo.</p>`;
 const footer=`<div class="modal-footer">${button('close-modal','Cancelar','btn-outline') }<button class="btn btn-gold" type="submit">${icon('check',16)} ${s?'Guardar cambios':'Registrar venta'}</button></div>`;
 document.getElementById('modal-root').innerHTML=modalShell(s?'Editar venta':'Nueva venta',s?'Actualiza los datos y vuelve a calcular las comisiones.':'Completa los datos de la operación.',`<form id="sale-form" data-id="${h(id||'')}"><div class="modal-body">${inputs}</div>${footer}</form>`);
 updateSalePreview();
}
function updateSalePreview() {
 const f=document.getElementById('sale-form');if(!f)return;
 const v=Object.fromEntries(new FormData(f));const s={net_income:num(v.net_income),profit:num(v.profit),seller_payment:num(v.seller_payment),participation:v.participation};const r=split(s);
 document.getElementById('p-liquid').textContent=money(r.liquid);
 document.getElementById('p-m').textContent=money(r.micaela);
 document.getElementById('p-a').textContent=money(r.angel);
 document.getElementById('p-label-m').textContent=`Micaela · ${r.pm} %`;
 document.getElementById('p-label-a').textContent=`Ángel · ${r.pa} %`;
 document.getElementById('p-liquid').style.color=r.liquid<0?'#f3a7a7':'#fff';
 const warning=document.getElementById('sale-negative-notice');if(warning)warning.hidden=r.liquid>=0;
}
function movementModal(id,preferredKind) {
 const m=id?state.movements.find(x=>x.id===id):null;if(id&&!m){toast('No se encontró el movimiento','error');return;}if(m?.is_deleted){toast('Este movimiento está eliminado. Restáuralo antes de editarlo.','error');return;}
 const z=m||{move_date:today(),concept:'',kind:preferredKind||'egreso',amount:'',payer:'imvicto',account:'tarjeta'};
 const inputs=`<div class="form-grid">${inputField('move_date','Fecha',z.move_date,'date')}${selectField('kind','Tipo de movimiento',[['egreso','Egreso · resta saldo'],['ingreso','Ingreso · suma saldo']],z.kind)}<div class="field full">${inputField('concept','Concepto',z.concept,'text','maxlength="220" placeholder="Ej. Polos Piqué / abono a tarjeta"').replace('<div class="field">','').replace('</div>','')}</div>${inputField('amount','Monto (S/)',m?plain(z.amount):'','text','inputmode="decimal" placeholder="0,00"')}${selectField('payer','Pagado / recibido por',PAYERS,z.payer)}<div class="field full">${selectField('account','Saldo afectado',ACCOUNTS,z.account).replace('<div class="field">','').replace('</div>','')}<span class="hint">Solo el saldo que selecciones aumentará o disminuirá; «ambos» divide el importe en dos.</span></div></div>
 <div class="calc-preview"><div class="preview-header">${icon('wallet',16)} IMPACTO EN LOS SALDOS</div><div class="preview-grid"><div class="preview-item"><span>Tarjeta IMVICTO</span><b id="mv-card">${money(0)}</b></div><div class="preview-item"><span>Micaela</span><b id="mv-m">${money(0)}</b></div><div class="preview-item"><span>Ángel</span><b id="mv-a">${money(0)}</b></div></div></div>`;
 const footer=`${m?.source==='google_form'?'<p class="form-edit-note">La corrección se guardará en IMVICTO y no será reemplazada por la sincronización. La respuesta original en Google Sheets no cambia.</p>':''}<div class="modal-footer">${button('close-modal','Cancelar','btn-outline')}<button class="btn btn-gold" type="submit">${icon('check',16)} ${m?'Guardar cambios':'Registrar movimiento'}</button></div>`;
 document.getElementById('modal-root').innerHTML=modalShell(m?'Editar movimiento':'Nuevo movimiento','Registra un ingreso o egreso e indica qué saldo afectará.',`<form id="movement-form" data-id="${h(id||'')}"><div class="modal-body">${inputs}</div>${footer}</form>`);
 updateMovementPreview();
}
function updateMovementPreview() {
 const f=document.getElementById('movement-form');if(!f)return;
 const m=Object.fromEntries(new FormData(f));m.amount=num(m.amount);
 for(const [id,key] of [['mv-card','tarjeta'],['mv-m','micaela'],['mv-a','angel']]){const v=movementContrib(m,key),el=document.getElementById(id);el.textContent=(v>0?'+ ':'')+money(v);el.style.color=v<0?'#ffc0ae':v>0?'#dfc27a':'#c7d4e6';}
}
// ===== IMVICTO V4: calendario de gastos recurrentes =====
function fixedById(id) {const x=state.fixedExpenses.find(f=>f.id===id);if(!x)throw Error('El gasto fijo ya no existe.');return x;}
function occurrenceById(id) {const x=calOccurrences().find(f=>f.id===id);if(!x)throw Error('El gasto no está programado para el mes seleccionado.');return x;}
function readMonth(value,label) {const s=String(value||'').trim();if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(s))throw Error(label+': selecciona un mes válido.');return s+'-01';}
function fixedModal(id,prefill='') {
 const x=id?fixedById(id):null;
 const z=x||{concept:prefill,amount:'',currency:'PEN',exchange_rate:1,due_day:1,account:'tarjeta',payer:'imvicto',start_month:state.calendarMonth+'-01',end_month:null,notes:'',active:true};
 const currency=currencyCode(z.currency);
 const inputs=`<div class="form-grid">${inputField('concept','Concepto',z.concept,'text','maxlength="160" placeholder="Ej. Pago Oficina"')}${selectField('currency','Moneda del gasto',[['PEN','Soles (PEN)'],['USD','Dólares (USD)']],currency)}${inputField('amount','Monto habitual en moneda original',x?plain(z.amount):'','text','inputmode="decimal" placeholder="Ej. 20.00"')}${inputField('exchange_rate','Tipo de cambio (S/ por USD)',showRate(z.exchange_rate??1),'text','inputmode="decimal" placeholder="Ej. 3.7500"')}${inputField('due_day','Día de vencimiento (1–31)',z.due_day,'number','min="1" max="31"')}${inputField('start_month','Primer mes',String(z.start_month).slice(0,7),'month')}${selectField('account','Saldo a descontar cuando se pague',ACCOUNTS,z.account)}${selectField('payer','Pagado por',PAYERS,z.payer)}<div class="field"> <label for="f-end_month">Último mes (opcional)</label><input id="f-end_month" name="end_month" type="month" value="${h(String(z.end_month||'').slice(0,7))}"/></div><div class="field"><label for="f-notes">Notas (opcional)</label><input id="f-notes" name="notes" maxlength="300" value="${h(z.notes||'')}" placeholder="Alquiler, licencia, recibo…"/></div></div>
 <p id="fixed-fx-preview" class="fx-preview" role="status"></p><p class="form-footnote">En USD el monto original se convierte con un tipo de cambio editable; los saldos de IMVICTO siempre están en soles. Puedes ajustar la cuota y el TC de cada mes por separado. Programar no descuenta dinero.</p>`;
 document.getElementById('modal-root').innerHTML=modalShell(x?'Editar gasto mensual':'Nuevo gasto mensual','Programación recurrente, sin realizar cargos automáticamente.',`<form id="fixed-form" data-id="${h(id||'')}"><div class="modal-body">${inputs}</div><div class="modal-footer">${button('close-modal','Cancelar','btn-outline')}<button type="submit" class="btn btn-gold">${icon('check',15)} Guardar gasto fijo</button></div></form>`);
 updateFixedFxPreview();
}
function fixedDetailModal(id) {
 const o=occurrenceById(id),title=expenseNameStatus(o);
 const body=`<div class="fixed-detail"><div class="detail-amount">${money(o.expected_amount)}</div><p><b>Valor previsto:</b> ${h(originalAndSoles(o))}</p><p><b>Vencimiento:</b> ${dateShow(o.due_date)} · <b>Estado:</b> ${title}</p><p><b>Saldo:</b> ${h(accountLabel(o.account))}</p>${o.actual?`<p>Pago registrado: ${dateShow(o.actual.move_date)} por ${money(o.actual.amount)}.</p>`:'<p>Importe previsto; aún no se ha registrado ningún egreso asociado.</p>'}</div><div class="modal-footer">${button('close-modal','Cerrar','btn-outline')}${button('adjust-fixed','Ajustar monto','btn-outline','coins',`data-id="${h(id)}"`)}${o.actual?'':button('pay-fixed','Registrar pago','btn-gold','check',`data-id="${h(id)}"`)}</div>`;
 document.getElementById('modal-root').innerHTML=modalShell(o.concept,'Detalle del gasto programado',`<div class="modal-body">${body.split('<div class="modal-footer">')[0]}</div><div class="modal-footer">${button('close-modal','Cerrar','btn-outline')}${button('adjust-fixed','Ajustar monto','btn-outline','coins',`data-id="${h(id)}"`)}${o.actual?'':button('pay-fixed','Registrar pago','btn-gold','check',`data-id="${h(id)}"`)}</div>`,false);
}
function fixedAdjustmentModal(id) {
 const x=occurrenceById(id);
 const body=`<div class="form-grid">${inputField('amount','Monto de '+fullMonthTitle(x.month)+' ('+x.currency+')',plain(x.original_amount),'text','inputmode="decimal"')}${x.currency==='USD'?inputField('exchange_rate','Tipo de cambio del mes (S/ por USD)',showRate(x.exchange_rate),'text','inputmode="decimal"'):'<input type="hidden" name="exchange_rate" value="1">'}<div class="field"><label>Cuota habitual</label><input readonly value="${h(originalMoney(x.amount,x.currency))}"/></div></div><p id="adjust-fx-preview" class="fx-preview" role="status"></p><p class="form-footnote">El cambio sólo se aplica al mes seleccionado, no a los demás ni a movimientos ya pagados.</p>`;
 document.getElementById('modal-root').innerHTML=modalShell('Ajustar cuota del mes',x.concept,`<form id="fixed-adjust-form" data-id="${h(id)}" data-month="${state.calendarMonth}"><div class="modal-body">${body}</div><div class="modal-footer">${button('close-modal','Cancelar','btn-outline')}<button class="btn btn-gold" type="submit">Guardar importe y TC</button></div></form>`,false);
 updateFixedFxPreview();
}
function fixedPayModal(id) {
 const o=occurrenceById(id);if(o.actual){toast('Ya existe un egreso asociado a este vencimiento.','error');return;}
 const date=state.calendarMonth===today().slice(0,7)?today():o.due_date;
 const inputs=`<div class="form-grid">${inputField('move_date','Fecha real del pago',date,'date')}${inputField('amount','Importe realmente pagado (S/)',plain(o.expected_amount),'text','inputmode="decimal"')}${selectField('account','Saldo a afectar',ACCOUNTS,o.account)}${selectField('payer','Pagado por',PAYERS,o.payer)}</div><p class="fx-preview">Previsión: ${h(originalAndSoles(o))}. El egreso real se registra siempre en SOLES; puedes ajustar el importe efectivamente cobrado.</p><p class="form-footnote">Verifica que no exista ya el egreso en Google Forms para evitar descontarlo dos veces; si ya existe, usa «Vincular gasto».</p>`;
 document.getElementById('modal-root').innerHTML=modalShell('Registrar pago','Pago de '+o.concept+' · '+fullMonthTitle(o.month),`<form id="fixed-pay-form" data-id="${h(id)}" data-month="${o.month}"><div class="modal-body">${inputs}</div><div class="modal-footer">${button('close-modal','Cancelar','btn-outline')}<button type="submit" class="btn btn-gold">${icon('check',16)} Registrar egreso</button></div></form>`,false);
}
function fixedLinkModal(id) {
 const o=occurrenceById(id);if(o.actual){toast('Este mes ya tiene un pago asociado.','error');return;}
 const available=activeMovements().filter(m=>m.kind==='egreso'&&!m.recurring_id&&m.move_date.slice(0,7)===o.month).sort((a,b)=>b.move_date.localeCompare(a.move_date));
 const options=available.map(m=>`<option value="${h(m.id)}">${h(dateShow(m.move_date)+' · '+m.concept+' · '+money(m.amount)+(m.source==='google_form'?' · Google Forms':''))}</option>`).join('');
 document.getElementById('modal-root').innerHTML=modalShell('Vincular pago existente',o.concept+' · '+fullMonthTitle(o.month),`<form id="fixed-link-form" data-id="${h(id)}" data-month="${o.month}"><div class="modal-body">${available.length?`<div class="field"><label for="link-movement">Selecciona un egreso ya registrado</label><select id="link-movement" name="movement_id" required>${options}</select></div><p class="form-footnote">No se crea un segundo egreso: sólo se vincula el registro actual con el calendario. Puedes seleccionar egresos importados desde Google Forms.</p>`:'<p>No hay egresos sin asociar para este mes. Registra el pago directamente o sincroniza primero Google Forms.</p>'}</div><div class="modal-footer">${button('close-modal','Cancelar','btn-outline')}${available.length?'<button type="submit" class="btn btn-gold">Vincular sin duplicar</button>':''}</div></form>`,false);
}
function fixedDeleteModal(id) {
 const x=fixedById(id);
 document.getElementById('modal-root').innerHTML=modalShell('Eliminar gasto recurrente',x.concept,`<div class="modal-body"><p>Se borrará la programación y sus importes especiales de todos los meses. <strong>Los egresos reales ya registrados permanecerán en el libro</strong> y seguirán afectando los saldos.</p></div><div class="modal-footer">${button('close-modal','Cancelar','btn-outline')}<button class="btn btn-danger" data-action="confirm-delete-fixed" data-id="${h(id)}">Eliminar programación</button></div>`,false);
}
async function persistFixed(table,obj,{id=null,method='save',month=null}={}) {
 if(state.mode==='local'){
  if(table==='fixed_expenses'){
   if(method==='delete'){state.fixedExpenses=state.fixedExpenses.filter(x=>x.id!==id);state.fixedOverrides=state.fixedOverrides.filter(x=>x.fixed_expense_id!==id);state.movements.forEach(x=>{if(x.recurring_id===id){x.recurring_id=null;x.recurring_month=null;}});}
   else if(id){const x=state.fixedExpenses.find(x=>x.id===id);if(!x)throw Error('Gasto no encontrado');Object.assign(x,obj,{updated_at:new Date().toISOString()});}
   else state.fixedExpenses.push({...obj,id:uuid(),active:true,created_at:new Date().toISOString()});
  }else if(table==='fixed_expense_overrides'){
   const prev=state.fixedOverrides.find(x=>x.fixed_expense_id===id&&x.month===month);
   if(method==='delete'){state.fixedOverrides=state.fixedOverrides.filter(x=>x!==prev);}
   else if(prev){Object.assign(prev,obj);}else state.fixedOverrides.push({...obj,id:uuid(),fixed_expense_id:id,month});
  }
  persistLocal();return;
 }
 const t=state.supabase.from(table);let res;
 if(table==='fixed_expense_overrides'){
  if(method==='delete')res=await t.delete().eq('fixed_expense_id',id).eq('month',month);
  else res=await t.upsert({...obj,fixed_expense_id:id,month},{onConflict:'fixed_expense_id,month'});
 }else if(method==='delete')res=await t.delete().eq('id',id);
 else if(id)res=await t.update({...obj,updated_at:new Date().toISOString()}).eq('id',id);
 else res=await t.insert(obj);
 if(res.error)throw res.error;
 await loadCloud();
}
async function submitFixedForm(f) {
 const fd=new FormData(f),start=readMonth(fd.get('start_month'),'Mes inicial'),end=fd.get('end_month')?readMonth(fd.get('end_month'),'Mes final'):null;
 const currency=String(fd.get('currency')||'PEN');if(!['PEN','USD'].includes(currency))throw Error('Moneda inválida.');
 const obj={concept:String(fd.get('concept')||'').trim().slice(0,160),amount:validateAmount(fd.get('amount'),'Monto mensual',true),currency,exchange_rate:currency==='USD'?parseRate(fd.get('exchange_rate')):1,due_day:Number(fd.get('due_day')),account:String(fd.get('account')),payer:String(fd.get('payer')),start_month:start,end_month:end,notes:String(fd.get('notes')||'').trim().slice(0,300)};
 if(!obj.concept)throw Error('Escribe el concepto del gasto.');if(!Number.isInteger(obj.due_day)||obj.due_day<1||obj.due_day>31)throw Error('El día debe estar entre 1 y 31.');
 if(end&&end<start)throw Error('El último mes no puede ser anterior al primero.');if(!ACCOUNTS.some(x=>x[0]===obj.account)||!PAYERS.some(x=>x[0]===obj.payer))throw Error('Cuenta o pagador inválido.');
 await persistFixed('fixed_expenses',obj,{id:f.dataset.id||null});
}
async function submitFixedAdjustment(f) {
 const id=f.dataset.id,month=readMonth(f.dataset.month,'Mes'),x=fixedById(id);
 const fd=new FormData(f),amount=validateAmount(fd.get('amount'),'Importe original especial',true);
 const rate=currencyCode(x.currency)==='USD'?parseRate(fd.get('exchange_rate')):1;
 const baseRate=currencyCode(x.currency)==='USD'?Number(x.exchange_rate??1):1;
 await persistFixed('fixed_expense_overrides',{amount,exchange_rate:rate},{id,month,method:Math.abs(amount-Number(x.amount))<.001&&Math.abs(rate-baseRate)<.00001?'delete':'save'});
}
async function submitFixedPayment(f) {
 const o=occurrenceById(f.dataset.id),fd=new FormData(f);
 if(o.actual)throw Error('Ya hay un pago asociado a este vencimiento.');
 const obj={move_date:String(fd.get('move_date')),concept:o.concept,kind:'egreso',amount:validateAmount(fd.get('amount'),'Monto pagado',true),payer:String(fd.get('payer')),account:String(fd.get('account')),recurring_id:o.id,recurring_month:o.month+'-01'};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(obj.move_date))throw Error('Fecha de pago inválida.');
 if(!ACCOUNTS.some(x=>x[0]===obj.account)||!PAYERS.some(x=>x[0]===obj.payer))throw Error('Saldo o pagador inválido.');
 await saveRecord('movements',obj,null);
}
async function submitFixedLink(f) {
 const o=occurrenceById(f.dataset.id),id=String(new FormData(f).get('movement_id')||'');
 const mov=activeMovements().find(m=>m.id===id&&m.kind==='egreso'&&!m.recurring_id&&m.move_date.slice(0,7)===o.month);
 if(!mov||o.actual)throw Error('El movimiento ya fue vinculado o no es válido.');
 const obj={recurring_id:o.id,recurring_month:o.month+'-01',updated_at:new Date().toISOString()};
 if(state.mode==='local'){Object.assign(mov,obj);persistLocal();return;}
 const {data,error}=await state.supabase.from('movements').update(obj).eq('id',id).is('recurring_id',null).select('id').maybeSingle();
 if(error)throw error;if(!data)throw Error('Otro usuario ya vinculó este movimiento.');await loadCloud();
}
async function unlinkFixed(movementId) {
 const mov=activeMovements().find(m=>m.id===movementId&&m.recurring_id);
 if(!mov)throw Error('No se encontró el pago vinculado.');
 if(state.mode==='local'){mov.recurring_id=null;mov.recurring_month=null;persistLocal();return;}
 const {error}=await state.supabase.from('movements').update({recurring_id:null,recurring_month:null}).eq('id',movementId);
 if(error)throw error;await loadCloud();
}
async function toggleFixed(id) {const f=fixedById(id);await persistFixed('fixed_expenses',{active:!f.active},{id});}
async function deleteFixed(id) {await persistFixed('fixed_expenses',{}, {id,method:'delete'});}
function exportFixedMonth(month) {
 const rows=calOccurrences(month);
 const cols=['VENCIMIENTO','CONCEPTO','MONEDA ORIGINAL','MONTO ORIGINAL','TC S/ POR USD','MONTO PROGRAMADO EN SOLES','ESTADO','MONTO REAL S/','FECHA REAL','SALDO AFECTADO','NOTAS'];
 const lines=rows.map(x=>[dateShow(x.due_date),x.concept,x.currency,plain(x.original_amount),x.currency==='USD'?showRate(x.exchange_rate):'',plain(x.expected_amount),x.actual?'PAGADO':'PENDIENTE',x.actual?plain(x.actual.amount):'',x.actual?dateShow(x.actual.move_date):'',accountLabel(x.account),x.notes].map(csvCell).join(';'));
 downloadText(`IMVICTO_gastos_fijos_${month}.csv`,'\uFEFFsep=;\r\n'+cols.map(csvCell).join(';')+'\r\n'+lines.join('\r\n'),'text/csv;charset=utf-8');toast('Previsión del mes exportada.');
}
function exportMonth(month) {
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Mes no válido');
 const sales=sortedSales().filter(x=>x.sale_date.slice(0,7)===month),movs=sortedMovs().filter(x=>x.move_date.slice(0,7)===month),occ=calOccurrences(month);
 const incomeMov=c2(movs.filter(x=>x.kind==='ingreso').reduce((s,x)=>s+num(x.amount),0)),expenseMov=c2(movs.filter(x=>x.kind==='egreso').reduce((s,x)=>s+num(x.amount),0));
 const summary=[['IMVICTO CORP',fullMonthTitle(month)],['Ventas',sales.length],['Ingreso neto de ventas',plain(sales.reduce((s,x)=>s+num(x.net_income),0))],['Comisión Micaela',plain(sales.reduce((s,x)=>s+split(x).micaela,0))],['Comisión Ángel',plain(sales.reduce((s,x)=>s+split(x).angel,0))],['Ingresos en movimientos',plain(incomeMov)],['Egresos en movimientos',plain(expenseMov)],['Neto movimientos',plain(incomeMov-expenseMov)],['Gastos fijos previstos',plain(occ.reduce((s,x)=>s+x.expected_amount,0))],['Gastos fijos pendientes',plain(occ.filter(x=>!x.actual).reduce((s,x)=>s+x.expected_amount,0))]].map(r=>r.map(csvCell).join(';'));
 const saleColumns=['FECHA','CLIENTE','VENTA','TIPO','INGRESO NETO','UTILIDAD','PAGO VENDEDOR','INGRESO LIQUIDO','MICAELA','ANGEL'];
 const saleLines=sales.map(s=>{const r=split(s);return [dateShow(s.sale_date),s.client,s.product,s.sale_type,plain(s.net_income),plain(s.profit),plain(s.seller_payment),plain(r.liquid),plain(r.micaela),plain(r.angel)].map(csvCell).join(';');});
 const movColumns=['FECHA','CONCEPTO','TIPO','IMPORTE','PAGADO POR','SALDO AFECTADO','FUENTE'];
 const movLines=movs.map(m=>[dateShow(m.move_date),m.concept,m.kind,plain(m.amount),payerLabel(m.payer),accountLabel(m.account),m.source==='google_form'?'Google Forms':'Manual'].map(csvCell).join(';'));
 const csv=['sep=;',...summary,'',csvCell('VENTAS DEL MES'),saleColumns.map(csvCell).join(';'),...saleLines,'',csvCell('INGRESOS Y EGRESOS DEL MES'),movColumns.map(csvCell).join(';'),...movLines].join('\r\n');
 downloadText(`IMVICTO_cierre_mensual_${month}.csv`,'\uFEFF'+csv,'text/csv;charset=utf-8');toast('Cierre mensual exportado: '+fullMonthTitle(month));
}

function confirmModal(kind,id) {
 const sale=kind==='sale';const reset=kind==='reset';
 const entry=reset?null:sale?state.sales.find(s=>s.id===id):state.movements.find(m=>m.id===id);
 const desc=reset?'Esto eliminará todas las ventas, movimientos y saldos iniciales guardados en este navegador. No se puede deshacer.':sale?`Eliminar la venta de «${h(entry?.client)}» quitará sus comisiones de los saldos de Micaela y Ángel, y su aporte de la tarjeta.`:entry?.source==='google_form'?`Eliminar «${h(entry.concept)}» revertirá su efecto en los saldos. No volverá a aparecer en próximas sincronizaciones y podrás restaurarlo desde «Eliminados». La respuesta en Google Sheets seguirá intacta.`:`Eliminar «${h(entry?.concept)}» revertirá su efecto sobre los saldos.`;
 document.getElementById('modal-root').innerHTML=modalShell(reset?'Borrar datos locales':'Confirmar eliminación','Esta acción modifica los saldos de forma inmediata.',`<div class="modal-body"><p style="margin:0;color:#56677d;line-height:1.7">${desc}</p><div class="del-confirm">${icon('alert',16)} Revisa el registro antes de confirmar.</div></div><div class="modal-footer">${button('close-modal','Cancelar','btn-outline')}<button type="button" class="btn btn-danger" data-action="confirm-delete" data-kind="${kind}" data-id="${h(id||'')}">${icon('trash',16)} Eliminar</button></div>`,false);
}
function closeModal() {document.getElementById('modal-root').innerHTML='';}
function validateAmount(value,label,positive=false) {const n=num(value);if(!Number.isFinite(n)||n<0||(positive&&n<=0))throw new Error(`${label}: introduce un número ${positive?'mayor que cero':'válido, igual o mayor a cero'}.`);if(n>9999999999)throw new Error(`${label}: importe demasiado grande.`);return c2(n);}
function saleFromForm(f) {
 const fd=new FormData(f);const obj={sale_date:String(fd.get('sale_date')||''),client:String(fd.get('client')||'').trim(),product:String(fd.get('product')||'').trim(),sale_type:String(fd.get('sale_type')||''),net_income:validateAmount(fd.get('net_income'),'Ingreso neto'),profit:validateAmount(fd.get('profit'),'Utilidad'),seller_payment:validateAmount(fd.get('seller_payment'),'Pago vendedor'),participation:String(fd.get('participation')||'')};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(obj.sale_date))throw new Error('Indica una fecha válida.');if(!obj.client||!obj.product)throw new Error('Completa cliente y venta.');if(!TYPES.includes(obj.sale_type))throw new Error('Selecciona una modalidad válida.');if(!PARTICIPANTS.some(a=>a[0]===obj.participation))throw new Error('Selecciona la participación.');return obj;
}
function movementFromForm(f) {
 const fd=new FormData(f);const obj={move_date:String(fd.get('move_date')||''),concept:String(fd.get('concept')||'').trim(),kind:String(fd.get('kind')||''),amount:validateAmount(fd.get('amount'),'Monto',true),payer:String(fd.get('payer')||''),account:String(fd.get('account')||'')};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(obj.move_date))throw new Error('Indica una fecha válida.');if(!obj.concept)throw new Error('Escribe un concepto.');if(!['ingreso','egreso'].includes(obj.kind))throw new Error('Selecciona ingreso o egreso.');if(!PAYERS.some(x=>x[0]===obj.payer))throw new Error('Selecciona quién pagó o recibió.');if(!ACCOUNTS.some(x=>x[0]===obj.account))throw new Error('Selecciona un saldo afectado.');return obj;
}
async function saveRecord(table,obj,id) {
 if(table==='movements'&&id&&state.movements.some(x=>x.id===id&&x.source==='google_form'))obj={...obj,form_locked:true};
 if(state.mode==='local'){
  const list=table==='sales'?state.sales:state.movements;
  if(id){const idx=list.findIndex(x=>x.id===id);if(idx<0)throw Error('El registro ya no existe.');list[idx]={...list[idx],...obj,updated_at:new Date().toISOString()};}
  else list.push({...obj,id:uuid(),created_at:new Date().toISOString()});
  persistLocal();return;
 }
 if(id){const {error}=await state.supabase.from(table).update({...obj,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;}
 else{const {error}=await state.supabase.from(table).insert(obj);if(error)throw error;}
 await loadCloud();
}
async function removeRecord(table,id) {
 const record=table==='movements'?state.movements.find(x=>x.id===id):null;
 // Soft delete: conserva la llave externa para que Google Forms no pueda reimportar el movimiento.
 if(record?.source==='google_form'){
  const update={is_deleted:true,form_locked:true,updated_at:new Date().toISOString()};
  if(state.mode==='local'){
   Object.assign(record,update);persistLocal();return;
  }
  const {data,error}=await state.supabase.from('movements').update(update).eq('id',id).select('id').maybeSingle();
  if(error)throw error;if(!data)throw Error('El movimiento ya no existe o no se pudo modificar.');
  await loadCloud();return;
 }
 if(state.mode==='local'){if(table==='sales')state.sales=state.sales.filter(x=>x.id!==id);else state.movements=state.movements.filter(x=>x.id!==id);persistLocal();return;}
 const {error}=await state.supabase.from(table).delete().eq('id',id);if(error)throw error;await loadCloud();
}
async function restoreFormMovement(id) {
 const record=state.movements.find(m=>m.id===id&&m.source==='google_form'&&m.is_deleted);
 if(!record)throw Error('No se encontró el movimiento eliminado.');
 const update={is_deleted:false,form_locked:true,updated_at:new Date().toISOString()};
 if(state.mode==='local'){Object.assign(record,update);persistLocal();return;}
 const {data,error}=await state.supabase.from('movements').update(update).eq('id',id).select('id').maybeSingle();
 if(error)throw error;if(!data)throw Error('No se pudo restaurar el movimiento.');await loadCloud();
}
async function saveSettings(obj) {
 if(state.mode==='local'){state.settings={...DEFAULT_SETTINGS,...obj};persistLocal();return;}
 const {error}=await state.supabase.from('settings').upsert({...obj,id:1},{onConflict:'id'});if(error)throw error;await loadCloud();
}
async function handleSubmit(e) {
 const f=e.target;if(!['sale-form','movement-form','settings-form','login-form','fixed-form','fixed-adjust-form','fixed-pay-form','fixed-link-form'].includes(f.id))return;e.preventDefault();
 if(state.busy)return;state.busy=true;const submit=f.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
 try{
  if(f.id==='fixed-form'){await submitFixedForm(f);closeModal();render();toast('Gasto fijo guardado. La previsión no descuenta saldo.');}
  if(f.id==='fixed-adjust-form'){await submitFixedAdjustment(f);closeModal();render();toast('Importe de este mes ajustado.');}
  if(f.id==='fixed-pay-form'){await submitFixedPayment(f);closeModal();render();toast('Pago registrado como egreso y saldo actualizado.');}
  if(f.id==='fixed-link-form'){await submitFixedLink(f);closeModal();render();toast('Egreso existente asociado sin duplicar el gasto.');}
  if(f.id==='sale-form'){const x=saleFromForm(f);await saveRecord('sales',x,f.dataset.id||null);closeModal();render();toast(f.dataset.id?'Venta actualizada.':'Venta registrada y comisiones calculadas.');}
  if(f.id==='movement-form'){const x=movementFromForm(f);await saveRecord('movements',x,f.dataset.id||null);closeModal();render();toast(f.dataset.id?'Movimiento actualizado.':'Movimiento registrado y saldo actualizado.');}
  if(f.id==='settings-form'){
    const fd=new FormData(f),x={card_initial:0,micaela_initial:0,angel_initial:0,card_sales_basis:String(fd.get('card_sales_basis')||'')};
    // Saldos iniciales pueden ser negativos para reflejar ajustes históricos.
    for(const k of ['card_initial','micaela_initial','angel_initial']){let value=num(fd.get(k));if(!Number.isFinite(value)||Math.abs(value)>9999999999)throw new Error('Comprueba los saldos iniciales.');x[k]=c2(value);}
    if(!['neto','liquido','ninguno'].includes(x.card_sales_basis))throw Error('Selecciona una configuración válida.');await saveSettings(x);render();toast('Configuración y saldos recalculados.');
  }
  if(f.id==='login-form'){
   state.authError='';if(!state.supabase)throw Error('No se ha podido conectar con Supabase. Revisa config.js y la conexión.');
   const fd=new FormData(f),email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');const {data,error}=await state.supabase.auth.signInWithPassword({email,password});if(error)throw error;
   state.user=data.user;await verifyAndLoad();render();startFormSync();toast('Sesión iniciada.');
  }
 }catch(err){console.error(err);if(f.id==='login-form'){state.authError=err.message||'No se pudo iniciar sesión.';render();}else toast(err.message||'No se pudo guardar la información.','error');}
 finally{state.busy=false;if(submit?.isConnected)submit.disabled=false;}
}
function csvCell(s){let v=String(s??'');if(/^[=+@-]/.test(v)&&isNaN(Number(v)))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
function downloadText(filename,content,mime='text/plain;charset=utf-8') {const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function exportCSV(which) {
 let header,lines;if(which==='sales'){
  header=['FECHA','CLIENTE','VENTA','TIPO','INGRESO NETO','UTILIDAD','PAGO VENDEDOR','INGRESO LIQUIDO','COMISION MICAELA','COMISION ANGEL','PARTICIPARON'];
  lines=sortedSales().map(s=>{const v=split(s);return [dateShow(s.sale_date),s.client,s.product,s.sale_type,plain(s.net_income),plain(s.profit),plain(s.seller_payment),plain(v.liquid),plain(v.micaela),plain(v.angel),participationLabel(s.participation)].map(csvCell).join(';');});
 }else{
  header=['FECHA','CONCEPTO','EGRESOS','INGRESOS','PAGADO POR','SALDO AFECTADO'];
  lines=sortedMovs().map(m=>[dateShow(m.move_date),m.concept,m.kind==='egreso'?plain(m.amount):'',m.kind==='ingreso'?plain(m.amount):'',payerLabel(m.payer),accountLabel(m.account)].map(csvCell).join(';'));
 }
 downloadText(`IMVICTO_${which==='sales'?'ventas':'movimientos'}_${today()}.csv`,'\uFEFFsep=;\r\n'+header.map(csvCell).join(';')+'\r\n'+lines.join('\r\n'),'text/csv;charset=utf-8');
 toast('Archivo CSV descargado.');
}
function demoData() {
 const entries=[
  {sale_date:'2026-10-11',client:'GUILLERMO R.',product:'SET DE 10',sale_type:'CONTADO',net_income:6741.53,profit:991.53,seller_payment:828.39,participation:'angel'},
  {sale_date:'2026-10-15',client:'FEDERICO A.',product:'SET BÁSICO C.',sale_type:'FINANCIADO',net_income:1318.27,profit:0,seller_payment:440.25,participation:'micaela'},
  {sale_date:'2026-10-18',client:'ZOILA M.',product:'OLLA A PRESIÓN 6L',sale_type:'CONTADO',net_income:2189.82,profit:250,seller_payment:576.27,participation:'ambos'},
  {sale_date:'2026-10-20',client:'LILIANA M.',product:'SET 5C PERSO.',sale_type:'FINANCIADO',net_income:5240.52,profit:250,seller_payment:1327.58,participation:'ninguno'},
  {sale_date:'2026-10-23',client:'BETTY C.',product:'OLLA 6L + PERFECT POP',sale_type:'FINANCIADO',net_income:1560.34,profit:150,seller_payment:235.49,participation:'micaela'}
 ];const now=new Date().toISOString();state.sales.push(...entries.map(x=>({...x,id:uuid(),created_at:now})));persistLocal();render();toast('Cinco ventas de ejemplo agregadas.');
}
function exportBackup() {const contents=JSON.stringify({version:1,exported_at:new Date().toISOString(),sales:state.sales,movements:state.movements,settings:state.settings,fixedExpenses:state.fixedExpenses,fixedOverrides:state.fixedOverrides},null,2);downloadText(`IMVICTO_respaldo_${today()}.json`,contents,'application/json');toast('Respaldo completo descargado.');}
async function migrateLocalBackupToCloud(data) {
 if(state.mode!=='cloud'||!state.user)throw Error('Debes iniciar sesión en Supabase.');
 if(state.sales.length||state.fixedExpenses.length||state.movements.some(x=>x.source!=='google_form'))throw Error('Por seguridad, la migración inicial sólo se permite si el proyecto compartido no tiene ventas, gastos recurrentes ni movimientos manuales. Los de Google Forms se sincronizan por separado.');
 const uuidFormat=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const backupSales=data.sales||[],backupFixed=data.fixedExpenses||[],backupOverrides=data.fixedOverrides||[];
 const manual=(data.movements||[]).filter(x=>x.source!=='google_form');
 const all=[...backupSales,...backupFixed,...backupOverrides,...manual];
 if(all.length>3000)throw Error('Respaldo demasiado grande para la migración inicial (máximo 3000 registros).');
 if(all.some(x=>!uuidFormat.test(String(x.id||''))))throw Error('El respaldo tiene IDs no compatibles con Supabase. Solicita ayuda para convertir este respaldo.');
 for(const x of backupSales)saleFromObject(x);
 for(const x of manual)movementFromObject(x);
 for(const x of backupFixed)if(!x.concept||!(Number(x.amount)>0))throw Error('Gasto fijo no válido en el respaldo.');
 const batch=async(table,list)=>{for(let i=0;i<list.length;i+=100){const {error}=await state.supabase.from(table).insert(list.slice(i,i+100));if(error)throw Error(`Error al cargar ${table}: ${error.message}`);}};
 await batch('fixed_expenses',backupFixed.map(x=>({id:x.id,concept:x.concept,amount:x.amount,due_day:x.due_day,payer:x.payer,account:x.account,start_month:x.start_month,end_month:x.end_month||null,notes:x.notes||'',active:x.active!==false,currency:currencyCode(x.currency),exchange_rate:currencyCode(x.currency)==='USD'?parseRate(x.exchange_rate??1):1})));
 await batch('fixed_expense_overrides',backupOverrides.map(x=>({id:x.id,fixed_expense_id:x.fixed_expense_id,month:x.month,amount:x.amount,exchange_rate:parseRate(x.exchange_rate??1)})));
 await batch('sales',backupSales.map(x=>({...saleFromObject(x),id:x.id})));
 await batch('movements',manual.map(x=>({...movementFromObject(x),id:x.id,...(x.recurring_id&&x.recurring_month?{recurring_id:x.recurring_id,recurring_month:x.recurring_month}:{})})));
 if(data.settings){const setting={...DEFAULT_SETTINGS,...data.settings};await saveSettings({card_initial:num(setting.card_initial),micaela_initial:num(setting.micaela_initial),angel_initial:num(setting.angel_initial),card_sales_basis:setting.card_sales_basis});}
 await loadCloud();
}
async function importBackup(file) {
 if(!file)return;
 try{
  const data=JSON.parse(await file.text());if(!Array.isArray(data.sales)||!Array.isArray(data.movements)||typeof data.settings!=='object'||!data.settings)throw Error('El archivo no tiene la estructura de respaldo de IMVICTO.');
  if(state.mode==='cloud'){await migrateLocalBackupToCloud(data);render();toast('Ventas y movimientos manuales migrados. Google Forms se sincroniza aparte.');return;}
  const cleanSales=data.sales.map(x=>({...saleFromObject(x),id:String(x.id||uuid()),created_at:String(x.created_at||new Date().toISOString())}));
  const cleanMov=data.movements.map(x=>({...movementFromObject(x),...(typeof x.recurring_id==='string'&&/^[-a-zA-Z0-9]+$/.test(x.recurring_id)?{recurring_id:x.recurring_id,recurring_month:String(x.recurring_month||'')}:{}),source:x.source==='google_form'?'google_form':'manual',form_locked:x.source==='google_form'&&Boolean(x.form_locked||x.is_deleted),is_deleted:x.source==='google_form'&&Boolean(x.is_deleted),...(x.source==='google_form'&&/^google-form:[a-f0-9]{16}:\d+$/.test(String(x.source_key||''))?{source_key:String(x.source_key)}:{}),id:String(x.id||uuid()),created_at:String(x.created_at||new Date().toISOString())}));
  state.sales=cleanSales;state.movements=cleanMov;state.settings={...DEFAULT_SETTINGS,...data.settings};state.fixedExpenses=Array.isArray(data.fixedExpenses)?data.fixedExpenses:[];state.fixedOverrides=Array.isArray(data.fixedOverrides)?data.fixedOverrides:[];persistLocal();render();toast('Respaldo restaurado.');
 }catch(e){toast(e.message||'Archivo no válido','error');}
}
function saleFromObject(o){const f={sale_date:String(o.sale_date),client:String(o.client).slice(0,120),product:String(o.product).slice(0,160),sale_type:o.sale_type,net_income:validateAmount(o.net_income,'Ingreso neto'),profit:validateAmount(o.profit,'Utilidad'),seller_payment:validateAmount(o.seller_payment,'Pago al vendedor'),participation:o.participation};if(!/^\d{4}-\d{2}-\d{2}$/.test(f.sale_date)||!TYPES.includes(f.sale_type)||!PARTICIPANTS.some(p=>p[0]===f.participation))throw Error('Respaldo con ventas inválidas.');return f;}
function movementFromObject(o){const f={move_date:String(o.move_date),concept:String(o.concept).slice(0,220),kind:o.kind,amount:validateAmount(o.amount,'Monto',true),payer:o.payer,account:o.account};if(!/^\d{4}-\d{2}-\d{2}$/.test(f.move_date)||!['ingreso','egreso'].includes(f.kind)||!PAYERS.some(p=>p[0]===f.payer)||!ACCOUNTS.some(p=>p[0]===f.account))throw Error('Respaldo con movimientos inválidos.');return f;}
async function clickAction(e) {
 if(e.target?.dataset?.overlay==='true'){closeModal();return;}
 const btn=e.target.closest?.('[data-action]');if(!btn||state.busy)return;const a=btn.dataset.action,id=btn.dataset.id;
 if(a==='fixed-prev'||a==='fixed-next'||a==='fixed-today'){state.calendarMonth=a==='fixed-today'?today().slice(0,7):nextMonth(state.calendarMonth,a==='fixed-prev'?-1:1);render();return;}
 if(a==='toggle-month'){const month=btn.dataset.month;if(state.openMonths.has(month))state.openMonths.delete(month);else state.openMonths.add(month);render();return;}
 if(a==='export-month'||a==='export-month-current'){exportMonth(a==='export-month-current'?today().slice(0,7):btn.dataset.month);return;}
 if(a==='export-fixed-month'){exportFixedMonth(state.calendarMonth);return;}
 if(a==='add-fixed'||a==='edit-fixed'||a==='preset-fixed'){fixedModal(a==='edit-fixed'?id:null,a==='preset-fixed'?btn.dataset.concept:'');return;}
 if(a==='fixed-detail'){fixedDetailModal(id);return;}
 if(a==='adjust-fixed'){fixedAdjustmentModal(id);return;}
 if(a==='pay-fixed'){fixedPayModal(id);return;}
 if(a==='link-fixed'){fixedLinkModal(id);return;}
 if(a==='toggle-fixed'){await toggleFixed(id);render();return;}
 if(a==='delete-fixed'){fixedDeleteModal(id);return;}
 if(a==='confirm-delete-fixed'){await deleteFixed(id);closeModal();render();toast('Regla de gasto fijo eliminada. Los pagos existentes se conservan.');return;}
 if(a==='unlink-fixed'){await unlinkFixed(id);render();toast('Pago desvinculado; el egreso sigue en el libro.');return;}
 if(a==='menu'){state.sidebarOpen=!state.sidebarOpen;render();return;}
 if(a==='nav'){state.page=btn.dataset.page||'dashboard';state.sidebarOpen=false;render();window.scrollTo({top:0,behavior:'instant'});return;}
 if(a==='open-sale'||a==='edit-sale'){saleModal(a==='edit-sale'?id:null);return;}
 if(['open-movement','edit-movement','open-income','open-expense'].includes(a)){movementModal(a==='edit-movement'?id:null,a==='open-income'?'ingreso':'egreso');return;}
 if(a==='close-modal'){closeModal();return;}
 if(a==='delete-sale'||a==='delete-movement'){confirmModal(a==='delete-sale'?'sale':'movement',id);return;}
 if(a==='reset-local'){confirmModal('reset');return;}
 if(a==='toggle-form-trash'){state.showDeletedForms=!state.showDeletedForms;render();return;}
 if(a==='restore-form-movement'){
   if(state.busy)return;state.busy=true;
   try{await restoreFormMovement(id);render();toast('Movimiento restaurado; saldos recalculados.');}
   catch(err){toast(err.message||'No se pudo restaurar','error');}
   finally{state.busy=false;}
   return;
 }
 if(a==='sync-form'){await syncFormMovements();return;}
 if(a==='upload-forms-csv'){document.getElementById('forms-csv-file')?.click();return;}
 if(a==='export-sales'||a==='export-movements'){exportCSV(a==='export-sales'?'sales':'movements');return;}
 if(a==='export-backup'){exportBackup();return;}
 if(a==='import-backup'){document.getElementById('backup-file')?.click();return;}
 if(a==='seed-demo'){demoData();return;}
 if(a==='page-prev'||a==='page-next'){const key=state.page==='sales'?'salePage':'movPage';state[key]+=a==='page-prev'?-1:1;render();return;}
 if(a==='year-prev'||a==='year-next'){state.reportYear+=a==='year-prev'?-1:1;render();return;}
 if(a==='refresh'){try{await loadCloud();await syncFormMovements({quiet:true});render();toast('Información actualizada.');}catch(err){toast(err.message,'error');}return;}
 if(a==='logout'){await logoutCurrentBrowser();return;}
 if(a==='confirm-delete'){
   state.busy=true;
   try{if(btn.dataset.kind==='reset'){state.sales=[];state.movements=[];state.fixedExpenses=[];state.fixedOverrides=[];state.settings={...DEFAULT_SETTINGS};persistLocal();}
   else await removeRecord(btn.dataset.kind==='sale'?'sales':'movements',id);
   closeModal();render();toast('Registro eliminado y saldos recalculados.');}
   catch(err){toast(err.message||'No se pudo eliminar','error');}
   finally{state.busy=false;}return;
 }
}
function handleInput(e) {
 if(e.target.closest('#fixed-form')||e.target.closest('#fixed-adjust-form')){if(['amount','currency','exchange_rate'].includes(e.target.name)){updateFixedFxPreview();return;}}
 if(e.target.closest('#sale-form')&&['net_income','profit','seller_payment','participation'].includes(e.target.name)){updateSalePreview();return;}
 if(e.target.closest('#movement-form')&&['kind','amount','account'].includes(e.target.name)){updateMovementPreview();return;}
 if(e.target.id==='search-sales'||e.target.id==='search-movements'){
   const sale=e.target.id==='search-sales';state[sale?'filterSales':'filterMov']=e.target.value;state[sale?'salePage':'movPage']=1;
   const pos=e.target.selectionStart;const id=e.target.id;render();const newEl=document.getElementById(id);if(newEl){newEl.focus();if(pos!==null)newEl.setSelectionRange(pos,pos);}
 }
 if(e.target.id==='period-sales'||e.target.id==='period-movements'){
  const sale=e.target.id==='period-sales';state[sale?'periodSales':'periodMov']=e.target.value;state[sale?'salePage':'movPage']=1;render();
 }
}
async function loadCloud() {
 if(!state.supabase)return;
 const [r1,r2,r3,r4,r5]=await Promise.all([state.supabase.from('sales').select('*').order('sale_date',{ascending:false}),state.supabase.from('movements').select('*').order('move_date',{ascending:false}),state.supabase.from('settings').select('*').eq('id',1).maybeSingle(),state.supabase.from('fixed_expenses').select('*').order('due_day'),state.supabase.from('fixed_expense_overrides').select('*')]);
 if(r1.error)throw r1.error;if(r2.error)throw r2.error;if(r3.error)throw r3.error;if(r4.error)throw new Error('Falta la migración V4 de gastos fijos en Supabase: '+r4.error.message);if(r5.error)throw r5.error;
 state.sales=r1.data||[];state.movements=r2.data||[];state.settings={...DEFAULT_SETTINGS,...r3.data};state.fixedExpenses=r4.data||[];state.fixedOverrides=r5.data||[];
}
let channel=null;
function subscribeCloud() {
 if(!state.supabase||!state.user)return;if(channel)state.supabase.removeChannel(channel);
 channel=state.supabase.channel('imvicto-finanzas')
 .on('postgres_changes',{event:'*',schema:'public',table:'sales'},()=>refreshQuietly())
 .on('postgres_changes',{event:'*',schema:'public',table:'movements'},()=>refreshQuietly())
 .on('postgres_changes',{event:'*',schema:'public',table:'settings'},()=>refreshQuietly())
 .on('postgres_changes',{event:'*',schema:'public',table:'fixed_expenses'},()=>refreshQuietly())
 .on('postgres_changes',{event:'*',schema:'public',table:'fixed_expense_overrides'},()=>refreshQuietly())
 .subscribe();
}
let refresher=null;
function refreshQuietly(){clearTimeout(refresher);refresher=setTimeout(async()=>{if(!state.user||state.busy||document.getElementById('modal-root')?.firstElementChild)return;try{await loadCloud();render();}catch(e){console.warn('Error de sincronización',e);}},350);}
async function verifyAndLoad() {
 const {data,error}=await state.supabase.from('allowed_users').select('email').eq('email',state.user.email.toLowerCase()).maybeSingle();if(error)throw error;
 if(!data){await state.supabase.auth.signOut();state.user=null;throw Error('Esta cuenta no está autorizada para acceder a los registros de IMVICTO. Solicita acceso al administrador.');}
 await loadCloud();subscribeCloud();
}
/** Obtención de respuestas: proxy local (Node), función privada en Supabase y/o acceso directo. */
async function fetchFormCSV(){
 const errors=[];
 async function read(url,headers={}){
  const response=await fetch(url,{method:'GET',headers,cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`HTTP ${response.status} desde ${new URL(url,location.href).hostname}`);
  const csv=await response.text();
  if(csv.length>2_000_000)throw new Error('La hoja supera el tamaño máximo admitido (2 MB).');
  if(/^\s*<!?doctype html/i.test(csv)||/^\s*<html/i.test(csv))throw new Error('La URL devolvió HTML y no un CSV.');
  return csv;
 }
 if(state.mode==='cloud'){
  try{
   const {data,error}=await state.supabase.auth.getSession();if(error||!data?.session?.access_token)throw Error('Sesión expirada.');
   return await read(`${CONFIG.SUPABASE_URL.replace(/\/$/,'')}/functions/v1/google-form-csv`,{
    'Authorization':`Bearer ${data.session.access_token}`,'apikey':CONFIG.SUPABASE_ANON_KEY
   });
  }catch(e){errors.push(`Función Supabase: ${e.message}`);}
 } else {
  try{return await read('/api/forms-csv');}catch(e){errors.push(`Servidor local: ${e.message}`);}
 }
 try{return await read(GOOGLE_CSV_URL);}catch(e){errors.push(`CSV público: ${e.message}`);}
 throw new Error(errors.join(' / ')+'. Usa el servidor node server.mjs o importa el CSV manualmente.');
}
async function mergeFormRows(result){
 const incoming=result.records;
 const changed=changedRecords(incoming,state.movements);
 const added=changed.filter(x=>!state.movements.some(m=>m.source_key===x.source_key)).length;
 if(state.mode==='cloud'){
  // RPC atómica: la base de datos no sustituye los asientos editados/eliminados,
  // ni aunque otra sesión sincronice en paralelo con información antigua.
  let updated=0;
  if(changed.length){
   for(let i=0;i<changed.length;i+=100){
    const {data,error}=await state.supabase.rpc('sync_google_forms',{payload:changed.slice(i,i+100)});
    if(error)throw Error(`No se pudo sincronizar con Supabase: ${error.message}. Ejecuta migracion_edicion_google_forms_v3.sql y abre la versión 3 en todos los dispositivos.`);
    updated+=Number(data||0);
   }
   if(updated>0)await loadCloud();
  }
  state.formSyncAdded=updated;
  state.formSyncSkipped=result.skipped.length;
  return {changed:updated,added:Math.min(added,updated),skipped:result.skipped};
 }else if(changed.length){
  const oldByKey=new Map(state.movements.filter(x=>x.source_key).map(x=>[x.source_key,x]));
  for(const m of changed){const old=oldByKey.get(m.source_key);
   if(old)Object.assign(old,m,{updated_at:new Date().toISOString()});
   else state.movements.push({...m,id:uuid(),created_at:new Date().toISOString()});
  }
  persistLocal();
 }
 state.formSyncAdded=changed.length;state.formSyncSkipped=result.skipped.length;
 return {changed:changed.length,added,skipped:result.skipped};
}
async function applyFormsCSV(csv,{quiet=false}={}){
 const result=parseFormMovements(csv);
 const x=await mergeFormRows(result);
 state.formSyncError='';state.formSyncAt=new Date();
 if(!quiet)toast(`Google Forms: ${x.added} nuevos, ${x.changed-x.added} actualizados, ${x.skipped.length} omitidos.`);
 else if(x.changed)toast(`Google Forms: ${x.changed} movimiento(s) nuevos o actualizados.`);
 if(x.skipped.length)console.warn('Filas omitidas en Google Forms',x.skipped);
 return x;
}
async function syncFormMovements({quiet=false}={}){
 if(state.formSyncBusy||state.busy||state.mode==='cloud'&&!state.user)return;
 if(quiet&&(document.getElementById('modal-root')?.firstElementChild||document.getElementById('settings-form')?.contains(document.activeElement)))return;
 state.formSyncBusy=true;state.formSyncError='';
 if(state.page==='movements')render();
 try{await applyFormsCSV(await fetchFormCSV(),{quiet});}
 catch(e){state.formSyncError=String(e.message||e);if(!quiet)toast(state.formSyncError,'error');else console.warn('Sincronización Google Forms:',e);}
 finally{state.formSyncBusy=false;if((state.mode==='local'||state.user)&&!document.getElementById('modal-root')?.firstElementChild)render();}
}
async function importFormsCSV(file){
 if(!file)return;
 if(file.size>2_000_000){toast('CSV demasiado grande (máximo 2 MB).','error');return;}
 if(state.formSyncBusy){toast('Hay una sincronización en curso.','error');return;}
 state.formSyncBusy=true;
 try{await applyFormsCSV(await file.text());}
 catch(e){state.formSyncError=e.message;toast(e.message,'error');}
 finally{state.formSyncBusy=false;render();}
}
let formSyncTimer=null;
function startFormSync(){
 if(formSyncTimer)clearInterval(formSyncTimer);
 // Evita transacciones de sincronización paralelas y no ejecuta si no hay sesión.
 if(state.mode==='cloud'&&!state.user)return;
 void syncFormMovements({quiet:true});
 formSyncTimer=setInterval(()=>{
  if(document.visibilityState==='visible'&&!state.formSyncBusy)void syncFormMovements({quiet:true});
 },60000);
}
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible'&&(state.mode==='local'||state.user)){
  if(!state.formSyncAt||Date.now()-state.formSyncAt.getTime()>60000)void syncFormMovements({quiet:true});
 }
});
const LOGOUT_SIGNAL_KEY='imvicto-corp-signout-v5';
function clearClientSession() {
 if(state.mode!=='cloud')return;
 if(formSyncTimer){clearInterval(formSyncTimer);formSyncTimer=null;}
 if(refresher){clearTimeout(refresher);refresher=null;}
 if(channel&&state.supabase){void state.supabase.removeChannel(channel);channel=null;}
 state.user=null;state.sales=[];state.movements=[];state.settings={...DEFAULT_SETTINGS};
 state.fixedExpenses=[];state.fixedOverrides=[];state.page='dashboard';state.sidebarOpen=false;
 state.formSyncBusy=false;state.formSyncError='';state.formSyncAt=null;state.formSyncAdded=0;
 state.showDeletedForms=false;state.loading=false;
 closeModal();render();
}
async function signOutForOtherTab() {
 if(!state.supabase)return;
 // Se cierra sólo en este navegador: no expulsa a Ángel de su propio dispositivo.
 try{await state.supabase.auth.signOut({scope:'local'});}catch(e){console.warn('Sesión en otra pestaña:',e);}
 clearClientSession();
}
async function logoutCurrentBrowser() {
 if(state.mode!=='cloud'||!state.supabase)return;
 state.busy=true;
 try{
  const {error}=await state.supabase.auth.signOut({scope:'local'});
  if(error)throw error;
  // Notifica otras pestañas del mismo origen, sin borrar localStorage de respaldos.
  localStorage.setItem(LOGOUT_SIGNAL_KEY,String(Date.now()));
  clearClientSession();
  toast('Sesión cerrada en este navegador.');
 }catch(err){toast('No se pudo cerrar la sesión: '+(err.message||err),'error');}
 finally{state.busy=false;}
}
function updateFixedFxPreview() {
 const f=document.getElementById('fixed-form')||document.getElementById('fixed-adjust-form');if(!f)return;
 const c=f.id==='fixed-form'?currencyCode(f.elements.currency?.value):currencyCode(occurrenceById(f.dataset.id).currency);
 const label=document.getElementById(f.id==='fixed-form'?'fixed-fx-preview':'adjust-fx-preview');if(!label)return;
 const amount=num(f.elements.amount?.value),rate=c==='USD'?num(f.elements.exchange_rate?.value):1;
 if(f.id==='fixed-form'){
  const fx=f.elements.exchange_rate?.closest('.field');if(fx)fx.style.display=c==='USD'?'':'none';
 }
 if(!Number.isFinite(amount)||!Number.isFinite(rate)||amount<=0||rate<=0){label.textContent='Completa monto y tipo de cambio para ver el equivalente en soles.';return;}
 label.textContent=c==='USD'?`Importe original: US$ ${plain(amount)} × TC ${showRate(rate)} = ${money(solesFromOriginal(amount,c,rate))}`:`Importe en cuenta: ${money(amount)} (PEN).`;
}
async function init() {
 document.addEventListener('click',clickAction);
 document.addEventListener('submit',handleSubmit);
 document.addEventListener('input',handleInput);
 document.addEventListener('change',e=>{
  if(e.target.id==='backup-file')importBackup(e.target.files[0]);
  if(e.target.id==='forms-csv-file')importFormsCSV(e.target.files[0]);
  if(e.target.id==='period-sales'||e.target.id==='period-movements')handleInput(e);
  if(e.target.id==='fixed-month-picker'){state.calendarMonth=e.target.value||today().slice(0,7);render();}
  if(e.target.name==='participation'||e.target.name==='account'||e.target.name==='kind'||e.target.name==='currency')handleInput(e);
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
 if(!CLOUD_ENABLED){if(CLOUD_REQUIRED){state.loading=false;document.getElementById('app').innerHTML='<div class="cloud-config-error"><h2>IMVICTO necesita conexión compartida</h2><p>Falta configurar <code>PUBLICAR_WEB/config.js</code> con SUPABASE_URL y SUPABASE_ANON_KEY. No se activó el modo local para evitar datos separados.</p></div>';return;}loadLocal();state.loading=false;render();startFormSync();return;}
 try{
  const lib=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  state.supabase=lib.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 state.supabase.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){setTimeout(()=>clearClientSession(),0);}});
 window.addEventListener('storage',event=>{if(event.key===LOGOUT_SIGNAL_KEY&&state.user){void signOutForOtherTab();}});
  const {data,error}=await state.supabase.auth.getSession();if(error)throw error;
  state.user=data.session?.user||null;
  if(state.user){try{await verifyAndLoad();}catch(err){state.user=null;state.authError=err.message||'Sesión no autorizada.';}}
 }catch(e){console.error('Conexión Supabase:',e);state.cloudError='No se pudo conectar al servicio compartido. Revisa config.js, Supabase y tu conexión a internet.';}
 state.loading=false;render();startFormSync();
}
init();
