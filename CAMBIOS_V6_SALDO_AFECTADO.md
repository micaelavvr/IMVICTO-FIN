# IMVICTO CORP V6 — «Saldo afectado» de Google Forms

Esta versión parte del código completo de V5, añade encabezados alternativos de la pregunta y una explicación visible. El importador de V5 ya respetaba la columna «Saldo afectado» y ahora hay pruebas explícitas para las tres cuentas. **No requiere cambios SQL.**

## Efecto de cada respuesta

| Tipo de movimiento | Saldo afectado | Efecto |
|---|---|---|
| Egreso | IMVICTO | Resta exclusivamente a tarjeta IMVICTO |
| Egreso | MICAELA | Resta exclusivamente a saldo de Micaela |
| Egreso | ANGEL | Resta exclusivamente a saldo de Ángel |
| Ingreso | Cualquiera | Suma exclusivamente al saldo indicado |

«Pagado por» identifica al pagador, pero no decide qué saldo se afecta. Si está seleccionado IMVICTO como pagador y MICAELA como saldo afectado, solo se resta a Micaela. 

Las respuestas se concilian por marca temporal. Cambiar «Saldo afectado» en Google Sheets puede actualizar el mismo movimiento si ese registro todavía no fue corregido o eliminado manualmente en IMVICTO. Los editados/eliminados manualmente conservan su corrección. Una respuesta sin cuenta reconocida se omite con advertencia, nunca se atribuye automáticamente a otra persona.

## Publicar en Netlify sin cambiar la conexión a Supabase

1. Desde la web actual de IMVICTO descarga un respaldo JSON y guárdalo fuera de la carpeta de publicación. No lo importes de nuevo por esta actualización.
2. Guarda una copia de tu **`PUBLICAR_WEB/config.js` actual que ya funciona** en una carpeta segura.
3. Extrae el ZIP completo V6. Su `IMVICTO_CORP_WEB/PUBLICAR_WEB/config.js` está vacío intencionalmente; no publiques esa versión sin configurarla.
4. **Copia tu `config.js` actual a la carpeta nueva `IMVICTO_CORP_WEB/PUBLICAR_WEB`, reemplazando el archivo vacío.** Debe contener la URL y la clave pública del Supabase que usas ahora. Nunca copies claves `service_role` o `secret` al navegador.
5. En Netlify, abre el sitio existente `imvicto-card` y publica la **carpeta completa** `PUBLICAR_WEB` de V6. No publiques archivos sueltos ni crees otro sitio.
6. Abre `https://imvicto-card.netlify.app/version.txt`: debe mostrar `IMVICTO CORP V6`. Inicia sesión y comprueba «Acceso compartido».
7. Ve a «Movimientos → Sincronizar Form». Prueba un egreso pequeño con saldo afectado MICAELA o ANGEL. Verifica que solo cambió ese saldo. Elimina el egreso de prueba desde IMVICTO si no debe quedar en los libros; se conservará como eliminado lógico para impedir reimportaciones.

## Configurar el Google Form

En la pregunta «Saldo afectado», utiliza **Opción múltiple**, opciones `IMVICTO`, `MICAELA`, `ANGEL`, y activa **Obligatorio**. Comprueba en la hoja de respuestas que exista una columna «Saldo afectado» y que las nuevas respuestas contengan la opción elegida. La publicación de Google Sheets como CSV puede tardar en reflejar cambios. No podemos modificar directamente el Form desde este proyecto.

**No ejecutes SQL ni reemplaces los datos existentes en Supabase para esta versión.**
