@echo off
echo Avvio server locale per l'applicazione nautica...
echo.
echo L'applicazione sarà disponibile su: http://localhost:3000
echo Premi Ctrl+C per fermare il server
echo.

cd dist
python -m http.server 3000 2>nul || (
    echo Python non trovato, provo con Node.js...
    npx http-server -p 3000 -c-1 2>nul || (
        echo.
        echo ERRORE: Ne Python ne Node.js sono installati.
        echo Installa uno dei due per usare il server locale.
        echo.
        echo Alternative:
        echo 1. Installa Python: https://python.org
        echo 2. Installa Node.js: https://nodejs.org
        echo.
        pause
        exit /b 1
    )
)