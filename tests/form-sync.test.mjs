import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,parseFormMovements,changedRecords} from '../form-sync.mjs';
const HEADER='Marca temporal,Fecha,Tipo de movimiento,Concepto,Monto (S/.),Pagado por,Saldo afectado';
const base=HEADER+'\n'+[
 '24/10/2026 21:18:03,24/10/2026,Egreso,Polos Piqué,198,IMVICTO,IMVICTO',
 '24/10/2026 21:20:30,24/10/2026,Egreso,Chilis M,"27,40",M,M',
 '24/10/2026 21:22:04,24/10/2026,Ingreso,Reembolso,"1.500,50",IMVICTO,IMVICTO',
 '24/10/2026 21:25:06,24/10/2026,Egreso,Compra mixta,80,A y M,A y M'
].join('\n');
test('parse CSV quoted, multiline and delimiters',()=>{
 const rows=parseCSV('a;b;c\r\n"1;2";"hola\nmundo";3\r\n');
 assert.deepEqual(rows,[['a','b','c'],['1;2','hola\nmundo','3']]);
});
test('loads valid movement rows and maps both agents',()=>{
 const r=parseFormMovements(base);
 assert.equal(r.records.length,4);assert.equal(r.skipped.length,0);
 assert.deepEqual(r.records.map(x=>[x.move_date,x.kind,x.amount,x.payer,x.account]),[
 ['2026-10-24','egreso',198,'imvicto','tarjeta'],
 ['2026-10-24','egreso',27.4,'micaela','micaela'],
 ['2026-10-24','ingreso',1500.5,'imvicto','tarjeta'],
 ['2026-10-24','egreso',80,'ambos','ambos']
 ]);
 assert.equal(new Set(r.records.map(x=>x.source_key)).size,4);
});
test('same responses are deduplicated, changed row reconciles by timestamp',()=>{
 const first=parseFormMovements(base);
 assert.equal(changedRecords(first.records,[]).length,4);
 assert.equal(changedRecords(first.records,first.records).length,0);
 const revised=base.replace('Polos Piqué,198','Polos Piqué,200');
 const again=parseFormMovements(revised);
 assert.equal(again.records[0].source_key,first.records[0].source_key);
 assert.equal(changedRecords(again.records,first.records).length,1);
});
test('rejects unknown accounts and malformed amounts rather than guessing',()=>{
 const r=parseFormMovements(HEADER+'\n24/10/2026,24/10/2026,Egreso,Comida,abc,IMVICTO,IMVICTO\n24/10/2026,24/10/2026,Egreso,Comida,12,IMVICTO,OTRA');
 assert.equal(r.records.length,0);assert.equal(r.skipped.length,2);
 assert.match(r.skipped[0].reason,/monto/);assert.match(r.skipped[1].reason,/Saldo afectado/);
});
test('headers required',()=>assert.throws(()=>parseFormMovements('fecha,concepto\n24/10/2026,Cafe'),/Faltan columnas/));
test('form rows without timestamp still stable if content is the same',()=>{
 const csv=HEADER.replace('Marca temporal,','').split(',').join(';')+'\n24/10/2026;Egreso;Chilis A;51,4;Angel;Angel';
 const r=parseFormMovements(csv);assert.equal(r.records.length,1);assert.equal(r.hasTimestamp,false);
 assert.equal(parseFormMovements(csv).records[0].source_key,r.records[0].source_key);
});
test('editing a Google Forms row locks the imported entry against later sync',()=>{
 const original=parseFormMovements(base).records;
 const edited={...original[0],concept:'Propina corregida',amount:5,account:'angel',form_locked:true};
 const refreshed=parseFormMovements(base.replace('Polos Piqué,198','Polos Piqué,250')).records;
 assert.equal(changedRecords(refreshed,[edited,...original.slice(1)]).length,0);
});
test('deleted Google Forms rows stay tombstoned and cannot be reimported',()=>{
 const original=parseFormMovements(base).records;
 const deleted={...original[0],is_deleted:true,form_locked:true};
 const changedSheet=parseFormMovements(base.replace('Polos Piqué,198','Polos Piqué,2')).records;
 assert.equal(changedRecords(changedSheet,[deleted,...original.slice(1)]).length,0);
});
test('untouched Google Forms rows still accept corrections made in Google Sheets',()=>{
 const original=parseFormMovements(base).records;
 const changedSheet=parseFormMovements(base.replace('Polos Piqué,198','Polos Piqué,205')).records;
 assert.equal(changedRecords(changedSheet,original).length,1);
});


test('nuevo Form: saldo afectado controla la cuenta aunque pagado por sea IMVICTO',()=>{
 const csv=HEADER+'\n'+[
 '22/11/2026 12:01,22/11/2026,Egreso,Servicio tarjeta,18,IMVICTO,IMVICTO',
 '22/11/2026 12:02,22/11/2026,Egreso,Comision Micaela,45,IMVICTO,MICAELA',
 '22/11/2026 12:03,22/11/2026,Egreso,Comision Angel,22,IMVICTO,ANGEL',
 '22/11/2026 12:04,22/11/2026,Ingreso,Reembolso Angel,10,IMVICTO,ANGEL'
 ].join('\n');
 const parsed=parseFormMovements(csv);
 assert.equal(parsed.skipped.length,0);
 assert.deepEqual(parsed.records.map(r=>[r.kind,r.payer,r.account,r.amount]),[
  ['egreso','imvicto','tarjeta',18],
  ['egreso','imvicto','micaela',45],
  ['egreso','imvicto','angel',22],
  ['ingreso','imvicto','angel',10]
 ]);
 const signed=a=>a.reduce((s,r)=>s+(r.kind==='egreso'?-r.amount:r.amount),0);
 assert.equal(signed(parsed.records.filter(r=>r.account==='tarjeta')),-18);
 assert.equal(signed(parsed.records.filter(r=>r.account==='micaela')), -45);
 assert.equal(signed(parsed.records.filter(r=>r.account==='angel')), -12);
});

test('cambio de saldo afectado en la hoja actualiza el mismo movimiento y no lo duplica',()=>{
 const old=parseFormMovements(HEADER+'\n22/11/2026 12:01,22/11/2026,Egreso,Compra,100,IMVICTO,IMVICTO').records;
 const updated=parseFormMovements(HEADER+'\n22/11/2026 12:01,22/11/2026,Egreso,Compra,100,IMVICTO,MICAELA').records;
 assert.equal(updated[0].source_key,old[0].source_key);
 assert.equal(changedRecords(updated,old).length,1);
 assert.equal(changedRecords(updated,[{...old[0],account:'angel',form_locked:true}]).length,0);
 assert.equal(changedRecords(updated,[{...old[0],is_deleted:true}]).length,0);
});

test('acepta encabezado alternativo a quien se le resta',()=>{
 const csv=HEADER.replace('Saldo afectado','¿A quién se le resta?')+'\n22/11/2026,22/11/2026,Egreso,Cargo personal,10,IMVICTO,ANGEL';
 const parsed=parseFormMovements(csv);
 assert.equal(parsed.records.length,1);
 assert.equal(parsed.records[0].account,'angel');
});
