# IMVICTO CORP — Integración de Google Forms (versión 2)

En esta versión se conservan **Ventas**, **Comisiones**, **Saldos**, **Movimientos**, **Reportes** y el diseño navy/dorado. Se agrega sincronización de las respuestas de **Google Forms** con los movimientos. Los datos del formulario van a Google Sheets y **se copian al libro de movimientos de IMVICTO**; no se escribe ni se elimina contenido de la hoja de Google.

## Enlaces configurados

- Formulario: https://docs.google.com/forms/d/e/1FAIpQLSd6_clyLZl9xEe6_s4utDmIxz2cBRD2z6JHNhUoPN2dEvxIbA/viewform?usp=dialog
- Respuestas CSV publicadas: https://docs.google.com/spreadsheets/d/e/2PACX-1vT7CeuW9MnqkIs_tBOL03xSTBX7mvzV_uydrc1Syi2VmYTb06T3z3_6Rkh9Hu42A9tkBjxsg-LdwHQV/pub?output=csv

La aplicación tiene un acceso directo a **Abrir Google Form**, botón **Sincronizar Form**, sincronización al entrar y mientras la página está abierta (cada ~60 segundos); también permite **Importar CSV manual** cuando no hay conexión. Cada respuesta se identifica de manera estable por su **Marca temporal**; así no se duplica aunque se refresque repetidas veces o se use desde dos cuentas. Si se corrige una respuesta en la hoja manteniendo su sello de tiempo, la entrada importada se actualiza en la siguiente sincronización. **Borrar una fila en Google Sheets no borra automáticamente un asiento ya importado**, por seguridad del historial.

## 1. Revisa Google Forms y Google Sheets

1. En Google Forms, pestaña **Respuestas**, confirma que las respuestas van a la hoja de cálculo correcta.
2. La primera fila de la hoja publicada debe tener estas columnas (sin importar mayúsculas/tildes): `Marca temporal` (recomendada), `Fecha`, `Tipo de movimiento`, `Concepto`, `Monto (S/.)`, `Pagado por`, `Saldo afectado`.
3. El campo **Tipo de movimiento** admite exactamente `Ingreso` y `Egreso`.
4. El campo **Pagado por** admite `IMVICTO`, `Micaela`, `Ángel`, `A y M` (también `M`/`A` o `Otro`).
5. El campo **Saldo afectado** admite `IMVICTO`, `Micaela`, `Ángel` o `A y M`. Este último descuenta o suma 50 % al saldo de cada uno.
6. La fecha debe incluir año, preferiblemente **dd/mm/aaaa**. El monto debe ser numérico positivo, en soles; puede llevar separador decimal de coma o punto.
7. Prueba enviando una respuesta de prueba. Abre el enlace CSV anterior y comprueba que aparezca la respuesta y encabezados. Si Google Sheets publicó **Todo el documento**, la URL puede mostrar la hoja incorrecta; publica exclusivamente la pestaña de respuestas y usa su enlace CSV si fuese necesario. Cambia el enlace en `config.js`, `server.mjs` y `supabase/functions/google-form-csv/index.ts` si lo sustituyes.

**Importante:** cualquier persona que obtenga el enlace CSV publicado puede leer los movimientos. Es un mecanismo de consulta **público**, independiente del acceso privado a la web. No uses esta opción para información sensible o confidencial; para producción se recomienda una integración privada mediante una cuenta de servicio autorizada o un webhook seguro de Apps Script. Google advierte además que las publicaciones pueden tardar minutos en actualizarse: un envío no se refleja instantáneamente aunque la web revise cada 60 segundos.

## 2. Modo local con sincronización automática (forma rápida para probar)

1. Instala **Node.js 18 o superior**, si no lo tienes.
2. Abre el proyecto en Visual Studio Code.
3. Terminal → Nueva terminal: ejecuta `node server.mjs`.
4. Abre **http://127.0.0.1:3000** (no hace falta instalar dependencias ni `npm install`).
5. En **Movimientos**, pulsa **Sincronizar Form**. Las respuestas se importarán y actualizarán saldos. Si está abierta, la web repetirá la consulta automáticamente. Si el CSV todavía no ha publicado una respuesta, hay que esperar a Google.

> Si usas Live Server en vez de `node server.mjs`, el navegador puede bloquear la descarga directa del CSV por restricciones CORS. Para evitarlo, utiliza el servidor Node incluido. Si te aparece un error de conectividad con Google, descarga el CSV del enlace publicado y selecciona **Importar CSV manual**.

**En modo local, solo este navegador conserva los registros.** Para que Ángel y Micaela tengan el mismo historial desde sus dispositivos, utiliza el modo compartido de la siguiente sección.

## 3. Modo compartido: Ángel y Micaela con Supabase

1. Configura la conexión de **Supabase**, usuarios autorizados y SQL inicial según el archivo `README.md`.
2. En el **SQL Editor de Supabase**, ejecuta **`migracion_google_forms.sql`** una vez (conserva todos los registros previos y agrega un ID externo único).
3. Instala **Supabase CLI** (opcional, solo para desplegar la función). En el directorio de la web, entra con `supabase login`, vincula el proyecto usando `supabase link --project-ref TU_PROJECT_REF` y despliega la función con `supabase functions deploy google-form-csv`. También puedes subir el código `supabase/functions/google-form-csv/index.ts` desde el panel de Edge Functions de Supabase si está disponible. La función usa autorización **JWT de usuario**, consulta la lista blanca de cuentas autorizadas y recupera el CSV de Google desde el servidor, de modo que evita el bloqueo CORS.
4. Configura `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `config.js`, usando solo la clave pública, nunca la clave secreta.
5. Publica la carpeta en un servidor HTTPS (o ábrela en localhost). Ángel y Micaela iniciarán sesión con sus cuentas y verán el mismo libro. Si ambos sincronizan la misma respuesta, la llave `source_key` evita la duplicación en la base de datos.

Si la función Edge todavía no está desplegada, la web intentará la URL CSV directa, pero la consulta puede fallar por las restricciones del navegador. Para operación confiable y compartida **debes desplegar la función Edge**.

**Sincronización:** la consulta automática ocurre solo cuando la página está abierta (o al volver a abrirla). No es una tarea de servidor programada. Para una recepción totalmente automática cuando todos estén desconectados se requeriría implementar un trigger/webhook seguro de Forms o un cron externo.

## 4. Qué saldos cambian (ejemplos)

| Movimiento enviado | Pagado por | Saldo afectado | Consecuencia |
|---|---|---|---|
| Egreso S/ 198,00 — Polos Piqué | IMVICTO | IMVICTO | La tarjeta **− S/ 198,00** |
| Egreso S/ 27,40 — Chilis | Micaela | Micaela | Micaela **− S/ 27,40** |
| Egreso S/ 51,40 — Chilis | Ángel | Ángel | Ángel **− S/ 51,40** |
| Ingreso S/ 100,00 — Reembolso | IMVICTO | IMVICTO | Tarjeta **+ S/ 100,00** |
| Egreso S/ 80,00 — Compra compartida | A y M | A y M | Ángel **− S/ 40,00**, Micaela **− S/ 40,00** |

**Pagado por** se registra a efectos informativos. **Saldo afectado** es el campo que determina matemáticamente qué cuenta cambia. Si pagas con la tarjeta física empresarial, por regla general selecciona `IMVICTO` en ambos campos. Si también debe reducir el saldo personal de uno de ustedes, se puede registrar un ajuste adicional y conciliar ambos movimientos de manera separada.

## 5. Resolución de problemas

- **HTTP 404 en /api/forms-csv:** abriste con Live Server. Usa `node server.mjs`.
- **No llega el movimiento:** abre el enlace CSV y comprueba que incluya el nuevo registro; es posible que Google todavía no haya publicado el cambio.
- **Fila descartada:** revisa las opciones del formulario (especialmente `Saldo afectado`), el formato de fecha y el importe. Se informa cuántas filas fueron omitidas; las causas detalladas aparecen en la consola (F12).
- **Cloud: migración pendiente:** ejecuta `migracion_google_forms.sql` en la misma base Supabase que utiliza la web.
- **CSV CORS o falla de red:** utiliza servidor Node o despliega la función Edge. La importación manual no necesita acceso directo del navegador a Google.
- **No quieres hacer público el libro:** deja de publicarlo en Google; la sincronización con el CSV publicado dejará de funcionar. Después podemos implementar el conector privado.
- **Respuestas viejas:** si se cargan por primera vez todas las respuestas históricas, también se suman a los saldos. Revisa que no hayas agregado manualmente los mismos gastos: una transacción manual idéntica no es reconocida automáticamente como duplicada del formulario.

## Actualización V3 — corrección y eliminación en IMVICTO

**Esta versión reemplaza la restricción de solo lectura explicada más arriba.** Ahora los movimientos importados de Google Forms pueden **editarse** y **eliminarse** desde la web, sin tocar las respuestas de Google Sheets. Las correcciones manuales tienen prioridad sobre futuras sincronizaciones. Una eliminación se conserva como registro oculto para que la respuesta no reaparezca y deja de afectar cualquier saldo. El botón **Eliminados (N)** permite restaurarlos.

Para Supabase es **imprescindible ejecutar `migracion_edicion_google_forms_v3.sql` después de las migraciones anteriores**. En modo local basta actualizar los archivos sin borrar los datos del navegador. Lee `CAMBIOS_V3.md` para instrucciones detalladas.
