@echo off
REM Windows batch file voor het starten van de Wasgeurtje Retail app

echo Wasgeurtje Retail App Starter
echo ------------------------------
echo.

REM Zorg ervoor dat we in de juiste directory zijn
echo Navigeren naar app directory: %~dp0
cd /d "%~dp0"

REM Toon huidige Node.js versie
node -v 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Waarschuwing: Node.js lijkt niet geïnstalleerd of niet in PATH
    echo Installeer Node.js van https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Controleer of .env.local bestaat
if exist .env.local (
    echo .env.local bestand gevonden
) else (
    echo Waarschuwing: .env.local bestand niet gevonden
    echo Mock credentials worden gebruikt voor development
    
    REM Maak .env.local aan met mock credentials
    echo NEXT_PUBLIC_SUPABASE_URL=https://mock-wasgeurtje-project.supabase.co> .env.local
    echo NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-credentials-for-development>> .env.local
    
    echo .env.local bestand aangemaakt met mock credentials
)

REM Start de app
echo.
echo De app starten...
echo De browser zal automatisch openen op http://localhost:3000
echo (of een andere poort als 3000 al in gebruik is)
echo.
echo Druk op Ctrl+C om de app te stoppen
echo.

REM Start npm run dev
npm run dev 