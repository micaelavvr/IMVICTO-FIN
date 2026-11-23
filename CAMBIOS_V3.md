# IMVICTO CORP V3 — editar y eliminar movimientos de Google Forms

## Cambios

En **Ingresos y egresos**, los registros de **Google Form** ya tienen los mismos botones de **lápiz (Editar)** y **papelera (Eliminar)** que los movimientos manuales.

- **Editar:** se puede corregir fecha, tipo, concepto, monto, quién pagó o recibió, y saldo afectado. Al guardar, los saldos y reportes se recalculan.
- **Eliminar:** el movimiento deja de aparecer en el libro activo y deja de sumar/restar en todos los saldos, indicadores, gráficos y reportes. Se conserva un registro de eliminación para que Google Forms **no lo vuelva a importar**.
- **Restaurar:** desde el botón **Eliminados (N)** de la pantalla de movimientos; el registro vuelve a aparecer y afectar el saldo, sin duplicarse.
- **Sincronizar:** los movimientos nuevos del Form siguen entrando normalmente. Si corriges o eliminas uno desde IMVICTO, la sincronización posterior **no sobrescribe** esa decisión. Los movimientos del Form que nunca hayas editado sí pueden actualizarse cuando cambien en la hoja original.
- **Google Sheets:** las ediciones y eliminaciones realizadas en IMVICTO **NO modifican** el formulario ni sus respuestas originales. Esto evita que una corrección local altere directamente la fuente histórica.

## Instalar desde la versión 2 conservando tus datos

1. **Primero descarga un respaldo JSON** desde Configuración → Descargar respaldo JSON; es recomendable antes de actualizar.
2. Descomprime `IMVICTO_CORP_WEB_V3_EDITABLE.zip` y utiliza la nueva carpeta completa (o reemplaza `app.js`, `form-sync.mjs`, `styles.css` y agrega la nueva migración). No borres los datos del navegador ni utilices **Borrar todos los registros locales**.
3. Si guardabas los datos en **este navegador** (aviso *Modo local*), ábrelo usando **el mismo navegador y dirección** (por ejemplo `http://127.0.0.1:3000`). Los registros guardados previamente bajo esa dirección se mantienen. `node server.mjs` inicia el mismo servidor que en la versión 2.
4. Si utilizas **Supabase con cuentas de Ángel y Micaela**, abre Supabase → **SQL Editor** y ejecuta el archivo `migracion_edicion_google_forms_v3.sql`. **Es obligatorio antes de utilizar la V3 en modo compartido**; conserva los datos existentes. Actualiza ambos dispositivos a esta versión.
5. En Visual Studio Code ejecuta `node server.mjs`, abre `http://127.0.0.1:3000` y prueba editando un gasto traído de Google Form. Después pulsa **Sincronizar Form** y confirma que tu corrección permanece.

**Importante:** si usas la V3 con Supabase pero no ejecutaste la migración, la edición y sincronización mostrarán errores de columnas o función inexistentes. No ejecutes la migración inicial `supabase.sql` como reemplazo de la v3, ni crees una base nueva si deseas conservar tus movimientos.

## Ejemplo de corrección

- Google Forms registró «Propina», egreso **S/ 5,00** en tarjeta IMVICTO.
- Al editar en la web puedes cambiarlo a **S/ 6,00** o indicar **Saldo de Ángel**.
- Se recalculan los saldos según el nuevo monto/destino.
- Aunque Google Sheets conserve la respuesta original de S/ 5,00, la web mostrará el valor corregido de S/ 6,00 hasta que lo vuelvas a editar.
- Si luego pulsas **Eliminar**, no afectará ningún saldo y quedará visible en la sección **Eliminados** para recuperación.

## Comprobación

Ejecuta `node --test tests/form-sync.test.mjs` para validar importación, deduplicación y prioridad de correcciones. La app sigue siendo JavaScript/HTML/CSS y no necesita instalar paquetes para ejecutarse.
