import test from 'node:test';
import assert from 'node:assert/strict';
import {dayInMonth,dueDateFor,nextMonth,monthGrid,expenseOccurrences,expenseSummary} from '../fixed-expenses.mjs';
const id='cf42e8a1-40c3-4799-9f5e-a1a1336818a1';
const one={id,concept:'Pago Oficina',amount:100,due_day:31,account:'tarjeta',payer:'imvicto',active:true,start_month:'2026-01-01',end_month:null};
test('Fechas del calendario: febrero y diciembre',()=>{
 assert.equal(dayInMonth(2026,2),28);assert.equal(dayInMonth(2028,2),29);
 assert.equal(dueDateFor('2026-02',31),'2026-02-28');assert.equal(dueDateFor('2028-02',31),'2028-02-29');
 assert.equal(nextMonth('2026-12'),'2027-01');assert.equal(nextMonth('2027-01',-1),'2026-12');
 assert.equal(monthGrid('2026-10').filter(Boolean).length,31);
});
test('La previsión no representa un egreso contable ni cambia saldos',()=>{
 const o=expenseOccurrences([one],[],[],'2026-10');const s=expenseSummary(o,'2026-10-01');
 assert.equal(s.total,100);assert.equal(s.pending,100);assert.equal(s.paid,0);
 assert.equal(o[0].actual,null);
});
test('Ajuste extraordinario de un mes no modifica la cuota normal',()=>{
 const override={id:'1',fixed_expense_id:id,month:'2026-10-01',amount:140};
 assert.equal(expenseOccurrences([one],[override],[],'2026-10')[0].expected_amount,140);
 assert.equal(expenseOccurrences([one],[override],[],'2026-11')[0].expected_amount,100);
});
test('Relacionar un movimiento real marca pagado, sin sumar dos veces',()=>{
 const m={id:'a',kind:'egreso',is_deleted:false,amount:120,recurring_id:id,recurring_month:'2026-10-01',move_date:'2026-10-24'};
 const o=expenseOccurrences([one],[],[m],'2026-10');const s=expenseSummary(o,'2026-10-25');
 assert.equal(o.length,1);assert.equal(o[0].actual.id,'a');assert.equal(s.paid,120);assert.equal(s.pending,0);
 assert.equal(expenseOccurrences([one],[],[m],'2026-11')[0].actual,null);
});
test('Los movimientos borrados no cubren gastos fijos',()=>{
 const m={id:'a',kind:'egreso',is_deleted:true,amount:100,recurring_id:id,recurring_month:'2026-10-01'};
 assert.equal(expenseOccurrences([one],[],[m],'2026-10')[0].actual,null);
});
test('Inicio, fin y estado activo filtran correctamente',()=>{
 const e={...one,start_month:'2026-07-01',end_month:'2026-09-01'};
 assert.equal(expenseOccurrences([e],[],[],'2026-06').length,0);
 assert.equal(expenseOccurrences([e],[],[],'2026-09').length,1);
 assert.equal(expenseOccurrences([e],[],[],'2026-10').length,0);
 assert.equal(expenseOccurrences([{...e,active:false}],[],[],'2026-09').length,0);
});
