# Soluzioni per Errori CORS - Applicazione Nautica

## Il Problema
Quando apri `index.html` direttamente dal file system, potresti vedere errori CORS come:
- "Access to script has been blocked by CORS policy"
- "Failed to load resource: net::ERR_FAILED"

## Soluzioni Disponibili

### 1. Server Locale (RACCOMANDATO)
Usa `start-server.bat` per avviare un server HTTP locale:

```bash
# Windows
start-server.bat

# L'app sarà su: http://localhost:3000
```

**Requisiti**: Python o Node.js installato

### 2. Build Ottimizzata
La configurazione Vite è stata ottimizzata per funzionare offline:
- CSS inline nel JavaScript
- File singoli senza split
- Path relativi per compatibilità file system

### 3. Impostazioni Browser Alternative

#### Chrome/Edge
Crea un collegamento con flag speciali:
```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --allow-file-access-from-files --disable-web-security --user-data-dir=c:\temp\chrome_cors
```

#### Firefox
1. Digita `about:config` nella barra indirizzi
2. Cerca `security.fileuri.strict_origin_policy`
3. Imposta su `false`

**ATTENZIONE**: Queste impostazioni riducono la sicurezza del browser!

## Struttura File Ottimale

```
NauticalApp/
├── index.html          # File principale
├── index.js            # JavaScript bundled
├── index.css           # CSS bundled (opzionale)
├── images/             # Immagini app
├── charts/             # Mappe CM93
│   ├── mediterranean/
│   └── adriatic/
├── data/               # Waypoints/targets salvati
└── tools/              # Utility
```

## Test della Build

Dopo `npm run build`, verifica che esista:
- ✅ `dist/index.html`
- ✅ `dist/index.js` 
- ✅ `dist/index.css` (se generato)

## Troubleshooting

### Errore: "index.js not found"
- Ricompila con: `npm run build`
- Verifica che `vite.config.ts` sia aggiornato

### Errore: "Modulo non caricato"
- Usa il server locale: `start-server.bat`
- Verifica che tutti i path siano relativi

### Mappe non caricate
- Posiziona le mappe CM93 in `charts/`
- Verifica il formato: `charts/regione/zoom/x/y.png`

---

**Per supporto completo, usa sempre il server locale con `start-server.bat`**