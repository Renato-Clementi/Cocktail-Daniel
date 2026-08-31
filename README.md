# 🍹 Cocktail Daniel SRL

PWA (Progressive Web App) per la gestione di un chiosco di cocktail a conduzione familiare — catalogo, ordini, pagamenti, magazzino, eventi e molto altro, il tutto gestito da un adolescente con la supervisione (a distanza) di un genitore.

**App live:** https://renato-clementi.github.io/Cocktail-Daniel/
**Repository:** https://github.com/Renato-Clementi/Cocktail-Daniel

---

## Cos'è

Una singola pagina, senza framework e senza build, che funziona come un vero e-commerce in miniatura: i clienti (famiglia e amici) sfogliano il catalogo e ordinano dal telefono, Daniel (l'amministratore) gestisce tutto da un pannello nascosto nella stessa app, e un genitore (Renato) supervisiona da remoto senza intromettersi nella gestione operativa.

Installabile come app sul telefono (PWA), funziona offline, e si aggiorna da sola quando viene pubblicata una nuova versione.

## Come si accede ai ruoli

L'app riconosce l'utente dal **nome** scritto alla registrazione. Per i clienti finisce lì; per la gestione serve anche un accesso (vedi sotto).

| Nome inserito | Ruolo | Cosa vede/può fare |
|---|---|---|
| `Daniel` | **Admin** | Tutto: listino, magazzino, ordini, pagamenti, checklist, guida gestionale |
| `Renato` | **Supervisore** | Vede tutti i pannelli di Daniel in sola lettura; unica azione concessa: attivare/disattivare la 🎓 Modalità Studio |
| Qualsiasi altro nome | **Cliente** | Catalogo, ordini, carta prepagata, lavoretti, feste, recensioni |

Il nome apre la porta giusta, ma **non è più quello che dà i poteri**. Daniel e
Renato fanno un accesso vero (email e password, una volta per dispositivo) e le
regole Firestore riconoscono i loro UID: prezzi, orari, conferme di pagamento,
accrediti sul saldo, checklist e cancellazioni sono loro e basta, imposto dal
server. I clienti restano anonimi — nessun login per ordinare un cocktail — e lo
stesso nome continua a ritrovare i propri ordini da un altro dispositivo.

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

- **Frontend**: HTML/CSS/JS puro, nessun framework, nessuna build — quattro file caricati con `<link>` e `<script>`
- **Backend**: [Firebase Firestore](https://firebase.google.com/) (database), niente server proprio
- **Hosting**: [GitHub Pages](https://pages.github.com/)
- **Auth**: Firebase Authentication — accesso anonimo per i clienti, email/password per la gestione
- **PWA**: service worker con versionamento automatico (ETag dei file dell'app), cache offline, banner di aggiornamento non invasivo

### Struttura dati (collezioni Firestore)

| Collezione | Contenuto |
|---|---|
| `orders` | Ordini attivi da pagare |
| `payments` | Richieste di pagamento in contanti in attesa di conferma |
| `settings/pricing` | Listino prezzi, orari, offerte, banner — scrivibile solo dalla gestione |
| `settings/stock` | Magazzino: lo scala anche il cliente che ordina, per questo sta a parte |
| `settings/studyChecklist_<data>` | Checklist studio del giorno, una per data |
| `reviews` | Recensioni pubbliche |
| `chores` | Lavoretti assegnati a Daniel |
| `wallets` | Saldo carta prepagata per utente |
| `topupRequests` | Richieste di ricarica in attesa di conferma |
| `partyBookings` | Prenotazioni pacchetti festa |
| `digitalPurchases` | Prova d'acquisto permanente per prodotti digitali (es. il libro PDF) |
| `donations` | Donazioni volontarie del saldo carta |
| `checklistPhotos` | Foto-prova delle checklist, una per documento (studio ed eventi) |

---

## File del progetto

```
├── index.html                          # Struttura della pagina e modali
├── app.css                             # Fogli di stile
├── catalog.js                          # Catalogo prodotti, feste, lavoretti, ricette
├── i18n.js                             # Traduzioni, 7 lingue
├── app.js                              # Logica dell'applicazione
├── manifest.json                       # Configurazione PWA
├── service-worker.js                   # Cache offline + auto-aggiornamento
├── danny-avatar.png                    # Illustrazione di Danny
├── background.jpg                      # Sfondo "tramonto sulla spiaggia"
├── icon-192.png / icon-512.png         # Icone app
├── icon-maskable-192.png / -512.png    # Icone adattive Android
├── apple-touch-icon.png                # Icona iOS
├── il-libro-dei-cocktail-di-daniel.pdf # Prodotto digitale in vendita
└── firestore.rules                     # Regole di sicurezza Firestore (permessi per ruolo)
```

> ⚠️ **Da caricare manualmente su GitHub Pages**: tutti i file sopra, inclusi gli asset binari (immagini, PDF) — non vengono serviti automaticamente.

---

## Setup Firebase

1. Crea un progetto su [Firebase Console](https://console.firebase.google.com/)
2. Attiva **Firestore Database** (modalità produzione)
3. Copia la configurazione del progetto nella costante `firebaseConfig` dentro `app.js`
4. Pubblica le regole di sicurezza da `firestore.rules` in **Firestore Database → Regole**
5. **Authentication → Sign-in method**: abilita *Anonimo* e *Email/password*
6. **Authentication → Users**: crea gli account di Daniel e Renato, copia i loro UID
7. Incolla quegli UID in **due** posti: `ADMIN_UIDS` / `SUPERADMIN_UIDS` dentro `app.js`, e `adminUids()` / `superadminUids()` dentro `firestore.rules`
8. Ripubblica le regole

9. Quando tutti hanno aperto l'app almeno una volta e accettato il banner di aggiornamento, metti `transizione()` a `false` in `firestore.rules` e ripubblica

> **Perché due tempi.** Le regole strette pretendono un token, e il token lo sa
> chiedere solo la versione nuova dell'app. Un telefono con la versione vecchia
> ancora in cache — e su iOS il service worker può essere pigro per giorni — si
> troverebbe letture e scritture rifiutate. Con `transizione()` a `true` quei
> telefoni continuano a funzionare, mentre la parte che conta è già attiva:
> `admin()` richiede un uid vero, quindi da subito nessuno cambia i prezzi né si
> accredita credito. Il passo 9 chiude anche la lettura anonima, senza fretta e
> reversibile in dieci secondi.
>
> Finché gli UID non sono incollati (passi 6-7) non pubblicare le regole: senza
> UID `admin()` è sempre falsa e il listino diventa di nessuno.

**Cosa protegge, e cosa no.** Protegge i poteri di gestione, il listino, gli
orari, le checklist, e soprattutto il fatto che nessuno possa accreditarsi
credito da solo: un saldo può scendere per mano di chi paga, ma può salire solo
per mano di Daniel. Non protegge cliente da cliente: con l'accesso anonimo ogni
dispositivo ha un uid diverso, quindi le regole non sanno distinguere "il mio
ordine" da "quello di un altro" senza far registrare tutti — e un amico che
passa non si registra per ordinare un cocktail. La chiave API è pubblica nella
pagina (inevitabile), quindi un token anonimo lo può ottenere anche chi legge il
sorgente.

---

## Aggiornare l'app

1. Modifica `app.js` (o `app.css`, `i18n.js`, `catalog.js`, `index.html`)
2. Carica su GitHub Pages
3. Il service worker rileva da solo il cambiamento e mostra ai clienti già connessi un banner **"Nuova versione disponibile"** — nessun aggiornamento forzato, la scelta di quando ricaricare resta all'utente

Non serve incrementare manualmente numeri di versione: è tutto automatico.

Come fa a rilevarlo: chiede al server solo gli **header** dei cinque file dell'app (richieste `HEAD`) e guarda `ETag`, o in mancanza `Last-Modified`. Cambiano quando il file cambia, e non si scarica il contenuto — utile perché il controllo parte anche a ogni ritorno sull'app. Se il server non fornisse nessuno dei due, ricade sull'hash del contenuto: automatico in ogni caso.

---

## Note

- Il progetto è nato come esperimento educativo: insegnare a un adolescente a gestire un'attività reale (prezzi, magazzino, clienti, pagamenti) mantenendo lo studio come priorità — da cui le funzionalità di Modalità Studio, checklist e supervisione.
- Il libro PDF è ospitato come file pubblico statico: non c'è un vero controllo d'accesso, solo il fatto che il link non è pubblicizzato. Adeguato per un contesto familiare, non per una vendita anti-pirateria seria.
- Nessun framework, nessuna build: si editano i file direttamente e si ricarica la pagina.
