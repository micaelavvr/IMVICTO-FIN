/** Servidor local opcional: sirve la web y evita CORS al descargar el CSV público de Forms. Node 18+. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const HOST='127.0.0.1',PORT=Number(process.env.PORT||3000);
const CSV_URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vT7CeuW9MnqkIs_tBOL03xSTBX7mvzV_uydrc1Syi2VmYTb06T3z3_6Rkh9Hu42A9tkBjxsg-LdwHQV/pub?output=csv';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg','.ico':'image/x-icon','.json':'application/json; charset=utf-8'};
const app=http.createServer(async(req,res)=>{
 try{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/forms-csv'){
   const upstream=await fetch(CSV_URL,{headers:{Accept:'text/csv'},signal:AbortSignal.timeout(18000)});
   if(!upstream.ok)throw Error(`Google Sheets respondió HTTP ${upstream.status}`);
   const body=await upstream.text();if(body.length>2_000_000)throw Error('El CSV excede el límite permitido.');
   res.writeHead(200,{'content-type':'text/csv; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});return res.end(body);
  }
  if(url.pathname.startsWith('/api/')){res.writeHead(404);return res.end('Not found');}
  const requested=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
  const filepath=path.resolve(ROOT,'.'+requested);
  if(!filepath.startsWith(ROOT+path.sep)||requested.split('/').some(x=>x.startsWith('.'))||['README.md','supabase.sql','server.mjs','config.toml'].includes(path.basename(filepath))){res.writeHead(403);return res.end('Forbidden');}
  const data=await fs.readFile(filepath);
  res.writeHead(200,{'content-type':types[path.extname(filepath)]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(data);
 }catch(e){const status=e.code==='ENOENT'?404:502;res.writeHead(status,{'content-type':'text/plain; charset=utf-8'});res.end(status===404?'Archivo no encontrado':String(e.message||e));}
});
app.listen(PORT,HOST,()=>console.log(`IMVICTO CORP disponible en http://${HOST}:${PORT}`));
