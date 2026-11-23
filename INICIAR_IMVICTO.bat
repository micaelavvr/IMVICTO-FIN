@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Se requiere Node.js 18 o superior para sincronizar Google Forms.
 echo Puedes instalarlo desde https://nodejs.org/
 pause
 exit /b 1
)
echo Abre esta direccion en tu navegador: http://127.0.0.1:3000
echo Mantén esta ventana abierta mientras uses IMVICTO.
start "" "http://127.0.0.1:3000"
node server.mjs
pause
