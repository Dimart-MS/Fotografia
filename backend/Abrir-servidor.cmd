@echo off
setlocal
title Luz y Memoria - Servidor
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Preparando Python para el estudio...
    python -m venv .venv || goto :python_error
)
echo Comprobando los componentes del servidor...
".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -r requirements.txt || goto :error
".venv\Scripts\python.exe" run_local.py || goto :error
exit /b 0
:python_error
echo Instala Python 3.13 de 64 bits, marca Add python.exe to PATH y vuelve a abrir este archivo.
:error
echo Revisa el mensaje anterior y la seccion de ayuda del README.
pause
exit /b 1
