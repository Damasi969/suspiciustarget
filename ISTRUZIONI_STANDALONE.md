# Istruzioni per Creare la Versione Standalone

## Prerequisiti

Prima di procedere, assicurati di avere:
- **Node.js installato** (versione 16 o superiore)
- **npm** funzionante
- Accesso al **terminale/prompt dei comandi**

## Passo 1: Verifica Node.js

Apri il terminale e verifica che Node.js sia installato:

```bash
node --version
npm --version
```

Se vedi i numeri di versione, sei pronto. Altrimenti installa Node.js da: https://nodejs.org

## Passo 2: Naviga nella Directory del Progetto

Apri il terminale nella cartella root del progetto (dove si trova `package.json`):

### Su Windows:
- Apri Esplora File nella cartella del progetto
- Tieni premuto `Shift` e clicca destro in uno spazio vuoto
- Seleziona "Apri finestra PowerShell qui" o "Apri prompt dei comandi qui"

### Su Linux/Mac:
- Apri il terminale
- Naviga alla cartella: `cd /percorso/al/progetto`

## Passo 3: Installa le Dipendenze (Se Necessario)

Se non hai mai eseguito npm install, fallo ora:

```bash
npm install
```

## Passo 4: Esegui il Build Standalone

Esegui il comando per creare la versione standalone:

```bash
node build-standalone.cjs
```

**Nota**: Il file usa l'estensione `.cjs` per compatibilità con progetti ES module.

### Cosa Succede Durante l'Esecuzione:

1. **Fase 1**: Viene eseguito il build normale dell'applicazione
   ```
   Building standalone nautical application...
   Step 1: Building application...
   ```

2. **Fase 2**: Creazione della versione standalone
   ```
   Step 2: Creating standalone version...
   ```

3. **Completamento**: Vedrai la conferma di successo
   ```
   ✅ Standalone application created successfully!
   ```

## Passo 5: File Generati

Dopo l'esecuzione, troverai nella cartella `dist/`:

### File Principali:
- **`nautical-app-standalone.html`** - Applicazione completa standalone
- **`local-server-sw.js`** - Service worker per funzionamento offline
- **`README-STANDALONE.md`** - Documentazione della versione standalone

### Script di Avvio:
- **`avvia-applicazione.bat`** - Per Windows (doppio clic per aprire)
- **`avvia-applicazione.sh`** - Per Linux/Mac (eseguibile da terminale)

## Come Usare l'Applicazione Standalone

### Metodo 1: Script Automatici

#### Su Windows:
```bash
# Vai nella cartella dist
cd dist
# Esegui lo script
avvia-applicazione.bat
```
Oppure fai **doppio clic** su `avvia-applicazione.bat`

#### Su Linux/Mac:
```bash
# Vai nella cartella dist
cd dist
# Rendi eseguibile e lancia
chmod +x avvia-applicazione.sh
./avvia-applicazione.sh
```

### Metodo 2: Apertura Manuale

Apri `dist/nautical-app-standalone.html` con qualsiasi browser moderno:
- Chrome
- Firefox  
- Safari
- Edge

## Distribuzione dell'Applicazione

### Per Condividere l'App:

1. **Copia l'intera cartella `dist/`** su USB, email, ecc.
2. Il destinatario dovrà solo:
   - Estrarre i file
   - Eseguire `avvia-applicazione.bat` (Windows) o `avvia-applicazione.sh` (Linux/Mac)
   - Oppure aprire `nautical-app-standalone.html` nel browser

### Nessun Requisito per l'Utente Finale:
- ❌ Non serve Node.js installato
- ❌ Non serve Python
- ❌ Non serve alcun server
- ✅ Serve solo un browser moderno

## Aggiungere Mappe Nautiche

Per includere mappe CM93 nella versione standalone:

1. Crea una cartella `charts/` nella cartella `dist/`
2. Struttura le mappe come: `charts/[area]/[zoom]/[x]/[y].png`
3. Esempio: `charts/adriatic/8/132/95.png`

L'applicazione caricherà automaticamente le mappe se presenti.

## Risoluzione Problemi

### Errore: "node: command not found"
**Soluzione**: Installa Node.js da https://nodejs.org

### Errore: "npm run build failed"
**Soluzioni**:
```bash
# Pulisci cache npm
npm cache clean --force

# Reinstalla dipendenze
rm -rf node_modules package-lock.json
npm install

# Riprova il build
node build-standalone.cjs
```

### L'applicazione non si apre
**Soluzioni**:
1. Prova ad aprire `nautical-app-standalone.html` manualmente
2. Usa un browser diverso
3. Controlla che il file sia completo (dovrebbe essere > 1MB)

### Service Worker non funziona
**Nota**: Alcuni browser bloccano Service Worker da file locali. L'app funziona comunque, ma senza cache avanzata.

## Test della Versione Standalone

Per verificare che tutto funzioni:

1. ✅ Apri l'applicazione
2. ✅ Verifica che la mappa si carichi
3. ✅ Prova a creare un waypoint
4. ✅ Testa il menu contestuale
5. ✅ Chiudi e riapri - i dati devono essere salvati

## Supporto

Se incontri problemi:
1. Verifica i prerequisiti
2. Controlla i messaggi di errore nel terminale
3. Prova i passaggi di risoluzione problemi
4. Controlla che tutti i file siano stati generati correttamente

---

**Versione Standalone = Massima Portabilità + Zero Dipendenze**