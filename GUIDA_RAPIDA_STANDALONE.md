# 🚀 Guida Rapida - Versione Standalone

## ⚡ Comandi Rapidi

### 1. Crea Versione Standalone
```bash
# Assicurati di essere nella cartella del progetto
node build-standalone.cjs
```

### 2. Avvia Applicazione
```bash
# Windows
cd dist
avvia-applicazione.bat

# Linux/Mac  
cd dist
./avvia-applicazione.sh

# Manuale (tutti i sistemi)
# Apri dist/nautical-app-standalone.html nel browser
```

## 📁 Struttura File Generati

```
dist/
├── nautical-app-standalone.html    # 🎯 APPLICAZIONE PRINCIPALE
├── local-server-sw.js              # Service Worker
├── avvia-applicazione.bat          # Windows Launcher
├── avvia-applicazione.sh           # Linux/Mac Launcher
└── README-STANDALONE.md            # Documentazione
```

## ✅ Checklist Veloce

- [ ] Node.js installato? (`node --version`)
- [ ] Nella cartella del progetto?
- [ ] Eseguito `node build-standalone.cjs`?
- [ ] File `nautical-app-standalone.html` generato?
- [ ] Applicazione si apre nel browser?

## 🎯 Per l'Utente Finale

**Non serve installare niente!**
1. Ricevi la cartella `dist/`
2. Fai doppio clic su `avvia-applicazione.bat` (Windows)
3. Oppure apri `nautical-app-standalone.html` nel browser

## 🔧 Problemi Comuni

| Problema | Soluzione |
|----------|-----------|
| `node: command not found` | Installa Node.js |
| Build fallisce | `npm install` poi riprova |
| App non si apre | Apri manualmente il file HTML |
| Mappe non caricano | Aggiungi cartella `charts/` |

## 📱 Caratteristiche

- ✅ **Offline completo**
- ✅ **Zero installazioni** 
- ✅ **Portatile**
- ✅ **Multi-piattaforma**
- ✅ **Self-contained**