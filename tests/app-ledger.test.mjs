import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {parseFormMovements,changedRecords} from '../form-sync.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const app=fs.readFileSync(path.join(root,'../app.js'),'utf8')
  .replace(/^import .*?;\n/gm,'').replace(/\ninit\(\);\s*$/, '\n');
const csv='Marca temporal,Fecha,Tipo de movimiento,Concepto,Monto (S/.),Pagado por,Saldo afectado\n24/10/2026 21:18:03,24/10/2026,Egreso,propina,5,IMVICTO,IMVICTO';
function build(){
 const backing=new Map();
 const storage={getItem:k=>backing.get(k)||null,setItem:(k,v)=>backing.set(k,v)};
 const context=vm.createContext({window:{IMVICTO_CONFIG:{}},document:{addEventListener(){}},localStorage:storage,crypto:globalThis.crypto,console,setTimeout,clearTimeout,setInterval,clearInterval,Intl,Date,Math,Number,String,Map,Array,JSON,Object,Boolean,Promise,Error,AbortSignal,parseFormMovements,changedRecords});
 vm.runInContext(app+'\nglobalThis.testApi={state,mergeFormRows,saveRecord,removeRecord,restoreFormMovement,totals,persistLocal,loadLocal,sortedMovs};',context);
 return {api:context.testApi,backing};
}
test('actual ledger: correcting imported movement recalculates account and resync keeps override',async()=>{
 const {api}=build();
 const entry=parseFormMovements(csv);
 await api.mergeFormRows(entry);
 assert.equal(api.state.movements.length,1);
 assert.equal(api.totals().card,-5);
 const id=api.state.movements[0].id;
 await api.saveRecord('movements',{move_date:'2026-10-24',concept:'propina editada',kind:'egreso',amount:8,payer:'imvicto',account:'angel'},id);
 assert.equal(api.totals().card,0);
 assert.equal(api.totals().angel,-8);
 assert.equal(api.state.movements[0].form_locked,true);
 await api.mergeFormRows(parseFormMovements(csv.replace('propina,5','propina,500')));
 assert.equal(api.state.movements[0].concept,'propina editada');
 assert.equal(api.totals().angel,-8);
});
test('actual ledger: soft delete excludes totals and resync; restore returns edited value',async()=>{
 const {api,backing}=build();
 await api.mergeFormRows(parseFormMovements(csv));
 const id=api.state.movements[0].id;
 await api.removeRecord('movements',id);
 assert.equal(api.state.movements[0].is_deleted,true);
 assert.equal(api.sortedMovs().length,0);
 assert.equal(api.totals().card,0);
 await api.mergeFormRows(parseFormMovements(csv));
 assert.equal(api.state.movements.length,1);
 assert.equal(api.sortedMovs().length,0);
 const raw=JSON.parse(backing.get('imvicto-corp-data-v1'));
 assert.equal(raw.movements[0].is_deleted,true);
 await api.restoreFormMovement(id);
 assert.equal(api.totals().card,-5);
 assert.equal(api.sortedMovs().length,1);
});
test('saldo afectado: importacion del formulario descuenta a Micaela o Angel y no a la tarjeta',async()=>{
 const {api}=build();
 const rows='Marca temporal,Fecha,Tipo de movimiento,Concepto,Monto (S/.),Pagado por,Saldo afectado\n'+[
  '22/11/2026 10:00:01,22/11/2026,Egreso,Gasto tarjeta,15,IMVICTO,IMVICTO',
  '22/11/2026 10:00:02,22/11/2026,Egreso,Gasto Micaela,20,IMVICTO,MICAELA',
  '22/11/2026 10:00:03,22/11/2026,Egreso,Gasto Angel,30,IMVICTO,ANGEL',
  '22/11/2026 10:00:04,22/11/2026,Ingreso,Devolucion Micaela,5,IMVICTO,MICAELA'
 ].join('\n');
 await api.mergeFormRows(parseFormMovements(rows));
 assert.equal(api.state.movements.length,4);
 assert.equal(api.totals().card,-15);
 assert.equal(api.totals().micaela,-15);
 assert.equal(api.totals().angel,-30);
 await api.mergeFormRows(parseFormMovements(rows));
 assert.equal(api.state.movements.length,4);
 assert.equal(api.totals().card,-15);
});
