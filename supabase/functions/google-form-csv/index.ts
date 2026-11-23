// Proxy privado para los dos usuarios autenticados de IMVICTO.
// La URL de Google publicada es de solo lectura; no lleva claves ni credenciales.
import { withSupabase } from 'npm:@supabase/server@^1';
const CSV_URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vT7CeuW9MnqkIs_tBOL03xSTBX7mvzV_uydrc1Syi2VmYTb06T3z3_6Rkh9Hu42A9tkBjxsg-LdwHQV/pub?output=csv';
export default {
 fetch:withSupabase({auth:'user'},async(_req,ctx)=>{
  const email=String(ctx.userClaims?.email??'').toLowerCase();
  if(!email)return new Response('Correo no encontrado',{status:403});
  const {data,error}=await ctx.supabase.from('allowed_users').select('email').eq('email',email).maybeSingle();
  if(error||!data)return new Response('Acceso no autorizado',{status:403});
  try{
   const r=await fetch(CSV_URL,{headers:{Accept:'text/csv'},signal:AbortSignal.timeout(18000)});
   if(!r.ok)return new Response(`Google respondió ${r.status}`,{status:502});
   const csv=await r.text();
   if(csv.length>2_000_000)return new Response('El CSV es demasiado grande',{status:413});
   return new Response(csv,{status:200,headers:{'content-type':'text/csv; charset=utf-8','cache-control':'no-store'}});
  }catch(e){return new Response('Google Sheets no respondió: '+String(e?.message||e),{status:502});}
 })
};
