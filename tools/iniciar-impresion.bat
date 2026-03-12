@echo off
title Servidor de Impresion - Electromecanica JR
color 0A
echo.
echo ==========================================
echo   Servidor de Impresion - Electromecanica JR
echo ==========================================
echo.

:: Ir al directorio donde esta este archivo
cd /d "%~dp0"

:: Verificar si Node.js esta instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    echo Descargalo en: https://nodejs.org
    pause
    exit /b 1
)

:: Instalar dependencias si no existen
if not exist "node_modules" (
    echo Instalando dependencias por primera vez...
    npm install
    echo.
)

echo Iniciando servidor de impresion...
echo Mantén esta ventana abierta mientras usas la app.
echo.
node print-server.js

pause
