/* Cálculos puros para calendario de gastos recurrentes V5.
 * fixed_expenses.amount = monto ORIGINAL en PEN o USD.
 * fixed_expenses.exchange_rate = soles por cada USD (estimado base).
 * fixed_expense_overrides = monto original y tipo de cambio de cada mes.
 * expected_amount siempre se expresa en SOLES, igual que los movimientos reales.
 */
export function monthKey(s) { return String(s ?? '').slice(0,7); }
export function dayInMonth(year,month) { return new Date(year,month,0).getDate(); }
export function dueDateFor(month,day) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Mes inválido');
  const [y,m]=month.split('-').map(Number);
  return `${month}-${String(Math.min(Number(day),dayInMonth(y,m))).padStart(2,'0')}`;
}
export function nextMonth(month,offset=1) {
 const [year,m]=month.split('-').map(Number);const d=new Date(year,m-1+offset,1);
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
export function monthGrid(month) {
 const [y,m]=month.split('-').map(Number);const first=(new Date(y,m-1,1).getDay()+6)%7;
 const count=dayInMonth(y,m);const weeks=Math.ceil((first+count)/7);
 return Array.from({length:weeks*7},(_,i)=>{const day=i-first+1;return day>=1&&day<=count?day:null;});
}
export const roundMoney=(v)=>Math.round((Number(v)+Number.EPSILON)*100)/100;
export const roundRate=(v)=>Math.round((Number(v)+Number.EPSILON)*10000)/10000;
export const currencyCode=(v)=>v==='USD'?'USD':'PEN';
export function solesFromOriginal(amount,currency='PEN',rate=1) {
 const v=Number(amount);const r=currencyCode(currency)==='USD'?Number(rate):1;
 if(!Number.isFinite(v)||!Number.isFinite(r)||v<0||r<=0)throw new Error('Importe o tipo de cambio inválido.');
 return roundMoney(v*r);
}
export function expenseOccurrences(items,overrides,movements,month) {
 const manual=new Map((overrides||[]).filter(o=>monthKey(o.month)===month).map(o=>[o.fixed_expense_id,o]));
 const byMovement=new Map();
 for(const m of movements||[]) {
  if(m.is_deleted||m.kind!=='egreso'||!m.recurring_id||monthKey(m.recurring_month)!==month)continue;
  if(!byMovement.has(m.recurring_id))byMovement.set(m.recurring_id,m);
 }
 return (items||[]).filter(x=>{
  const start=monthKey(x.start_month),end=monthKey(x.end_month);
  return (x.active||byMovement.has(x.id)) && start<=month&&(!end||month<=end);
 }).map(x=>{
  const override=manual.get(x.id),due_date=dueDateFor(month,x.due_day);
  const actual=byMovement.get(x.id)||null;
  const currency=currencyCode(x.currency);
  const original_amount=Number(override?.amount??x.amount);
  const exchange_rate=currency==='USD'?Number(override?.exchange_rate??x.exchange_rate??1):1;
  return {...x,month,due_date,currency,original_amount,exchange_rate,
    expected_amount:solesFromOriginal(original_amount,currency,exchange_rate),
    override:!!override,actual};
 }).sort((a,b)=>a.due_date.localeCompare(b.due_date)||a.concept.localeCompare(b.concept));
}
export function expenseSummary(occurrences,referenceDate) {
 const total=roundMoney(occurrences.reduce((s,o)=>s+o.expected_amount,0));
 const paid=roundMoney(occurrences.filter(o=>o.actual).reduce((s,o)=>s+Number(o.actual.amount),0));
 const pending=roundMoney(occurrences.filter(o=>!o.actual).reduce((s,o)=>s+o.expected_amount,0));
 const late=occurrences.filter(o=>!o.actual&&o.due_date<referenceDate).length;
 return {total,paid,pending,late,count:occurrences.length,paidCount:occurrences.filter(o=>o.actual).length};
}
