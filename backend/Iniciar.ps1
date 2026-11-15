$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$bundledPython = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
if ((Test-Path -LiteralPath '.deps/fastapi') -and (Test-Path -LiteralPath $bundledPython)) {
    & $bundledPython run_local.py
} elseif (Test-Path -LiteralPath '.venv/Scripts/python.exe') {
    & '.venv/Scripts/python.exe' run_local.py
} else {
    Write-Host 'Instala Python 3.12 y ejecuta: python -m venv .venv'
    Write-Host 'Luego: .venv/Scripts/python -m pip install -r requirements.txt'
    Write-Host 'Para la interfaz: cd ../frontend; npm ci'
    exit 1
}
