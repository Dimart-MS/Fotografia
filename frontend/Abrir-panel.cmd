@echo off
setlocal
title Luz y Memoria - Panel
cd /d "%~dp0"
where npm.cmd >nul 2>nul || goto :node_error
if not exist "node_modules\.bin\vite.cmd" (
    echo Preparando el panel. La primera vez puede tardar unos minutos...
    call npm.cmd ci || goto :error
)
call npm.cmd run dev -- --open || goto :error
exit /b 0
:node_error
echo Instala Node.js 24 con npm y vuelve a abrir este archivo.
:error
echo Revisa el mensaje anterior y la seccion de ayuda del README.
pause
exit /b 1
