# PowerShell script voor het starten van de Wasgeurtje Retail app
# Dit script werkt op alle PowerShell versies, inclusief Windows PowerShell en PowerShell Core

Write-Host "Wasgeurtje Retail App Starter" -ForegroundColor Cyan
Write-Host "------------------------------" -ForegroundColor Cyan
Write-Host ""

# Zorg ervoor dat we in de juiste directory zijn
$appPath = "$PSScriptRoot"
Write-Host "Navigeren naar app directory: $appPath" -ForegroundColor Yellow
Set-Location -Path $appPath

# Toon huidige Node.js versie
try {
    $nodeVersion = node -v
    Write-Host "Node.js versie: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Waarschuwing: Node.js lijkt niet geïnstalleerd of niet in PATH" -ForegroundColor Red
    Write-Host "Installeer Node.js van https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Controleer of .env.local bestaat
if (Test-Path -Path ".env.local") {
    Write-Host ".env.local bestand gevonden" -ForegroundColor Green
} else {
    Write-Host "Waarschuwing: .env.local bestand niet gevonden" -ForegroundColor Yellow
    Write-Host "Mock credentials worden gebruikt voor development" -ForegroundColor Yellow
    
    # Maak .env.local aan met mock credentials
    @"
NEXT_PUBLIC_SUPABASE_URL=https://mock-wasgeurtje-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
"@ | Out-File -FilePath ".env.local" -Encoding utf8
    
    Write-Host ".env.local bestand aangemaakt met mock credentials" -ForegroundColor Green
}

# Start de app
Write-Host ""
Write-Host "De app starten..." -ForegroundColor Cyan
Write-Host "De browser zal automatisch openen op http://localhost:3000" -ForegroundColor Yellow
Write-Host "(of een andere poort als 3000 al in gebruik is)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Druk op Ctrl+C om de app te stoppen" -ForegroundColor Yellow
Write-Host ""

# Start npm run dev
npm run dev 