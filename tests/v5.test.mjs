import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {expenseOccurrences, expenseSummary, solesFromOriginal, currencyCode} from '../fixed-expenses.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const app=fs.readFileSync(path.resolve(dir,'../app.js'),'utf8').replace(/^import .*?;\n/gm,'').replace(/\ninit\(\);\s*$/,'\n');
class FakeFormData extends Map {constructor(form){super(Object.entries(form.fields||{}));}}
function boot(){
 const bag=new Map([['imvicto-corp-data-v1','{"important":"DO NOT DELETE"}']]);
 const storage={getItem:k=>bag.get(k)||null,setItem:(k,v)=>bag.set(k,v),removeItem:k=>bag.delete(k)};
 const nodes=new Map([['modal-root',{innerHTML:''}]]);
 const document={addEventListener(){},getElementById:(id)=>nodes.get(id)||null};
 const window={IMVICTO_CONFIG:{},addEventListener(){}};
 const context=vm.createContext({window,document,localStorage:storage,FormData:FakeFormData,console,setTimeout,clearTimeout,setInterval,clearInterval,Intl,Date,Math,Number,String,Map,Array,JSON,Object,Boolean,Promise,Error,solesFromOriginal,currencyCode,expenseOccurrences,expenseSummary,roundRate:(n)=>Math.round(Number(n)*1e4)/1e4});
 vm.runInContext(app+`\nglobalThis.v5={state,split,totals,saleFromForm,saleFromObject,submitFixedForm,submitFixedAdjustment,calOccurrences,fixedModal,fixedAdjustmentModal,logoutCurrentBrowser,signOutForOtherTab};render=()=>{};toast=()=>{};`,context);
 return {...context.v5,bag,nodes};
}
const baseSale={sale_date:'2026-10-22',client:'Milder',product:'Joya 20cm',sale_type:'FINANCIADO',net_income:424.51,profit:0,seller_payment:533.89,participation:'ambos'};
test('V5 accepts negative liquid sales, splitting negative commissions and applying to saldo',()=>{
 const {saleFromForm,saleFromObject,split,totals,state}=boot();
 const s=saleFromForm({fields:baseSale});
 assert.equal(split(s).liquid,-109.38);
 assert.equal(split(s).micaela,-54.69);
 assert.equal(split(s).angel,-54.69);
 assert.equal(saleFromObject(s).seller_payment,533.89);
 state.sales=[s];
 assert.equal(totals().micaela,-54.69);
 assert.equal(totals().angel,-54.69);
 assert.equal(totals().card,424.51); // por configuración neto
});
test('V5 preserves 60/40 split for a negative sale',()=>{
 const {split}=boot();
 const x=split({...baseSale,participation:'micaela'});
 assert.equal(x.liquid,-109.38);
 assert.equal(x.micaela,-65.63);
 assert.equal(x.angel,-43.75);
 assert.equal(x.micaela+x.angel,-109.38);
});
test('Currency conversion uses monthly USD rate and projects PEN only',()=>{
 const fixed={id:'fx01',concept:'ChatGPT empresarial',amount:20,currency:'USD',exchange_rate:3.75,due_day:8,account:'tarjeta',payer:'imvicto',active:true,start_month:'2026-10-01',end_month:null};
 const override={fixed_expense_id:'fx01',month:'2026-11-01',amount:20,exchange_rate:3.81};
 const october=expenseOccurrences([fixed],[override],[],'2026-10');
 const november=expenseOccurrences([fixed],[override],[],'2026-11');
 assert.equal(october[0].expected_amount,75);
 assert.equal(november[0].expected_amount,76.2);
 assert.equal(november[0].original_amount,20);
 assert.equal(november[0].exchange_rate,3.81);
 assert.equal(expenseSummary(november,'2026-11-01').pending,76.2);
 assert.equal(solesFromOriginal(20,'USD',3.81),76.2);
 assert.equal(currencyCode(undefined),'PEN');
});
test('V4 legacy expenses without USD fields stay PEN',()=>{
 const old={id:'old',concept:'Pago Oficina',amount:860,due_day:7,account:'tarjeta',payer:'imvicto',active:true,start_month:'2026-01-01'};
 const exp=expenseOccurrences([old],[],[],'2026-11')[0];
 assert.equal(exp.currency,'PEN');assert.equal(exp.expected_amount,860);assert.equal(exp.exchange_rate,1);
});
test('USD fixed form stores original amount and FX, per-month correction keeps base intact',async()=>{
 const {state,submitFixedForm,submitFixedAdjustment,calOccurrences}=boot();
 state.calendarMonth='2026-11';
 await submitFixedForm({dataset:{},fields:{concept:'Equifax',currency:'USD',amount:'25.00',exchange_rate:'3.7600',due_day:'10',start_month:'2026-11',account:'tarjeta',payer:'imvicto',end_month:'',notes:''}});
 assert.equal(state.fixedExpenses.length,1);
 const item=state.fixedExpenses[0];
 assert.equal(item.amount,25);assert.equal(item.currency,'USD');assert.equal(item.exchange_rate,3.76);
 await submitFixedAdjustment({dataset:{id:item.id,month:'2026-11'},fields:{amount:'30',exchange_rate:'3.9000'}});
 assert.equal(calOccurrences('2026-11')[0].expected_amount,117);
 assert.equal(calOccurrences('2026-12')[0].expected_amount,94);
});
test('logout scope local clears in-memory data and leaves local JSON backups intact',async()=>{
 const {state,logoutCurrentBrowser,bag}=boot();
 state.mode='cloud';state.user={id:'123',email:'test@domain.com'};
 state.sales=[{...baseSale}];state.fixedExpenses=[{concept:'Oficina'}];
 let option=null;
 state.supabase={auth:{async signOut(p){option=p;return {error:null};}},removeChannel:async()=>{}};
 await logoutCurrentBrowser();
 assert.equal(option.scope,'local');assert.equal(state.user,null);
 assert.equal(state.sales.length,0);assert.equal(state.fixedExpenses.length,0);
 assert.equal(bag.get('imvicto-corp-data-v1'),'{"important":"DO NOT DELETE"}');
 assert.ok(bag.get('imvicto-corp-signout-v5'));
});
test('Migration removes liquid constraint and adds currency and fx columns',()=>{
 const sql=fs.readFileSync(path.resolve(dir,'../MIGRACION_V5_NEGATIVOS_USD.sql'),'utf8');
 assert.match(sql,/DROP CONSTRAINT IF EXISTS liquid_non_negative/i);
 assert.match(sql,/fixed_expenses[\s\S]+ADD COLUMN IF NOT EXISTS currency/i);
 assert.match(sql,/fixed_expense_overrides[\s\S]+ADD COLUMN IF NOT EXISTS exchange_rate/i);
});
test('Published V5 refuses unconfigured browser-local mode',()=>{
 const html=fs.readFileSync(path.resolve(dir,'../PUBLICAR_WEB/index.html'),'utf8');
 const js=fs.readFileSync(path.resolve(dir,'../PUBLICAR_WEB/app.js'),'utf8');
 assert.match(html,/IMVICTO_DEPLOYMENT_REQUIRES_CLOUD = true/);
 assert.match(js,/if\(CLOUD_REQUIRED\)/);
});
