@echo off
REM Script di deployment per PenDrive - Windows
REM Eseguire dalla cartella del progetto Lovable

echo =====================================
echo   DEPLOYMENT APPLICAZIONE NAUTICA
echo   Su PenDrive - Versione Windows
echo =====================================

REM Verifica se siamo nella cartella corretta
if not exist "package.json" (
    echo ERRORE: Eseguire lo script dalla cartella del progetto!
    pause
    exit /b 1
)

REM Chiedi la lettera del drive
set /p DRIVE_LETTER="Inserisci la lettera del PenDrive (es. E): "
set DEPLOY_PATH=%DRIVE_LETTER%:\NauticalApp

echo.
echo Destinazione: %DEPLOY_PATH%
echo.

REM Verifica se il drive esiste
if not exist "%DRIVE_LETTER%:\" (
    echo ERRORE: Drive %DRIVE_LETTER%: non trovato!
    pause
    exit /b 1
)

echo [1/6] Creazione build produzione ottimizzata...
call npm run build
if errorlevel 1 (
    echo ERRORE: Build fallito!
    pause
    exit /b 1
)

echo [1.5/6] Verifica file generati...
if not exist "dist\index.html" (
    echo ERRORE: File index.html non trovato nella build!
    pause
    exit /b 1
)
if not exist "dist\index.js" (
    echo ATTENZIONE: File index.js non trovato, possibile problema CORS
)

echo [2/6] Creazione struttura cartelle...
mkdir "%DEPLOY_PATH%" 2>nul
mkdir "%DEPLOY_PATH%\charts" 2>nul
mkdir "%DEPLOY_PATH%\charts\mediterranean" 2>nul
mkdir "%DEPLOY_PATH%\charts\adriatic" 2>nul
mkdir "%DEPLOY_PATH%\cache" 2>nul
mkdir "%DEPLOY_PATH%\cache\tiles" 2>nul
mkdir "%DEPLOY_PATH%\data" 2>nul
mkdir "%DEPLOY_PATH%\tools" 2>nul

echo [3/6] Copia file applicazione...
xcopy /E /Y "dist\*" "%DEPLOY_PATH%\"

echo [4/6] Copia mappe CM93 esistenti...
if exist "public\charts\" (
    xcopy /E /Y "public\charts\*" "%DEPLOY_PATH%\charts\"
) else (
    echo ATTENZIONE: Cartella public\charts non trovata, creo esempi...
    mkdir "%DEPLOY_PATH%\charts\mediterranean\6\32" 2>nul
    mkdir "%DEPLOY_PATH%\charts\adriatic\8\132" 2>nul
    echo. > "%DEPLOY_PATH%\charts\README.txt"
    echo Posizionare qui le mappe CM93 nel formato: >> "%DEPLOY_PATH%\charts\README.txt"
    echo charts/[REGIONE]/[ZOOM]/[X]/[Y].png >> "%DEPLOY_PATH%\charts\README.txt"
)

echo [5/6] Creazione file di configurazione...

REM Cache manifest
echo { > "%DEPLOY_PATH%\cache\cache-manifest.json"
echo   "version": "1.0.0", >> "%DEPLOY_PATH%\cache\cache-manifest.json"
echo   "created": "%date% %time%", >> "%DEPLOY_PATH%\cache\cache-manifest.json"
echo   "regions": {}, >> "%DEPLOY_PATH%\cache\cache-manifest.json"
echo   "total_size_mb": 0 >> "%DEPLOY_PATH%\cache\cache-manifest.json"
echo } >> "%DEPLOY_PATH%\cache\cache-manifest.json"

REM File configurazione app
echo # Configurazione PenDrive > "%DEPLOY_PATH%\.env.local"
echo VITE_APP_MODE=offline >> "%DEPLOY_PATH%\.env.local"
echo VITE_CACHE_ENABLED=true >> "%DEPLOY_PATH%\.env.local"
echo VITE_CM93_ENABLED=true >> "%DEPLOY_PATH%\.env.local"

REM Dati iniziali vuoti
echo [] > "%DEPLOY_PATH%\data\waypoints.json"
echo [] > "%DEPLOY_PATH%\data\targets.json"
echo {} > "%DEPLOY_PATH%\data\settings.json"

echo [6/6] Copia tools e documentazione...
copy "ISTRUZIONI_MAPPE_CM93.md" "%DEPLOY_PATH%\tools\" 2>nul
copy "CONFIGURAZIONE_CACHE.md" "%DEPLOY_PATH%\tools\" 2>nul

REM Script utilities
echo @echo off > "%DEPLOY_PATH%\tools\clean-cache.bat"
echo echo Pulizia cache in corso... >> "%DEPLOY_PATH%\tools\clean-cache.bat"
echo del /Q /S "cache\tiles\*" 2^>nul >> "%DEPLOY_PATH%\tools\clean-cache.bat"
echo echo Cache pulita! >> "%DEPLOY_PATH%\tools\clean-cache.bat"
echo pause >> "%DEPLOY_PATH%\tools\clean-cache.bat"

echo.
echo =====================================
echo   DEPLOYMENT COMPLETATO!
echo =====================================
echo.
echo Percorso: %DEPLOY_PATH%
echo.
echo PROSSIMI PASSI:
echo 1. Aggiungere mappe CM93 in: %DEPLOY_PATH%\charts\
echo 2. Aprire index.html con browser
echo 3. Consultare documentazione in: %DEPLOY_PATH%\tools\
echo.
echo STRUTTURA CREATA:
echo ├── index.html (file principale)
echo ├── assets\ (file applicazione)  
echo ├── charts\ (mappe CM93)
echo ├── cache\ (cache offline)
echo ├── data\ (waypoints e targets)
echo └── tools\ (utilities e docs)
echo.
pause