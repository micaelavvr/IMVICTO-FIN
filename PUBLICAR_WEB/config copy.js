// MODO LOCAL: deja las dos claves de Supabase vacías. Ejecuta "node server.mjs"
// para que el CSV público de Google Sheets se lea sin problemas CORS.
// MODO COMPARTIDO: configura URL y clave pública Supabase, ejecuta SQL y despliega Edge Function.
// NUNCA publiques claves de tipo service_role/secret aquí.
window.IMVICTO_CONFIG = {
  SUPABASE_URL: "https://zzyvgqdqewxnjxrvidqt.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_l8Zog5hB-U4BAVi7x0BaYg_QO78Ny9Z",
  GOOGLE_FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLSd6_clyLZl9xEe6_s4utDmIxz2cBRD2z6JHNhUoPN2dEvxIbA/viewform?usp=dialog",
  GOOGLE_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7CeuW9MnqkIs_tBOL03xSTBX7mvzV_uydrc1Syi2VmYTb06T3z3_6Rkh9Hu42A9tkBjxsg-LdwHQV/pub?output=csv"
};
