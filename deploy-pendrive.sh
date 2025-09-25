#!/bin/bash
# Script di deployment per PenDrive - Linux/Mac
# Eseguire dalla cartella del progetto Lovable

echo "====================================="
echo "  DEPLOYMENT APPLICAZIONE NAUTICA"
echo "  Su PenDrive - Versione Linux/Mac"  
echo "====================================="

# Verifica se siamo nella cartella corretta
if [ ! -f "package.json" ]; then
    echo "ERRORE: Eseguire lo script dalla cartella del progetto!"
    exit 1
fi

# Chiedi il percorso del PenDrive
echo "Percorsi comuni PenDrive:"
echo "  Linux: /media/user/PENDRIVE o /mnt/PENDRIVE"
echo "  Mac: /Volumes/PENDRIVE"
echo ""
read -p "Inserisci il percorso del PenDrive: " DRIVE_PATH
DEPLOY_PATH="$DRIVE_PATH/NauticalApp"

echo ""
echo "Destinazione: $DEPLOY_PATH"
echo ""

# Verifica se il drive esiste
if [ ! -d "$DRIVE_PATH" ]; then
    echo "ERRORE: Percorso $DRIVE_PATH non trovato!"
    exit 1
fi

echo "[1/6] Creazione build produzione..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERRORE: Build fallito!"
    exit 1
fi

echo "[2/6] Creazione struttura cartelle..."
mkdir -p "$DEPLOY_PATH"
mkdir -p "$DEPLOY_PATH/charts/mediterranean"
mkdir -p "$DEPLOY_PATH/charts/adriatic"
mkdir -p "$DEPLOY_PATH/cache/tiles"
mkdir -p "$DEPLOY_PATH/data"
mkdir -p "$DEPLOY_PATH/tools"

echo "[3/6] Copia file applicazione..."
cp -r dist/* "$DEPLOY_PATH/"

echo "[4/6] Copia mappe CM93 esistenti..."
if [ -d "public/charts" ]; then
    cp -r public/charts/* "$DEPLOY_PATH/charts/"
else
    echo "ATTENZIONE: Cartella public/charts non trovata, creo esempi..."
    mkdir -p "$DEPLOY_PATH/charts/mediterranean/6/32"
    mkdir -p "$DEPLOY_PATH/charts/adriatic/8/132"
    cat > "$DEPLOY_PATH/charts/README.txt" << EOF
Posizionare qui le mappe CM93 nel formato:
charts/[REGIONE]/[ZOOM]/[X]/[Y].png

Esempi:
- charts/mediterranean/6/32/22.png
- charts/adriatic/8/132/95.png
EOF
fi

echo "[5/6] Creazione file di configurazione..."

# Cache manifest
cat > "$DEPLOY_PATH/cache/cache-manifest.json" << EOF
{
  "version": "1.0.0",
  "created": "$(date -Iseconds)",
  "regions": {},
  "total_size_mb": 0
}
EOF

# File configurazione app
cat > "$DEPLOY_PATH/.env.local" << EOF
# Configurazione PenDrive
VITE_APP_MODE=offline
VITE_CACHE_ENABLED=true
VITE_CM93_ENABLED=true
EOF

# Dati iniziali vuoti
echo "[]" > "$DEPLOY_PATH/data/waypoints.json"
echo "[]" > "$DEPLOY_PATH/data/targets.json"
echo "{}" > "$DEPLOY_PATH/data/settings.json"

echo "[6/6] Copia tools e documentazione..."
cp ISTRUZIONI_MAPPE_CM93.md "$DEPLOY_PATH/tools/" 2>/dev/null || true
cp CONFIGURAZIONE_CACHE.md "$DEPLOY_PATH/tools/" 2>/dev/null || true

# Script utilities
cat > "$DEPLOY_PATH/tools/clean-cache.sh" << 'EOF'
#!/bin/bash
echo "Pulizia cache in corso..."
rm -rf cache/tiles/*
echo "Cache pulita!"
EOF
chmod +x "$DEPLOY_PATH/tools/clean-cache.sh"

cat > "$DEPLOY_PATH/tools/verify-charts.sh" << 'EOF'
#!/bin/bash
echo "Verifica mappe CM93..."
total=0
missing=0

for region in charts/*/; do
    if [ -d "$region" ]; then
        echo "Regione: $(basename $region)"
        for zoom in $region*/; do
            if [ -d "$zoom" ]; then
                count=$(find "$zoom" -name "*.png" | wc -l)
                total=$((total + count))
                echo "  Zoom $(basename $zoom): $count tile"
            fi
        done
    fi
done

echo ""
echo "Totale tile trovate: $total"
echo "Verifica completata!"
EOF
chmod +x "$DEPLOY_PATH/tools/verify-charts.sh"

echo ""
echo "====================================="
echo "  DEPLOYMENT COMPLETATO!"
echo "====================================="
echo ""
echo "Percorso: $DEPLOY_PATH"
echo ""
echo "PROSSIMI PASSI:"
echo "1. Aggiungere mappe CM93 in: $DEPLOY_PATH/charts/"
echo "2. Aprire index.html con browser"
echo "3. Consultare documentazione in: $DEPLOY_PATH/tools/"
echo ""
echo "STRUTTURA CREATA:"
echo "├── index.html (file principale)"
echo "├── assets/ (file applicazione)"
echo "├── charts/ (mappe CM93)"
echo "├── cache/ (cache offline)"
echo "├── data/ (waypoints e targets)"
echo "└── tools/ (utilities e docs)"
echo ""

# Calcola spazio utilizzato
if command -v du >/dev/null 2>&1; then
    size=$(du -sh "$DEPLOY_PATH" 2>/dev/null | cut -f1)
    echo "Spazio utilizzato: $size"
    echo ""
fi

echo "Per aprire l'applicazione:"
echo "  file://$DEPLOY_PATH/index.html"
echo ""