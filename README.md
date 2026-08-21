# 🍹 Cocktail Daniel SRL - App Ordini

App web per ordinare cocktail, con invio ordini via WhatsApp, salvataggio persistente su Google Sheets e sistema di recensioni.

## Indice

- [Panoramica](#panoramica)
- [Funzionalità](#funzionalità)
- [File del progetto](#file-del-progetto)
- [Configurazione iniziale](#configurazione-iniziale)
- [Come funziona](#come-funziona)
- [Struttura dati Google Sheet](#struttura-dati-google-sheet)
- [Personalizzazione](#personalizzazione)

---

## Panoramica

L'app permette ai clienti di:
1. Sfogliare il menu cocktail con varianti
2. Ordinare specificando posizione e orario di consegna
3. Inviare l'ordine al barista via WhatsApp
4. Vedere lo storico dei propri ordini e il totale speso
5. Pagare il conto (azzera lo storico e invia riepilogo WhatsApp)
6. Lasciare una recensione con stelle e commento

---

## Funzionalità

| Funzione | Descrizione |
|---|---|
| 🍸 **Catalogo cocktail** | Elenco cocktail con icona, descrizione e varianti selezionabili |
| 📍 **Geolocalizzazione** | Rileva posizione GPS del cliente per la consegna |
| 📱 **Invio ordine WhatsApp** | Apre WhatsApp con messaggio pre-compilato per il barista |
| 💾 **Persistenza locale** | Ordini salvati nel browser (`localStorage`) |
| ☁️ **Sincronizzazione cloud** | Ordini salvati su Google Sheets, accessibili da più dispositivi |
| 👤 **Identificazione cliente** | Richiede il nome al primo accesso, lo ricorda per le volte successive |
| 💰 **Totale speso** | Calcolo automatico della spesa totale del cliente |
| ✅ **Paga e chiudi conto** | Invia riepilogo pagamento via WhatsApp e azzera lo storico |
| ⭐ **Recensioni** | Sistema a stelle (1-5) + commento, inviato al gruppo WhatsApp Family |

---

## File del progetto

```
├── index.html         # App principale (HTML + CSS + JavaScript)
├── background.png     # Immagine di sfondo (spiaggia al tramonto)
├── AppsScript.js       # Codice per Google Apps Script (backend dati)
└── README.md           # Questo file
```

> ⚠️ `index.html` e `background.png` devono trovarsi nella **stessa cartella**.

---

## Configurazione iniziale

### 1. Numero del barista

Nel file `index.html`, cerca:

```javascript
const ADMIN_PHONE = '3515292930';
```

Sostituisci con il numero WhatsApp del barista (formato internazionale senza `+` o spazi, es. `393515292930`).

### 2. Google Sheets (sincronizzazione cloud)

1. Crea un nuovo **Google Sheet**
2. Nella riga 1 inserisci le intestazioni (colonne A→J):
   ```
   id | customerName | cocktail | variant | location | time | orderTime | orderDate | notes | price
   ```
3. Vai su **Estensioni → Apps Script**
4. Cancella il contenuto e incolla il codice da `AppsScript.js`
5. **Esegui distribuzione → Nuova distribuzione**
   - Tipo: **App web**
   - Esecuzione come: **Me**
   - Chi ha accesso: **Chiunque**
6. Copia l'URL generato
7. Nel file `index.html`, cerca:
   ```javascript
   const SHEETS_API_URL = 'INCOLLA_QUI_IL_TUO_URL_APPS_SCRIPT';
   ```
   e sostituisci con l'URL copiato

> 🔄 Ogni volta che modifichi `AppsScript.js`, devi fare una **nuova distribuzione** (Gestisci distribuzioni → Modifica → Nuova versione → Distribuisci) e aggiornare l'URL se cambia.

### 3. Gruppo WhatsApp Family (recensioni)

Nel file `index.html`, cerca:

```javascript
const FAMILY_GROUP_LINK = 'INCOLLA_QUI_IL_LINK_GRUPPO_FAMILY';
```

Sostituisci con il link di invito del gruppo (WhatsApp → gruppo → Info gruppo → Link di invito → Copia link).

Se non configurato, le recensioni vengono inviate al numero del barista (`ADMIN_PHONE`).

---

## Come funziona

### Flusso ordine
1. Cliente seleziona cocktail + variante
2. Sceglie posizione di consegna (usa GPS o inserisce manualmente) e orario
3. Conferma → l'ordine viene:
   - Salvato in `localStorage` (locale)
   - Inviato a Google Sheets (cloud)
   - Aperto in WhatsApp con messaggio pre-compilato al barista

### Identificazione cliente
- Al **primo accesso** appare un popup che chiede il nome (obbligatorio)
- Il nome viene salvato in `localStorage` e non richiesto più
- Può essere modificato tramite il pulsante ✏️ accanto al nome mostrato in alto
- Viene incluso in ogni ordine, messaggio WhatsApp e riga del Google Sheet

### Pagamento
- Il pulsante **"✅ Paga e chiudi conto"** mostra il totale calcolato sommando i prezzi di tutti gli ordini
- Alla conferma: invia riepilogo via WhatsApp al barista, azzera lo storico locale e cloud

### Recensioni
- Pulsante **"⭐ Lascia una recensione"** apre un popup con selezione stelle (1-5) e commento
- Il messaggio include nome cliente, valutazione e commento
- Viene copiato negli appunti e si apre il gruppo Family (o inviato al barista se il link gruppo non è configurato)

---

## Struttura dati Google Sheet

| Colonna | Campo | Descrizione |
|---|---|---|
| A | `id` | Timestamp univoco ordine |
| B | `customerName` | Nome del cliente |
| C | `cocktail` | Nome del cocktail ordinato |
| D | `variant` | Variante scelta |
| E | `location` | Posizione di consegna |
| F | `time` | Orario di consegna richiesto |
| G | `orderTime` | Ora in cui è stato effettuato l'ordine |
| H | `orderDate` | Data dell'ordine |
| I | `notes` | Note aggiuntive del cliente |
| J | `price` | Prezzo del cocktail |

---

## Personalizzazione

### Aggiungere/modificare cocktail

Nel file `index.html`, cerca l'array `cocktails` e aggiungi un nuovo oggetto:

```javascript
{ 
    name: "Nome Cocktail", 
    icon: "🍹", 
    description: "Ingredienti principali",
    variants: ["Variante 1", "Variante 2", "Variante 3"]
}
```

### Cambiare l'immagine di sfondo

Sostituisci il file `background.png` con un'altra immagine mantenendo lo stesso nome, oppure aggiorna il riferimento CSS:

```css
background: url('nome-nuova-immagine.png') no-repeat center center fixed;
```

### Modificare i prezzi

I prezzi sono associati a ciascuna variante nel flusso di selezione ordine — cerca la logica di calcolo prezzo nella sezione `confirmOrder()`.

---

## Note tecniche

- App **single-file** (HTML + CSS + JS inline), nessuna installazione richiesta
- Compatibile con qualsiasi browser moderno (desktop e mobile)
- Dati locali (`localStorage`) legati al singolo dispositivo/browser
- Dati cloud (Google Sheets) condivisi tra tutti i dispositivi collegati alla stessa API
- Nessun backend proprietario: Google Apps Script funge da API gratuita

---

*© 2026 Cocktail Daniel SRL*
