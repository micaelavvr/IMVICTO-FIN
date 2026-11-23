/* Adaptador Google Forms → movimientos. Sin dependencias, utilizable en navegador y tests. */
export function parseCSV(text) {
  if (typeof text !== 'string') throw new Error('La respuesta de Google Sheets no es un CSV válido.');
  text = text.replace(/^\uFEFF/, '');
  if (!text.trim() || /^\s*</.test(text)) throw new Error('No se recibió un CSV. Comprueba que Google Sheets esté publicado como CSV.');
  const delimiter = detectDelimiter(text);
  const rows=[];let cells=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') {if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(c===delimiter&&!quoted){cells.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;cells.push(cell);if(cells.some(x=>x.trim()))rows.push(cells);cells=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw new Error('El CSV de Google contiene comillas sin cerrar.');
  cells.push(cell);if(cells.some(x=>x.trim()))rows.push(cells);
  return rows;
}
function detectDelimiter(input) {
  let comma=0,semi=0,inQuotes=false;
  for(let i=0;i<input.length;i++){
    const c=input[i];if(c==='"'){if(inQuotes&&input[i+1]==='"'){i++;}else inQuotes=!inQuotes;}
    else if(!inQuotes&&(c==='\r'||c==='\n'))break;
    else if(!inQuotes&&c===',')comma++;
    else if(!inQuotes&&c===';')semi++;
  }
  return semi>comma?';':',';
}
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const fieldNames={
  stamp:['marca temporal','marcas temporales','timestamp','fecha y hora','fecha de respuesta','fecha de envio','submitted at','horario'],
  date:['fecha','fecha del movimiento','fecha de operacion','dia'],
  kind:['tipo de movimiento','movimiento','tipo','ingreso egreso'],
  concept:['concepto','descripcion','detalle','motivo','concepto del gasto'],
  amount:['monto s','monto','importe','monto soles','valor','cantidad'],
  payer:['pagado por','pagado recibido por','responsable','quien pago','quien realiza el pago','pagador'],
  account:['saldo afectado','cuenta afectada','a que saldo afecta','a quien afecta','a quien afecta el monto','a quien se le resta','a que saldo se le resta','saldo al que se descuenta','saldo','destino','cuenta','a quien se descuenta']
};
function columnIndices(header){const all=header.map(norm);const out={};for(const [key,candidates] of Object.entries(fieldNames)){const match=all.findIndex(x=>candidates.some(y=>norm(y)===x));out[key]=match;}return out;}
function parseAmount(v) {
  let t=String(v??'').replace(/S\s*\/?\s*\.?\s*/gi,'').replace(/\s/g,'').replace(/[^0-9,.-]/g,'');
  if(t.includes(',')&&t.includes('.'))t=t.lastIndexOf(',')>t.lastIndexOf('.')?t.replace(/\./g,'').replace(',','.'):t.replace(/,/g,'');
  else if(t.includes(','))t=t.replace(',','.');
  if(!t||!/^\d+(?:\.\d+)?$/.test(t))return NaN;
  const n=Number(t);return Number.isFinite(n)?Math.round((n+Number.EPSILON)*100)/100:NaN;
}
function validDate(y,m,d) {
  y=Number(y);m=Number(m);d=Number(d);
  const v=new Date(Date.UTC(y,m-1,d));
  if(y<2000||y>2100||v.getUTCFullYear()!==y||v.getUTCMonth()+1!==m||v.getUTCDate()!==d)return null;
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function parseDate(v) {
  const s=String(v??'').trim();let a;
  if((a=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)))return validDate(a[1],a[2],a[3]);
  if((a=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)))return validDate(a[3],a[2],a[1]);
  return null;
}
function parseKind(v){const x=norm(v);if(x==='ingreso'||x==='entrada'||x==='abono')return 'ingreso';if(x==='egreso'||x==='salida'||x==='gasto'||x==='pago')return 'egreso';return null;}
// Saldo afectado = cuenta contable. No se deduce de Pagado por; son campos distintos.
function parseAccount(v){const x=norm(v);if(['imvicto','tarjeta','tarjeta imvicto','tarjeta de empresa','empresa','cuenta de empresa','cuenta imvicto'].includes(x))return 'tarjeta';if(['micaela','m'].includes(x))return 'micaela';if(['angel','a'].includes(x))return 'angel';if(['ambos','ambas','a y m','m y a','angel y micaela','micaela y angel','ambos agentes','mitad cada uno','50 50'].includes(x))return 'ambos';return null;}
function parsePayer(v){const x=norm(v);if(['imvicto','tarjeta','tarjeta imvicto','empresa'].includes(x))return 'imvicto';if(['micaela','m'].includes(x))return 'micaela';if(['angel','a'].includes(x))return 'angel';if(['ambos','ambas','a y m','m y a','angel y micaela','micaela y angel'].includes(x))return 'ambos';if(['otro','otra persona','vendedor','tercero'].includes(x))return 'otro';return null;}
function digest(text){let a=0x811c9dc5,b=0x1505;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,33);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
export function parseFormMovements(text){
 const rows=parseCSV(text);
 if(rows.length===0)throw new Error('El CSV no tiene encabezados.');
 const col=columnIndices(rows[0]);
 const required=['date','kind','concept','amount','payer','account'];
 const absent=required.filter(k=>col[k]===-1);
 if(absent.length)throw new Error('Faltan columnas obligatorias en Google Sheets: '+absent.map(k=>({date:'Fecha',kind:'Tipo de movimiento',concept:'Concepto',amount:'Monto (S/.)',payer:'Pagado por',account:'Saldo afectado'}[k])).join(', ')+'.');
 const records=[],skipped=[],identities=new Map(),hasTimestamp=col.stamp!==-1;
 for(let i=1;i<rows.length;i++){
  const row=rows[i],at=k=>String(row[col[k]]??'').trim();
  if(!row.some(x=>String(x).trim()))continue;
  const date=parseDate(at('date')),kind=parseKind(at('kind')),amount=parseAmount(at('amount')),payer=parsePayer(at('payer')),account=parseAccount(at('account')),concept=at('concept');
  const errors=[];
  if(!date)errors.push('fecha inválida');if(!kind)errors.push('tipo de movimiento desconocido');if(!concept||concept.length>220)errors.push('concepto vacío o demasiado largo');if(!Number.isFinite(amount)||amount<=0||amount>9999999999)errors.push('monto inválido');if(!payer)errors.push('Pagado por desconocido');if(!account)errors.push('Saldo afectado desconocido');
  if(errors.length){skipped.push({row:i+1,reason:errors.join(', ')});continue;}
  const stamp=hasTimestamp?at('stamp'):'';
  // El sello de tiempo conserva identidad cuando se edita el concepto o importe en Sheets.
  // En hojas sin 'Marca temporal' usamos huella del contenido; no permite conciliar ediciones.
  const basis=stamp?`ts:${stamp}`:`content:${row.join('|')}`;
  const repeat=identities.get(basis)||0;identities.set(basis,repeat+1);
  const source_key=`google-form:${digest(basis)}:${repeat+1}`;
  records.push({move_date:date,kind,concept,amount,payer,account,source:'google_form',source_key});
 }
 return {records,skipped,hasTimestamp,columns:rows[0],totalRows:rows.length-1};
}
export function changedRecords(incoming,current) {
 const existing=new Map(current.filter(x=>x.source_key).map(x=>[x.source_key,x]));
 const keys=['move_date','kind','concept','amount','payer','account'];
 return incoming.filter(x=>{const old=existing.get(x.source_key);if(old?.form_locked||old?.is_deleted)return false;return !old||keys.some(k=>String(k==='amount'?Number(old[k]):old[k])!==String(k==='amount'?Number(x[k]):x[k]));});
}
