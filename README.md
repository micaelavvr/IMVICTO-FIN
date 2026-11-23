# IMVICTO CORP V5 — Finanzas compartidas

**Si ya utilizas IMVICTO en Netlify y Supabase, LEE PRIMERO `ACTUALIZACION_SEGURA_V5.md`.** No vuelvas a ejecutar el instalador original: en tu proyecto existente sólo debes ejecutar `MIGRACION_V5_NEGATIVOS_USD.sql` y actualizar `PUBLICAR_WEB`.

## Qué incluye V5

- Ventas con ingreso líquido **negativo permitido**, incluidas comisiones negativas 60/40 y 50/50. Se muestra una advertencia sin bloquear el guardado.
- Gastos fijos con selección **PEN / USD**, monto original en la moneda escogida, tipo de cambio base y tipo de cambio modificable **por mes**. Los resúmenes y pagos reales siempre son en soles.
- Cierre de sesión accesible desde la barra superior o Configuración. Cierra la sesión actual en Supabase, borra datos financieros de la memoria de la vista y avisa a las otras pestañas del mismo sitio, pero no borra respaldos JSON ni otras sesiones de distintos dispositivos.
- Protección de la web pública: si se publica sin claves públicas de Supabase, se bloquea el modo local para evitar registros desconectados.
- Historial mensual desplegable, Google Forms, exportaciones CSV, calendario, ventas, comisiones y reportes conservados de V4.

## Archivos principales

- `MIGRACION_V5_NEGATIVOS_USD.sql`: para actualizar tu proyecto REAL, **no elimina registros**.
- `ACTUALIZACION_SEGURA_V5.md`: guía de actualización sin perder ventas.
- `INSTALAR_TODO_SUPABASE.sql`: sólo para **base completamente nueva**. No ejecutar en el proyecto actual.
- `PUBLICAR_WEB/`: subir completo a Netlify, tras configurar allí las credenciales públicas.
- `app.js`, `fixed-expenses.mjs`, `styles.css`, `form-sync.mjs`, `index.html`: código fuente.
- `tests/`: pruebas con Node.js, ejecutables con `node --test tests/*.mjs`.

# IMVICTO CORP V4 — Panel financiero y calendario de gastos fijos

**Comienza aquí:** `GUIA_SUPABASE_PASO_A_PASO.md`. Incluye los pasos desde el dashboard de Supabase y explica cómo publicar el frontend para que Ángel y Micaela ingresen desde distintos dispositivos.

## Iniciar en Visual Studio Code

1. Abrir carpeta `IMVICTO_CORP_WEB`.
2. Abrir la terminal integrada (Ctrl+ñ o Terminal → New Terminal).
3. Ejecutar `node server.mjs` (Node.js 18 o superior). Alternativa Windows: doble clic en `INICIAR_IMVICTO.bat`.
4. Abrir `http://127.0.0.1:3000/`.

La web funciona en **modo local** si `SUPABASE_URL` y `SUPABASE_ANON_KEY` están vacíos en `config.js`. Los datos se guardan en localStorage y sólo están disponibles en ese navegador/origen.

## Novedades V4

- **Gastos fijos:** calendario mensual navy y dorado, cuotas editables, vencimientos, previsión y estados de pago; accesos rápidos para Pago Oficina, Rappi Mensual, Equifax y ChatGPT empresarial. *No se preasignan montos reales*.
- **Variación de cuota:** monto de referencia editable y excepción por mes; la programación nunca descuenta saldo sin registrar un egreso real.
- **Evitar duplicidad:** `Vincular gasto` asocia un egreso ya cargado en Movimientos (manual o Google Forms) en vez de crearlo otra vez.
- **Historial plegable:** movimientos agrupados por mes con total de ingresos y egresos, expandibles.
- **Exportaciones:** cada mes puede exportarse a CSV con ventas, comisiones y movimientos; el calendario tiene exportación mensual de presupuestos.
- **Acceso compartido:** las cuentas se conectan a las tablas nuevas `fixed_expenses` y `fixed_expense_overrides` mediante Supabase, protegidas por RLS.
- **Migración de modo local al proyecto nuevo:** Configuración → Descargar respaldo JSON (modo local) y luego Importar datos locales al iniciar (modo compartido, inicialmente vacío). Mantener siempre una copia fuera del navegador.

## Archivos principales

| Archivo | Uso |
|---|---|
| `app.js`, `fixed-expenses.mjs`, `form-sync.mjs` | Lógica de la web |
| `styles.css`, `index.html`, `assets/` | Interfaz navy/dorado con logotipo |
| `config.js` | URL y clave pública Supabase |
| `INSTALAR_TODO_SUPABASE.sql` | **Base inicial**, una sola consulta en un proyecto nuevo |
| `migracion_gastos_fijos_v4.sql` | Solo para un proyecto Supabase V3 ya configurado |
| `supabase/functions/google-form-csv/index.ts` | Edge Function para leer la hoja publicada |
| `PUBLICAR_WEB/` | Solo el frontend estático para alojar la web en Netlify/Cloudflare Pages |
| `GUIA_SUPABASE_PASO_A_PASO.md` | Instrucciones completas y aspectos de seguridad |
| `tests/` | Pruebas automatizadas (`node --test tests/*.mjs`) |

Los saldos no se calculan sobre cuotas proyectadas: sólo cambian tras operaciones reales de ventas/movimientos. La app no sustituye los estados de cuenta bancarios ni los libros exigidos por SUNAT.
