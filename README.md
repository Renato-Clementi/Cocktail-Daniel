# 🍹 Cocktail Daniel SRL

PWA (Progressive Web App) per la gestione di un chiosco di cocktail a conduzione familiare — catalogo, ordini, pagamenti, magazzino, eventi e molto altro, il tutto gestito da un adolescente con la supervisione (a distanza) di un genitore.

**App live:** https://renato-clementi.github.io/Cocktail-Daniel/
**Repository:** https://github.com/Renato-Clementi/Cocktail-Daniel

---

## Cos'è

Un'unica pagina HTML (`index.html`), senza framework, che funziona come un vero e-commerce in miniatura: i clienti (famiglia e amici) sfogliano il catalogo e ordinano dal telefono, Daniel (l'amministratore) gestisce tutto da un pannello nascosto nella stessa app, e un genitore (Renato) supervisiona da remoto senza intromettersi nella gestione operativa.

Installabile come app sul telefono (PWA), funziona offline, e si aggiorna da sola quando viene pubblicata una nuova versione.

## Come si accede ai ruoli

Non c'è un vero login: l'app riconosce il ruolo dal **nome** scritto alla registrazione.

| Nome inserito | Ruolo | Cosa vede/può fare |
|---|---|---|
| `Daniel` | **Admin** | Tutto: listino, magazzino, ordini, pagamenti, checklist, guida gestionale |
| `Renato` | **Supervisore** | Vede tutti i pannelli di Daniel in sola lettura; unica azione concessa: attivare/disattivare la 🎓 Modalità Studio |
| Qualsiasi altro nome | **Cliente** | Catalogo, ordini, carta prepagata, lavoretti, feste, recensioni |

---

## Funzionalità

### 🍹 Catalogo e ordini
- 7 categorie: Cocktail, Snack, Soft drink, Dolci, Lavoretti, Merchandising, Feste
- Ogni prodotto ha varianti e prezzi indipendenti, modificabili dal listino
- Prezzo con supplemento in base all'orario di consegna (Subito / 10 min / 30 min)
- **Upselling contestuale**: propone fino a 2 prodotti in abbinamento durante l'ordine
- Ordini offline: si accodano e partono da soli al ritorno della connessione

### 💳 Pagamenti e carta prepagata
- Pagamento in contanti: il cliente invia la richiesta, Daniel conferma la ricezione
- **Carta prepagata**: ricarica richiesta dal cliente, confermata da Daniel
- Pagare con la carta invece che in contanti dà **10% di sconto fedeltà**, applicato automaticamente ordine per ordine (dal più vecchio)
- **Donazioni volontarie**: ogni cliente può donare tutto o parte del proprio saldo all'attività, mai quello di altri

### 🧹 Lavoretti domestici e Studio
- Catalogo di piccoli lavori di casa assegnabili a Daniel con una mancia, incluse voci dedicate allo **studio** (compiti, ripasso, lettura, progetti)
- **Checklist studio giornaliera**: si azzera ogni giorno, visibile a tutta la famiglia, spuntabile solo da Daniel
- Le voci richiedono **una foto come prova** per essere spuntate (anche sulle checklist preparazione/pulizia degli eventi)
- **🎓 Modalità Studio**: Daniel o Renato possono sospendere il servizio per motivi scolastici; se lo fa Renato, solo lui può riattivarlo (con visibilità sullo stato della checklist di Daniel per decidere quando)

### 🎉 Pacchetti festa
- 6 pacchetti a tema: Summer, Halloween, Xmas, Capodanno, Compleanno, BBQ Festival
- Prenotazione con data, orario e fascia invitati (5/10/15 persone), soggetta a conferma di Daniel
- Il cliente può **modificare** una richiesta ancora in attesa, o **riproporre una nuova data** se è stata annullata
- Feste annullate non rilavorate si **auto-eliminano dopo 10 giorni**
- Checklist di preparazione e pulizia per evento, con foto allegabili
- Alla conferma, il pacchetto genera un vero ordine di pagamento nello storico del cliente

### 🛍️ Merchandising
- Cappellino, maglietta, bicchiere firmato, adesivi, borsa tote
- **Il libro dei cocktail di Daniel**: un vero PDF con le 10 ricette del chiosco, **consegna digitale automatica** dopo il pagamento (carta o contanti confermati), disponibile per sempre nella libreria personale del cliente — resta acquistabile anche a servizio chiuso

### ⭐ Extra
- Recensioni pubbliche con stelle e commento
- Assistente virtuale "Danny" con suggerimenti contestuali
- Guida in-app **con notifica dei capitoli aggiornati** (pallino rosso, sparisce dopo la lettura) — guida gestionale per Daniel (solo italiano) e guida d'uso per i clienti (tutte le lingue)
- Supporto a 7 lingue: 🇮🇹 🇬🇧 🇪🇸 🇩🇪 🇫🇷 🇺🇦 🇵🇹

---

## Stack tecnico

- **Frontend**: HTML/CSS/JS puro, nessun framework, un solo file (`index.html`)
- **Backend**: [Firebase Firestore](https://firebase.google.com/) (database), niente server proprio
- **Hosting**: [GitHub Pages](https://pages.github.com/)
- **PWA**: service worker con versionamento automatico (hash SHA-256 di `index.html`), cache offline, banner di aggiornamento non invasivo

### Struttura dati (collezioni Firestore)

| Collezione | Contenuto |
|---|---|
| `orders` | Ordini attivi da pagare |
| `payments` | Richieste di pagamento in contanti in attesa di conferma |
| `settings` | Listino prezzi, orari, checklist studio (doc singoli) |
| `reviews` | Recensioni pubbliche |
| `chores` | Lavoretti assegnati a Daniel |
| `wallets` | Saldo carta prepagata per utente |
| `topupRequests` | Richieste di ricarica in attesa di conferma |
| `partyBookings` | Prenotazioni pacchetti festa |
| `digitalPurchases` | Prova d'acquisto permanente per prodotti digitali (es. il libro PDF) |
| `donations` | Donazioni volontarie del saldo carta |

---

## File del progetto

```
├── index.html                          # L'intera applicazione
├── manifest.json                       # Configurazione PWA
├── service-worker.js                   # Cache offline + auto-aggiornamento
├── danny-avatar.png                    # Illustrazione di Danny
├── background.png                      # Sfondo "tramonto sulla spiaggia"
├── icon-192.png / icon-512.png         # Icone app
├── icon-maskable-192.png / -512.png    # Icone adattive Android
├── apple-touch-icon.png                # Icona iOS
├── il-libro-dei-cocktail-di-daniel.pdf # Prodotto digitale in vendita
└── firestore_rules_v10.txt             # Regole di sicurezza Firestore (versione corrente)
```

> ⚠️ **Da caricare manualmente su GitHub Pages**: tutti i file sopra, inclusi gli asset binari (immagini, PDF) — non vengono serviti automaticamente.

---

## Setup Firebase

1. Crea un progetto su [Firebase Console](https://console.firebase.google.com/)
2. Attiva **Firestore Database** (modalità produzione)
3. Copia la configurazione del progetto nella costante `firebaseConfig` dentro `index.html`
4. Pubblica le regole di sicurezza da `firestore_rules_v10.txt` in **Firestore Database → Regole**

Le regole attuali sono deliberatamente permissive (`allow read, write: if true` su ogni collezione): adatte a un'app familiare a fiducia reciproca, **non a un prodotto pubblico con estranei**. Se il progetto scalasse oltre l'uso familiare, andrebbero irrigidite con autenticazione vera.

---

## Aggiornare l'app

1. Modifica `index.html` (o altri file)
2. Carica su GitHub Pages
3. Il service worker rileva da solo il cambiamento (hash del contenuto) e mostra ai clienti già connessi un banner **"Nuova versione disponibile"** — nessun aggiornamento forzato, la scelta di quando ricaricare resta all'utente

Non serve incrementare manualmente numeri di versione: è tutto automatico.

---

## Note

- Il progetto è nato come esperimento educativo: insegnare a un adolescente a gestire un'attività reale (prezzi, magazzino, clienti, pagamenti) mantenendo lo studio come priorità — da cui le funzionalità di Modalità Studio, checklist e supervisione.
- Il libro PDF è ospitato come file pubblico statico: non c'è un vero controllo d'accesso, solo il fatto che il link non è pubblicizzato. Adeguato per un contesto familiare, non per una vendita anti-pirateria seria.
- Nessun framework, nessuna build: si edita `index.html` direttamente e si ricarica la pagina.
