# IMVICTO CORP V5 — ACTUALIZACIÓN SEGURA (proyecto Supabase existente)

**Esta V5 modifica la aplicación anterior; no crea una base nueva ni requiere volver a importar datos.**

## Antes de cambiar nada

1. En `https://imvicto-card.netlify.app` entra con un usuario autorizado.
2. En **Configuración → Descargar respaldo JSON**, descarga una copia de las ventas, movimientos, parámetros y gastos fijos actuales.
3. Guarda el JSON **fuera de la carpeta que subirás a Netlify**, en un lugar privado. No compartas el respaldo públicamente.
4. Si ambos tienen transacciones recientes, verifica que están sincronizadas antes de hacer la exportación. Conserva también el respaldo anterior de Ángel.

## Paso 1 — Supabase (obligatorio ANTES de publicar)

1. Abre tu proyecto existente **IMVICTO FINANZAS** en Supabase.
2. Ve a **SQL Editor → New query**.
3. En Visual Studio Code abre `MIGRACION_V5_NEGATIVOS_USD.sql`, copia todo su contenido y pégalo en SQL Editor.
4. Haz clic en **Run**. Debe completarse sin errores.
5. **No ejecutes** `INSTALAR_TODO_SUPABASE.sql` en el proyecto ya configurado y **no elimines** ninguna tabla ni usuario.

¿Qué hace la migración? Quita la antigua prohibición de ingreso líquido negativo y añade a `fixed_expenses` los campos `currency` y `exchange_rate`, y a `fixed_expense_overrides` el campo `exchange_rate`. Los registros anteriores conservan moneda **PEN** y tipo de cambio **1**. No realiza un `DELETE`, `TRUNCATE` ni `DROP TABLE`.

## Paso 2 — Actualizar los archivos web

Dentro de esta versión abre `PUBLICAR_WEB/config.js` y completa **solo**:

```js
SUPABASE_URL: 'https://TU-ID.supabase.co',
SUPABASE_ANON_KEY: 'sb_publishable_TU_CLAVE',
```

Copia **exactamente** esos dos valores desde el archivo `PUBLICAR_WEB/config.js` que YA FUNCIONA en tu V4, o desde `config.js` del proyecto V4 que habías configurado. **No copies** ni publiques `service_role`, `sb_secret` ni la contraseña de Supabase. El archivo V5 también contiene los enlaces existentes de Google Forms y Sheets; consérvalos.

La carpeta `PUBLICAR_WEB` de esta versión contiene: `index.html`, `app.js`, `styles.css`, `config.js`, `form-sync.mjs`, `fixed-expenses.mjs`, `assets/`.

Si abres `config.js` y las dos credenciales siguen vacías, **no publiques todavía**. La versión publicable V5 ahora bloquea el modo local si falta configuración, precisamente para evitar que Ángel y Micaela terminen guardando registros separados.

## Paso 3 — Actualizar el sitio EXISTENTE en Netlify

1. Entra a Netlify y abre el sitio existente `imvicto-card`.
2. Ve a **Deploys** o al recuadro **Already built it?** del proyecto.
3. Arrastra la carpeta completa **PUBLICAR_WEB** ya configurada (o un ZIP creado a partir de su contenido).
4. Espera a ver el nuevo despliegue con estado publicado.
5. Abre `https://imvicto-card.netlify.app` y pulsa `Ctrl + Shift + R`.

**No hagas un sitio nuevo, no cambies el dominio y no subas el respaldo JSON, archivos SQL ni archivos `copy.js`.**

## Paso 4 — Comprobaciones funcionales

1. El panel debe mostrar **Acceso compartido**, no **Modo local**. Ambos usuarios pueden utilizar sus cuentas autorizadas habituales.
2. Comprueba que las ventas, movimientos y saldos que había antes siguen intactos.
3. En **Ventas**, registra una venta con ingreso neto menor que utilidad + pago vendedor. Debe mostrar una advertencia, **pero permitir guardar** y descontar ambas comisiones según 60/40 o 50/50.
4. En **Gastos fijos**, crea o edita una programación; selecciona **USD** y un TC, por ejemplo USD 20 × TC 3.7600 = S/ 75.20. Puedes usar el icono de ajuste para cambiar TC y monto solo de un mes. La previsión **no** resta automáticamente saldo.
5. Cuando pagues, registra el egreso real en **S/** o vincula un movimiento de Forms que ya existe, para no duplicar el gasto.
6. Pulsa **Cerrar sesión** en el encabezado; debe regresar al login. Una pestaña adicional de la misma página debe cerrarse también. Esto no expulsa automáticamente a otro usuario en otro dispositivo.

## Notas de moneda e histórico

- Cada regla de gasto fija tiene su moneda base (PEN o USD). El tipo de cambio ingresado manualmente es un **supuesto de presupuesto**, no una cotización bancaria automática.
- La modificación de TC por mes almacena ese TC en `fixed_expense_overrides`; otros meses conservan la tasa base o su propio ajuste.
- Los pagos reales se guardan en **PEN** en `movements.amount` y siguen siendo editables. Ninguna modificación del TC reescribe o recalcula importes bancarios ya pagados.
- Si editas la **moneda base** de una regla que ya tiene excepciones históricas, revisa sus meses anteriores: las excepciones siguen expresadas en la moneda actual de esa misma regla. Para evitar reexpresar historial, normalmente conviene desactivar la regla antigua y crear una regla nueva en la moneda nueva.
- No hagas una importación JSON sobre una base compartida con datos existentes; eso puede producir duplicados. Aquí **no hace falta importar** ningún respaldo para actualizar.

## Solución de problemas

- **Modo local**: comprueba que estás usando la carpeta `PUBLICAR_WEB` correcta y que `config.js` tiene las claves públicas.
- **Falta migración / columna currency no existe**: ejecuta `MIGRACION_V5_NEGATIVOS_USD.sql` antes de probar gastos fijos.
- **Error `liquid_non_negative`**: repite la migración en SQL Editor.
- **Clic en logout sin volver al login**: actualiza con `Ctrl + Shift + R` y verifica que el archivo `app.js` publicado sea V5.

Pruebas de cálculo y sincronización: `node --test tests/*.mjs`.
