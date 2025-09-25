#!/usr/bin/env node

// CommonJS script per compatibilità con progetti ES module
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building standalone nautical application...');

// Build the application first
console.log('Step 1: Building application...');
try {
    execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
}

console.log('Step 2: Creating standalone version...');

// Read the built files
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');
const jsFiles = fs.readdirSync(distPath).filter(file => file.endsWith('.js'));
const cssFiles = fs.readdirSync(distPath).filter(file => file.endsWith('.css'));

// Inline CSS
let allCSS = '';
cssFiles.forEach(cssFile => {
    const cssContent = fs.readFileSync(path.join(distPath, cssFile), 'utf8');
    allCSS += cssContent + '\n';
});

// Inline JavaScript
let allJS = '';
jsFiles.forEach(jsFile => {
    const jsContent = fs.readFileSync(path.join(distPath, jsFile), 'utf8');
    allJS += jsContent + '\n';
});

// Create complete HTML from scratch instead of using template
const standaloneTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sistema di Navigazione Nautica - Versione Standalone</title>
    <meta name="description" content="Applicazione nautica offline per la gestione di waypoint, target virtuali, tracce e misurazione di rotte su mappe nautiche" />
    
    <!-- Service Worker for local file handling -->
    <script>
        // Register service worker to handle local file requests (only for HTTP/HTTPS)
        if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
            navigator.serviceWorker.register('./local-server-sw.js').then(function(registration) {
                console.log('✅ Service Worker attivo - Supporto completo per mappe nautiche');
            }).catch(function(error) {
                console.log('⚠️ Service Worker non disponibile - Usando modalità fallback');
            });
        }
    </script>
    
    <style>
${allCSS}
    </style>
</head>
<body>
    <div id="root"></div>
    
    <!-- Local Chart Handler -->
    <script>
        // Sistema di gestione mappe nautiche per applicazione standalone
        class NauticalChartHandler {
            constructor() {
                this.init();
            }
            
            init() {
                console.log('🚢 Avvio Sistema di Navigazione Nautica - Versione Standalone');
                console.log('📍 Modalità completamente offline attivata');
                
                // Setup chart handling immediately
                this.setupChartHandling();
                
                // Initialize service worker only if available
                if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
                    this.initServiceWorker();
                } else {
                    console.log('🗂️ Modalità file locale - Generazione automatica mappe placeholder');
                }
            }
            
            async initServiceWorker() {
                try {
                    await navigator.serviceWorker.register('./local-server-sw.js');
                    console.log('⚓ Service Worker attivo per gestione avanzata mappe');
                } catch (error) {
                    console.log('📋 Service Worker non disponibile - Continuando con modalità base');
                }
            }
            
            setupChartHandling() {
                // Override fetch for chart requests
                const originalFetch = window.fetch;
                window.fetch = async function(resource, options) {
                    // Handle chart tile requests
                    if (typeof resource === 'string' && resource.includes('/charts/')) {
                        try {
                            // First try to load actual chart if available
                            const response = await originalFetch.apply(this, arguments);
                            if (response.ok) return response;
                        } catch (e) {
                            // Chart not available, generate placeholder
                        }
                        
                        return new Promise((resolve) => {
                            const canvas = document.createElement('canvas');
                            canvas.width = 256;
                            canvas.height = 256;
                            const ctx = canvas.getContext('2d');
                            
                            // Extract coordinates from URL for realistic placeholder
                            const urlParts = resource.split('/');
                            const z = urlParts[urlParts.length - 3] || '0';
                            const x = urlParts[urlParts.length - 2] || '0';
                            const y = urlParts[urlParts.length - 1]?.replace('.png', '') || '0';
                            
                            // Draw nautical-style placeholder
                            const gradient = ctx.createLinearGradient(0, 0, 256, 256);
                            gradient.addColorStop(0, '#E6F3FF');
                            gradient.addColorStop(1, '#B3D9FF');
                            ctx.fillStyle = gradient;
                            ctx.fillRect(0, 0, 256, 256);
                            
                            // Add grid lines
                            ctx.strokeStyle = '#4A90E2';
                            ctx.lineWidth = 0.5;
                            for (let i = 0; i < 256; i += 32) {
                                ctx.beginPath();
                                ctx.moveTo(i, 0);
                                ctx.lineTo(i, 256);
                                ctx.moveTo(0, i);
                                ctx.lineTo(256, i);
                                ctx.stroke();
                            }
                            
                            // Add coordinate info
                            ctx.fillStyle = '#2C5282';
                            ctx.font = 'bold 10px Arial';
                            ctx.fillText(\`Tile Z:\${z} X:\${x} Y:\${y}\`, 8, 20);
                            ctx.font = '9px Arial';
                            ctx.fillStyle = '#4A90E2';
                            ctx.fillText('Mappa Nautica Placeholder', 8, 35);
                            ctx.fillText('Aggiungere mappe reali in /charts/', 8, 48);
                            
                            // Add compass rose
                            ctx.save();
                            ctx.translate(200, 200);
                            ctx.strokeStyle = '#2C5282';
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.arc(0, 0, 20, 0, Math.PI * 2);
                            ctx.stroke();
                            ctx.fillStyle = '#2C5282';
                            ctx.font = 'bold 12px Arial';
                            ctx.textAlign = 'center';
                            ctx.fillText('N', 0, -25);
                            ctx.restore();
                            
                            canvas.toBlob((blob) => {
                                resolve(new Response(blob, {
                                    status: 200,
                                    headers: { 'Content-Type': 'image/png' }
                                }));
                            });
                        });
                    }
                    
                    return originalFetch.apply(this, arguments);
                };
            }
        }
        
        // Initialize nautical chart handler
        new NauticalChartHandler();
    </script>
    
    <script>
${allJS}
    </script>
</body>
</html>`;

// Write standalone file
const standalonePath = path.join(distPath, 'nautical-app-standalone.html');
fs.writeFileSync(standalonePath, standaloneTemplate);

// Copy service worker
const swSource = path.join(__dirname, 'public', 'local-server-sw.js');
const swDest = path.join(distPath, 'local-server-sw.js');
fs.copyFileSync(swSource, swDest);

// Create launch script for Windows
const launchScript = `@echo off
echo Avvio Sistema di Navigazione Nautica - Versione Standalone
echo.
echo Apertura dell'applicazione nel browser predefinito...
echo L'applicazione funziona completamente offline senza bisogno di server.
echo.

start "" "%~dp0nautical-app-standalone.html"

echo.
echo Applicazione avviata! Se non si apre automaticamente,
echo apri manualmente il file: nautical-app-standalone.html
echo.
pause`;

fs.writeFileSync(path.join(distPath, 'avvia-applicazione.bat'), launchScript);

// Create launch script for Linux/Mac
const launchScriptUnix = `#!/bin/bash
echo "Avvio Sistema di Navigazione Nautica - Versione Standalone"
echo ""
echo "Apertura dell'applicazione nel browser predefinito..."
echo "L'applicazione funziona completamente offline senza bisogno di server."
echo ""

# Get the directory where this script is located
DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Open the standalone HTML file
if command -v xdg-open > /dev/null; then
    xdg-open "$DIR/nautical-app-standalone.html"
elif command -v open > /dev/null; then
    open "$DIR/nautical-app-standalone.html"
else
    echo "Apri manualmente il file: $DIR/nautical-app-standalone.html"
fi

echo ""
echo "Applicazione avviata! Se non si apre automaticamente,"
echo "apri manualmente il file: nautical-app-standalone.html"
echo ""`;

const launchScriptPath = path.join(distPath, 'avvia-applicazione.sh');
fs.writeFileSync(launchScriptPath, launchScriptUnix);

// Make the Unix script executable
try {
    fs.chmodSync(launchScriptPath, '755');
} catch (error) {
    console.warn('Could not make script executable (Windows environment)');
}

// Create README for standalone version
const readmeContent = `# Sistema di Navigazione Nautica - Versione Standalone

## Come utilizzare l'applicazione

### Windows
Fai doppio clic su \`avvia-applicazione.bat\`

### Linux/Mac
Esegui \`./avvia-applicazione.sh\` dal terminale
o fai doppio clic sul file \`avvia-applicazione.sh\`

### Apertura manuale
Apri il file \`nautical-app-standalone.html\` con qualsiasi browser moderno

## Caratteristiche

✅ **Funziona completamente offline** - Nessun server richiesto
✅ **Nessuna installazione** - Non serve Node.js, Python o altri runtime  
✅ **Portatile** - Tutto contenuto in un singolo file HTML
✅ **Service Worker integrato** - Gestisce le richieste locali automaticamente
✅ **Mappe nautiche** - Support per chart tiles locali con fallback
✅ **Gestione waypoint e target** - Tutte le funzionalità originali

## Note tecniche

L'applicazione utilizza un Service Worker integrato per gestire:
- Cache locale delle risorse
- Gestione delle chart tiles nautiche
- Funzionamento offline completo
- Fallback automatico per risorse mancanti

## Struttura file

- \`nautical-app-standalone.html\` - Applicazione completa
- \`local-server-sw.js\` - Service Worker per gestione locale
- \`avvia-applicazione.bat\` - Script di avvio Windows
- \`avvia-applicazione.sh\` - Script di avvio Linux/Mac
- \`charts/\` - Directory per le mappe nautiche (opzionale)

## Aggiungere mappe nautiche

1. Crea una cartella \`charts\` nella stessa directory dell'applicazione
2. Aggiungi le tile delle mappe nella struttura: \`charts/[area]/[zoom]/[x]/[y].png\`
3. Le mappe verranno caricate automaticamente se presenti

Se non sono presenti mappe locali, l'applicazione genererà tile placeholder funzionali.
`;

fs.writeFileSync(path.join(distPath, 'README-STANDALONE.md'), readmeContent);

console.log('\n✅ Standalone application created successfully!');
console.log('\nFiles created:');
console.log('- nautical-app-standalone.html (main application)');
console.log('- local-server-sw.js (service worker)');
console.log('- avvia-applicazione.bat (Windows launcher)');
console.log('- avvia-applicazione.sh (Linux/Mac launcher)'); 
console.log('- README-STANDALONE.md (documentation)');
console.log('\nTo run: Open nautical-app-standalone.html in any modern browser');
console.log('No server installation required!');