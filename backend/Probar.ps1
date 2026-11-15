$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$bundledPython = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
New-Item -ItemType Directory -Force artifacts | Out-Null
$testTemp = Join-Path $PSScriptRoot ('artifacts/test-' + [guid]::NewGuid().ToString('N'))
if ((Test-Path -LiteralPath '.deps/pytest') -and (Test-Path -LiteralPath $bundledPython)) {
    $env:PYTHONPATH = "$PSScriptRoot/.deps;$PSScriptRoot"
    & $bundledPython -m pytest tests -v "--basetemp=$testTemp" --junitxml=artifacts/pruebas.xml
} else {
    & '.venv/Scripts/python.exe' -m pytest tests -v "--basetemp=$testTemp" --junitxml=artifacts/pruebas.xml
}
exit $LASTEXITCODE
