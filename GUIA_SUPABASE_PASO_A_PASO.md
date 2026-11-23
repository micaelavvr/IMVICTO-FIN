# IMVICTO CORP V4 — Configuración de Supabase y publicación de la web

## Lo primero: Supabase no aloja esta página estática

Supabase gestiona la **base de datos**, el **inicio de sesión** y la **función que consulta Google Sheets**. La web HTML/CSS/JS se publica por separado en un hosting estático (por ejemplo Netlify o Cloudflare Pages). El ZIP incluye una carpeta `PUBLICAR_WEB` lista para ese fin **después de completar config.js**.

## A. Si ya trabajabas en modo local, haz un respaldo ANTES del cambio

1. Abre la web V3/V4 en el MISMO navegador, mismo sitio y puerto con el que guardaste registros. No borres los datos del navegador.
2. En Configuración → **Descargar respaldo JSON**. Guárdalo fuera de la carpeta de la aplicación, por seguridad.
3. Cuando termines de configurar Supabase e iniciar sesión, podrás importar ese respaldo en Configuración → **Importar datos locales al iniciar**, siempre que el proyecto compartido aún no tenga ventas ni movimientos manuales ni gastos recurrentes. Las respuestas de Google Forms se importan automáticamente desde Google Sheets y no se duplican.
4. No introduzcas datos nuevos en dos bases de datos separadas durante el proceso de migración.

## B. Crear el proyecto en Supabase (tu captura muestra la pantalla correcta)

1. Abre https://supabase.com/dashboard y selecciona la organización **IMVICTOCORP** que aparece en tu pantalla.
2. Haz clic en **+ New project**.
3. Escribe, por ejemplo, nombre `IMVICTO FINANZAS`; genera y conserva la contraseña de base de datos en un gestor de contraseñas. Elige una región apropiada y el plan que te corresponda.
4. Pulsa **Create new project**. Cuando se habilite el panel del proyecto, entra.

## C. Crear todas las tablas y reglas de seguridad

1. Dentro del PROYECTO, no de la organización, entra a **SQL Editor → New query**.
2. En Visual Studio Code abre `INSTALAR_TODO_SUPABASE.sql` y copia su contenido completo.
3. **Antes de ejecutar**, busca los correos `micaela@ejemplo.com` y `angel@ejemplo.com` (están al final del bloque `supabase.sql`) y reemplázalos por los **dos correos reales en minúsculas**, que usarán en el inicio de sesión. No uses aquí la contraseña.
4. Pega el SQL completo en el editor y pulsa **Run**. El archivo crea tablas de ventas, movimientos, configuraciones, lista de usuarios permitidos, formularios, gastos fijos, excepciones mensuales y políticas RLS.
5. Comprueba en **Table Editor** que aparecen `allowed_users`, `sales`, `movements`, `settings`, `fixed_expenses` y `fixed_expense_overrides`.

Si **ya configuraste V3** en un proyecto anterior, NO vuelvas a ejecutar toda la instalación: corre únicamente `migracion_gastos_fijos_v4.sql`.

Para corregir los correos de la lista de acceso más adelante:

```sql
insert into public.allowed_users (email, display_name) values
 ('CORREO_REAL_MICAELA', 'Micaela'),
 ('CORREO_REAL_ANGEL', 'Ángel')
on conflict (email) do update set display_name=excluded.display_name;

delete from public.allowed_users where email in ('micaela@ejemplo.com', 'angel@ejemplo.com');
```

**Importante:** sustituye los textos `CORREO_REAL_*` por las direcciones reales (minúsculas). Sólo estar en `allowed_users` no crea una cuenta con contraseña.

## D. Crear el acceso de Ángel y Micaela

1. En Supabase abre **Authentication → Users → Add user**.
2. Si aparece **Create new user**, crea cada una de las dos cuentas con sus correos y contraseñas iniciales. Si optas por **Send invitation**, necesitarás el flujo de aceptación del correo y configuración de contraseña (revisa la URL de redirección en **Authentication → URL Configuration**).
3. Cada cuenta debe tener el MISMO correo que registraste en `allowed_users` (ignorando mayúsculas/minúsculas).
4. No habilites registro público si no lo necesitas.

## E. Copiar la URL y clave pública en config.js

1. Ve a **Project Settings → API Keys**, o al panel **Connect** del proyecto.
2. Copia **Project URL**, por ejemplo `https://abcdefgh.supabase.co`, y la **Publishable key** que empieza por `sb_publishable_` (o la `anon` legacy si tu proyecto usa la clave anterior).
3. En VS Code abre el archivo raíz `config.js` y completa los dos primeros campos:

```js
window.IMVICTO_CONFIG = {
  SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_TU_CLAVE_PUBLICA",
  GOOGLE_FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLSd6_clyLZl9xEe6_s4utDmIxz2cBRD2z6JHNhUoPN2dEvxIbA/viewform?usp=dialog",
  GOOGLE_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7CeuW9MnqkIs_tBOL03xSTBX7mvzV_uydrc1Syi2VmYTb06T3z3_6Rkh9Hu42A9tkBjxsg-LdwHQV/pub?output=csv"
};
```

El nombre `SUPABASE_ANON_KEY` se conserva por compatibilidad con versiones anteriores, pero aquí acepta la **nueva clave publishable**. **Nunca uses `sb_secret_`, `service_role` ni la contraseña de la base de datos** en JavaScript público.

## F. Activar sincronización de Google Forms

1. Supabase → **Edge Functions → Deploy a new function → Via Editor**.
2. Asigna el nombre exacto `google-form-csv`.
3. Copia el contenido de `supabase/functions/google-form-csv/index.ts` y pégalo en el editor de la función.
4. Despliega con **Deploy function**. Mantén la protección JWT predeterminada activada; esta función sólo debe aceptar usuarios identificados.
5. Si el formulario ya tiene respuestas, la app buscará movimientos en la tabla publicada. El botón **Sincronizar Form** permite forzar una actualización.

**Privacidad:** la hoja `pub?output=csv` que proporcionaste está publicada, por lo que el enlace CSV se puede leer desde fuera de IMVICTO. Supabase protege las tablas, **no hace privada la hoja pública**. Si los datos son confidenciales, será necesario cambiar la fuente por una integración autenticada y dejar de publicarla.

## G. Probar en Visual Studio Code

1. Guarda `config.js`. Si la web está abierta, actualiza la pestaña.
2. En terminal ejecuta `node server.mjs` y abre `http://127.0.0.1:3000/` (alternativamente `INICIAR_IMVICTO.bat` en Windows). No necesitas npm.
3. Debe aparecer **Iniciar sesión**, NO «Modo local». Inicia sesión con la primera cuenta.
4. Abre en otro navegador o dispositivo publicado el mismo panel con la segunda cuenta. Agrega una operación de prueba; ambos deberían ver el cambio.
5. Desde **Gastos fijos**, añade un concepto real con importe y vencimiento. Comprueba que se refleja como **pendiente** y aún no afecta al dinero. Regístralo como egreso o **Vincular gasto** a un movimiento que ya exista (por ejemplo importado desde Forms).
6. Comprueba en **Movimientos** que cada mes es desplegable y tiene **Exportar mes**. En **Reportes** también tienes **Exportar mes actual**.

## H. Migrar saldos y datos anteriores

1. Antes del cambio: en modo local, **Configuración → Descargar respaldo JSON**.
2. Después de conectar e iniciar sesión en el proyecto nuevo: **Configuración → Importar datos locales al iniciar**. Selecciona el respaldo.
3. Se importan las ventas, los movimientos manuales, el calendario y los saldos iniciales. Los movimientos del formulario se recuperan de Google Sheets, sin copiarlos por segunda vez del respaldo. Si tenías pagos de Forms vinculados a gastos fijos locales, tendrás que volver a vincularlos después.
4. **Precaución**: el importador requiere un proyecto compartido sin operaciones manuales previas; no mezcles bases ni repitas importaciones. Conserva el respaldo externo. Una interrupción durante la importación puede dejar una carga parcial que requiera revisión antes de continuar.

## I. Publicar la web (para abrir desde celular o cualquier PC)

**Supabase no sirve automáticamente `index.html`: falta publicar el frontend.**

1. Abre la carpeta `PUBLICAR_WEB` del proyecto. Contiene únicamente los archivos estáticos que necesitas para el hosting.
2. Edita también `PUBLICAR_WEB/config.js` y copia los mismos valores públicos configurados en el `config.js` raíz (los dos ficheros son independientes).
3. En Netlify, crea un sitio nuevo y arrastra el contenido de `PUBLICAR_WEB`, o sigue el flujo de **Deploy manually**. También puedes usar Cloudflare Pages para un proyecto estático.
4. Obtendrás una dirección pública `https://...` para compartir entre Ángel y Micaela. La página web será pública como URL, pero el contenido financiero exige inicio de sesión de una cuenta autorizada y usa RLS en Supabase.
5. En Supabase **Authentication → URL Configuration**, registra la URL final de la web como Site URL y, si usas invitaciones o correos de recuperación, configura correctamente los redireccionamientos permitidos.

No subas el ZIP completo con archivos `.sql`, respaldos o datos privados a la carpeta pública de tu hosting. Usa sólo `PUBLICAR_WEB`.

## J. Cómo operar el calendario

- **Nuevo gasto fijo**: concepto, monto habitual (S/), día de vencimiento, primer mes, último mes opcional, pagador y cuenta.
- **Ajustar monto**: cambia sólo el mes visible; el valor regular de otros meses no cambia.
- **Editar**: cambia la regla recurrente. El importe real de movimientos ya registrados no se modifica.
- **Pagar**: crea UN egreso real y descuenta el saldo elegido.
- **Vincular gasto**: busca un egreso ya existente del mes, incluso si vino de Forms; marca pagado sin generar otro egreso.
- **Desvincular**: revierte el vínculo de calendario, pero no borra el egreso del libro.
- **Exportar previsión**: descarga el calendario proyectado en CSV.
- **Exportar mes**: descarga un cierre con ventas, comisiones, movimientos y gastos fijos previstos.

## Comprobaciones y límites

- No se ha conectado a tu proyecto de Supabase: **todavía necesitas crear el proyecto y ejecutar los pasos anteriores**.
- Puedes probar localmente antes de configurarlo; ese modo guarda información sólo en el navegador.
- Las proyecciones son operativas, no cargos bancarios reales ni comprobantes SUNAT.
- Para contabilidad y auditoría formales, sería recomendable añadir historial inmutable de cambios y cierre mensual bloqueado, además de conciliación bancaria.

Documentación oficial: https://supabase.com/docs/guides/getting-started/api-keys · https://supabase.com/docs/guides/auth/users · https://supabase.com/docs/guides/functions/quickstart-dashboard
