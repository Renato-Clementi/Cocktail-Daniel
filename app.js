// ==================================================
// COCKTAIL DANIEL SRL — Logica dell'applicazione
// ==================================================
// Nessuna build: questo file viene caricato da index.html con un
// normale <script>. L'ordine conta — catalog.js e i18n.js vanno caricati prima di questo.
// ==================================================
        // =============================================
        // LIBRERIA DIGITALE
        // A differenza degli ordini normali (che spariscono una volta
        // pagati), un acquisto digitale resta per sempre: è la prova che
        // il cliente ha comprato quel PDF, con accesso permanente al file.
        // Va creata nel momento esatto in cui un ordine si chiude pagato,
        // sia che accada all'istante (carta) sia dopo la conferma di
        // Daniel (contanti) — altrimenti il download sparirebbe insieme
        // all'ordine prima che il cliente riesca a scaricarlo.
        // =============================================
        let myDigitalPurchases = [];

        async function grantDigitalPurchases(paidOrders) {
            const digitalOrders = paidOrders.filter(o => getDigitalProduct(o.cocktail));
            if (digitalOrders.length === 0) return;

            for (const order of digitalOrders) {
                const product = getDigitalProduct(order.cocktail);
                const purchase = {
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    userId: order.userId,
                    customerName: order.customerName,
                    productName: product.name,
                    icon: product.icon,
                    fileUrl: product.fileUrl,
                    purchasedAt: Date.now(),
                    purchasedDate: new Date().toLocaleDateString('it-IT')
                };
                if (order.userId === getUserId(customerName)) {
                    myDigitalPurchases.unshift(purchase);
                }
                if (cloudReady()) {
                    try {
                        await firestoreDb.collection('digitalPurchases').doc(String(purchase.id)).set(purchase);
                    } catch (error) { console.log('Errore salvataggio acquisto digitale:', error); }
                }
            }
            renderMyLibraryPanel();
        }

        async function loadMyLibraryFromCloud() {
            if (!cloudReady() || !customerName) return;
            try {
                // Il filtro era in JavaScript: gli acquisti di tutti i
                // clienti arrivavano comunque nel browser di ognuno, e si
                // pagava una lettura per ciascuno. Ora filtra il database.
                const snapshot = await firestoreDb.collection('digitalPurchases')
                    .where('userId', '==', getUserId(customerName))
                    .get();
                myDigitalPurchases = snapshot.docs
                    .map(d => d.data())
                    .sort((a, b) => b.purchasedAt - a.purchasedAt);
                renderMyLibraryPanel();
            } catch (error) {
                console.log('Libreria digitale non disponibile:', error);
            }
        }

        function renderMyLibraryPanel() {
            const panel = document.getElementById('myLibraryPanel');
            if (!panel) return;
            if (!customerName || myDigitalPurchases.length === 0) { panel.style.display = 'none'; return; }

            panel.style.display = 'block';
            document.getElementById('myLibraryCount').textContent = myDigitalPurchases.length;
            document.getElementById('myLibraryList').innerHTML = myDigitalPurchases.map(p => `
                <div class="chore-row">
                    <div class="chore-row-info">
                        <strong>${escapeHtml(p.icon)} ${escapeHtml(p.productName)}</strong><br>
                        <small>${t('purchasedOn')} ${escapeHtml(p.purchasedDate)}</small>
                    </div>
                    <a href="${safeFileUrl(p.fileUrl)}" download class="chore-done-btn" style="text-decoration:none; display:inline-block;">📥 ${t('downloadPdf')}</a>
                </div>
            `).join('');
        }

        const allProducts = cocktails.concat(snacks, softdrinks, desserts, merch);

        let currentCategory = localStorage.getItem('currentCategory') || 'cocktails';

        const CATEGORIES = {
            cocktails: cocktails,
            snacks: snacks,
            softdrinks: softdrinks,
            desserts: desserts,
            merch: merch,
            party: partyPackages
        };

        function currentProducts() {
            return CATEGORIES[currentCategory] || cocktails;
        }

        // =============================================
        // TRADUZIONI (i18n)
        // I messaggi WhatsApp restano SEMPRE in italiano.
        // Le traduzioni riguardano solo l'interfaccia visibile.
        // =============================================
        let pricing = buildDefaultPricing();
        try {
            const cachedPricing = localStorage.getItem('cocktailPricing');
            if (cachedPricing) {
                const parsed = JSON.parse(cachedPricing);
                if (parsed && parsed.items) pricing = parsed;
            }
        } catch (e) { /* usa i default */ }

        // Prezzo base di un cocktail per la variante selezionata
        function getBasePrice(cocktailName, variantIndex) {
            const item = pricing.items[cocktailName];
            if (!item || !Array.isArray(item.prices)) return 0.50;
            const p = item.prices[variantIndex >= 0 ? variantIndex : 0];
            return (typeof p === 'number' && !isNaN(p)) ? p : 0.50;
        }

        // Supplemento in base all'orario di consegna
        function getTimeSurcharge(time) {
            const s = pricing.timeSurcharge ? pricing.timeSurcharge[time] : undefined;
            return (typeof s === 'number' && !isNaN(s)) ? s : 0;
        }

        // Prezzo totale (base + supplemento orario)
        // Prezzo totale (base + supplemento orario + eventuale maggiorazione premium)
        // Accetta sia "Mojito" sia "Mojito Premium".
        function computePrice(cocktailName, variant, time) {
            const base = baseNameOf(cocktailName);
            const cocktail = findProduct(base);
            if (!cocktail) return 0;
            const variantIndex = cocktail.variants.indexOf(variant);
            // Il merchandising si ritira al banco: niente supplemento orario,
            // non ha senso far pagare di più una maglietta "urgente".
            let price = getBasePrice(base, variantIndex) + (isMerch(base) ? 0 : getTimeSurcharge(time));
            if (isPremiumName(cocktailName)) {
                price += getPremiumSurcharge(base);
            }
            return price;
        }

        // Formatta una data "YYYY-MM-DD" (come arriva da un campo <input
        // type="date">) senza passare per UTC. "new Date('2026-09-16')"
        // viene interpretata come mezzanotte UTC: con un fuso orario
        // indietro rispetto a UTC, mostrarla in locale può farla scivolare
        // al giorno prima (16 settembre diventa 15). Costruendo la data
        // dai singoli numeri, invece, resta sempre quella scritta.
        function formatEventDate(dateStr) {
            if (!dateStr) return '';
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d).toLocaleDateString('it-IT');
        }

        function formatPrice(value) {
            return value.toFixed(2).replace('.', ',') + '€';
        }

        // Arrotonda a 2 cifre decimali, da usare ogni volta che un
        // numero viene CALCOLATO o SALVATO (non solo mostrato): la somma
        // ripetuta di piccoli importi in JavaScript (es. scalare il
        // magazzino cl per cl) accumula altrimenti errori come
        // 19.999999999999996 invece di 20, che poi riaffiorano altrove.
        function round2(n) {
            return Math.round((n + Number.EPSILON) * 100) / 100;
        }

        // =============================================
        // BANNER NOVITÀ: un messaggio alla volta, con dissolvenza nel
        // successivo ogni 5 secondi. Ogni messaggio è un oggetto
        // {text, bgImage, badge} — sfondo e badge sono opzionali.
        // Contenuto modificabile da Daniel dal listino.
        // =============================================
        let newsBannerIndex = 0;
        let newsBannerInterval = null;

        // Compatibilità: se un messaggio è ancora una stringa semplice
        // (dati salvati prima di questa funzionalità), lo trattiamo come
        // solo testo, senza sfondo né badge.
        function normalizeNewsMessage(m) {
            if (typeof m === 'string') return { text: m, bgImage: '', badge: '', badgeEnabled: false, badgeColor: 'gold' };
            return {
                text: m.text || '',
                bgImage: m.bgImage || '',
                badge: m.badge || '',
                // Se il campo non esiste ancora (dati salvati prima di
                // questo controllo esplicito), il comportamento resta
                // quello di prima: badge visibile se c'è del testo.
                badgeEnabled: (m.badgeEnabled !== undefined) ? m.badgeEnabled : !!m.badge,
                badgeColor: m.badgeColor || 'gold'
            };
        }

        // =============================================
        // IMMAGINE DI SFONDO DEL BANNER
        // Prima si incollava un URL esterno: scomodo (bisogna avere la foto
        // già ospitata da qualche parte) e fragile (se il link muore, il
        // banner si rompe in silenzio). Ora si scatta o si scegle dalla
        // galleria, e l'immagine viene compressa lato client.
        //
        // DOVE FINISCE: in un documento suo, bannerImages/<id>, non dentro
        // settings/pricing. Il campo bgImage del messaggio resta una stringa,
        // ma contiene un riferimento "img:<id>" invece dei dati.
        //
        // Il motivo è misurato, non teorico: settings/pricing viene riletto
        // per intero da OGNI dispositivo ogni 60 secondi. Un'immagine
        // difficile da comprimere pesa ~117 KB in base64; quattro messaggi
        // con sfondo porterebbero il listino da 7 KB a ~475 KB, cioè circa
        // 28 MB l'ora per dispositivo, su dati mobili. In un documento a
        // parte l'immagine si scarica una volta e resta in cache.
        //
        // Gli URL esterni già inseriti continuano a funzionare: chi inizia
        // per http, o è già un data URI, viene usato così com'è.
        // =============================================
        const BANNER_IMG_PREFIX = 'img:';

        function isBannerImageRef(value) {
            return typeof value === 'string' && value.startsWith(BANNER_IMG_PREFIX);
        }

        // La sorgente utilizzabile per un valore di bgImage, o null se
        // l'immagine è un riferimento non ancora arrivato dal database.
        function bannerImageSrc(value) {
            if (!value) return null;
            if (!isBannerImageRef(value)) return value;      // URL esterno o data URI
            return photoCache.get(value.slice(BANNER_IMG_PREFIX.length)) || null;
        }

        function ensureBannerImages(valori, onLoaded) {
            const ids = (valori || [])
                .filter(isBannerImageRef)
                .map(v => v.slice(BANNER_IMG_PREFIX.length));
            ensurePhotos(ids, onLoaded, 'bannerImages', 'image');
        }

        // Scrive l'immagine e ritorna il riferimento da mettere nel campo
        // nascosto, oppure null se il salvataggio non è andato. Il banner lo
        // compone anche Renato, quindi la guardia è canSupervise(), non
        // isAdmin() — le regole Firestore su bannerImages dicono staff().
        async function saveBannerImage(dataUri) {
            if (!canSupervise() || !cloudReady()) return null;
            const id = 'banner_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            try {
                await firestoreDb.collection('bannerImages').doc(id).set({
                    image: dataUri,
                    updatedAt: Date.now()
                });
                photoCache.set(id, dataUri);
                return BANNER_IMG_PREFIX + id;
            } catch (error) {
                console.log('Errore salvataggio immagine banner:', error);
                return null;
            }
        }

        // Le immagini non più citate da nessun messaggio restano documenti
        // orfani: capita se si carica una foto e poi si chiude il form senza
        // salvare, o se si sostituisce un'immagine con un'altra. Si spazzano
        // solo quelle vecchie di oltre un giorno, per non cancellare quella
        // che qualcuno sta caricando in questo momento su un altro
        // dispositivo. Una volta per sessione, e solo da chi ha i permessi.
        let bannerImagesPulite = false;
        async function pulisciImmaginiBannerOrfane() {
            if (bannerImagesPulite || !canSupervise() || !cloudReady()) return;
            bannerImagesPulite = true;
            const usate = new Set(
                ((pricing.newsBanner && pricing.newsBanner.messages) || [])
                    .map(m => (m && m.bgImage) || '')
                    .filter(isBannerImageRef)
                    .map(v => v.slice(BANNER_IMG_PREFIX.length))
            );
            const limite = Date.now() - 24 * 60 * 60 * 1000;
            try {
                const snap = await firestoreDb.collection('bannerImages').get();
                for (const doc of snap.docs) {
                    if (usate.has(doc.id)) continue;
                    if ((doc.data().updatedAt || 0) > limite) continue;
                    await firestoreDb.collection('bannerImages').doc(doc.id).delete();
                }
            } catch (error) {
                console.log('Pulizia immagini banner non riuscita:', error);
            }
        }

        // --- Controlli nell'editor ---
        // Niente indici: ogni funzione risale alla propria card con closest().
        // Passare l'indice della card avrebbe voluto dire tenerlo allineato
        // dopo ogni rimozione (il pulsante ✕ elimina la card dal DOM) e
        // costruire id univoci fra il pannello di Daniel e quello di Renato,
        // che esistono nel DOM contemporaneamente. Così il problema non c'è.
        function pickNewsBgImage(el) {
            const area = el.closest('.news-bg-area');
            if (area) area.querySelector('input[type=file]').click();
        }

        async function handleNewsBgImageSelected(input) {
            const file = input.files && input.files[0];
            input.value = '';                      // riscegliere lo stesso file deve rifunzionare
            if (!file) return;
            const area = input.closest('.news-bg-area');
            if (!area) return;
            try {
                // Più aggressiva delle foto-prova delle checklist (640/0.55):
                // qui è uno sfondo decorativo, non una prova da guardare.
                const dataUri = await compressImageFile(file, 800, 0.6);
                const ref = await saveBannerImage(dataUri);
                if (!ref) { alert(t('newsImageError')); return; }
                area.querySelector('[data-news-bg]').value = ref;
                renderNewsBgArea(area, ref);
            } catch (error) {
                console.log('Errore compressione immagine banner:', error);
                alert(t('newsImageError'));
            }
        }

        function removeNewsBgImage(el) {
            const area = el.closest('.news-bg-area');
            if (!area) return;
            // Si svuota solo il riferimento: il documento dell'immagine lo
            // rimuove la pulizia degli orfani. Cancellarlo subito lascerebbe
            // il listino a puntare a un'immagine che non c'è più, se poi
            // l'utente chiudesse il form senza salvare.
            area.querySelector('[data-news-bg]').value = '';
            renderNewsBgArea(area, '');
        }

        function renderNewsBgArea(area, value) {
            const src = bannerImageSrc(value);
            const controlli = area.querySelector('.news-bg-controls');
            if (!controlli) return;
            controlli.innerHTML = value
                ? `<img class="news-bg-thumb" src="${escapeAttr(src || '')}" alt="${t('newsBgThumbAlt')}"
                        onclick="if (this.src) openPhotoLightbox(this.src)">
                   <button type="button" class="checklist-photo-remove" onclick="removeNewsBgImage(this)">✕</button>`
                : `<button type="button" class="checklist-photo-btn news-bg-btn" onclick="pickNewsBgImage(this)">📷 ${t('newsAddBgImage')}</button>`;
            // Se è un riferimento non ancora scaricato, la miniatura resta
            // vuota finché l'immagine non arriva: poi si ridisegna.
            if (value && !src) ensureBannerImages([value], () => renderNewsBgArea(area, value));
        }

        // Il blocco completo da mettere in una card, sia quelle costruite da
        // buildNewsMsgCardsHTML sia quella creata da addNewsMsgRow.
        function newsBgAreaHTML(bgImage) {
            const src = bannerImageSrc(bgImage);
            const controlli = bgImage
                ? `<img class="news-bg-thumb" src="${escapeAttr(src || '')}" alt="${t('newsBgThumbAlt')}"
                        onclick="if (this.src) openPhotoLightbox(this.src)">
                   <button type="button" class="checklist-photo-remove" onclick="removeNewsBgImage(this)">✕</button>`
                : `<button type="button" class="checklist-photo-btn news-bg-btn" onclick="pickNewsBgImage(this)">📷 ${t('newsAddBgImage')}</button>`;
            return `
                    <div class="news-bg-area">
                        <input type="hidden" data-news-bg value="${escapeAttr(bgImage || '')}">
                        <input type="file" accept="image/*" style="display:none" onchange="handleNewsBgImageSelected(this)">
                        <div class="news-bg-controls">${controlli}</div>
                    </div>`;
        }

        // Le card dei singoli messaggi: condivise tra il listino di
        // Daniel e il pannello dedicato di Renato, così le due interfacce
        // restano sempre coerenti tra loro.
        function buildNewsMsgCardsHTML(messages) {
            return messages.map(normalizeNewsMessage).map((msg, i) => `
                <div class="news-msg-card">
                    <div style="display:flex; gap:6px; align-items:center;">
                        <input type="text" data-news-text="${i}" value="${escapeAttr(msg.text)}"
                               style="flex:1;" placeholder="${t('newsMsgPlaceholder')}">
                        <button type="button" class="reject-btn" style="padding:8px 12px;" onclick="this.closest('.news-msg-card').remove()">✕</button>
                    </div>
${newsBgAreaHTML(msg.bgImage)}
                    <input type="text" data-news-badge="${i}" value="${escapeAttr(msg.badge)}"
                           placeholder="${t('newsBadgePlaceholder')}" style="margin-top:6px;">
                    <div style="display:flex; gap:8px; align-items:center; margin-top:8px;">
                        <label class="soldout-toggle" style="margin:0; flex-shrink:0;">
                            <input type="checkbox" data-news-badge-enabled="${i}" ${msg.badgeEnabled ? 'checked' : ''}>
                            <span style="font-size:0.85em;">${t('newsBadgeShowLabel')}</span>
                        </label>
                        <select data-news-badge-color="${i}" style="flex:1; padding:6px; border:2px solid var(--sand-deep); border-radius:6px; font-size:0.85em;">
                            <option value="gold" ${msg.badgeColor === 'gold' ? 'selected' : ''}>${t('newsColorGold')}</option>
                            <option value="coral" ${msg.badgeColor === 'coral' ? 'selected' : ''}>${t('newsColorCoral')}</option>
                            <option value="lagoon" ${msg.badgeColor === 'lagoon' ? 'selected' : ''}>${t('newsColorLagoon')}</option>
                            <option value="red" ${msg.badgeColor === 'red' ? 'selected' : ''}>${t('newsColorRed')}</option>
                        </select>
                    </div>
                </div>`).join('');
        }

        function renderNewsBannerSlide(msg) {
            const bgEl = document.getElementById('newsBannerBg');
            const textEl = document.getElementById('newsBannerText');
            const badgeEl = document.getElementById('newsBannerBadge');

            // bgImage può essere un URL esterno, un data URI, o un
            // riferimento img:<id> a un documento di bannerImages. Nel terzo
            // caso, se l'immagine non è ancora arrivata si mostra il banner
            // senza sfondo e si ridisegna quando arriva: meglio un banner
            // sobrio per un istante che un banner mancante.
            const bgSrc = bannerImageSrc(msg.bgImage);
            if (bgSrc) {
                bgEl.style.backgroundImage = `url("${encodeURI(bgSrc).replace(/"/g, '%22')}")`;
                bgEl.classList.add('has-image');
            } else {
                bgEl.style.backgroundImage = '';
                bgEl.classList.remove('has-image');
                if (msg.bgImage) ensureBannerImages([msg.bgImage], () => renderNewsBannerSlide(msg));
            }

            textEl.textContent = msg.text;

            // Il badge compare solo se ESPLICITAMENTE attivato e con un
            // testo: Daniel può preparare il testo e tenerlo spento senza
            // doverlo cancellare.
            if (msg.badgeEnabled && msg.badge) {
                badgeEl.textContent = msg.badge;
                badgeEl.className = 'news-banner-badge news-banner-badge--' + msg.badgeColor;
                badgeEl.style.display = 'inline-block';
            } else {
                badgeEl.style.display = 'none';
            }
        }

        function startNewsBanner() {
            clearInterval(newsBannerInterval);
            const banner = document.getElementById('newsBanner');
            const slide = document.getElementById('newsBannerSlide');
            if (!banner || !slide) return;

            const cfg = pricing.newsBanner || {};
            const messages = (cfg.messages || []).map(normalizeNewsMessage).filter(m => m.text.trim());

            if (!cfg.enabled || messages.length === 0) {
                banner.style.display = 'none';
                return;
            }

            banner.style.display = 'block';
            newsBannerIndex = newsBannerIndex % messages.length;
            renderNewsBannerSlide(messages[newsBannerIndex]);
            slide.classList.remove('news-fade-out');

            if (messages.length <= 1) return; // niente da alternare

            newsBannerInterval = setInterval(() => {
                slide.classList.add('news-fade-out');
                setTimeout(() => {
                    newsBannerIndex = (newsBannerIndex + 1) % messages.length;
                    renderNewsBannerSlide(messages[newsBannerIndex]);
                    slide.classList.remove('news-fade-out');
                }, 400); // combacia con la durata della transizione CSS
            }, 5000);
        }

        // Apre/chiude uno qualunque dei pannelli richiudibili (eventi,
        // checklist, feste, storico, libreria...): un'unica funzione
        // condivisa invece di scriverne una per ciascuno.
        function toggleCollapsible(panelId) {
            const panel = document.getElementById(panelId);
            if (panel) panel.classList.toggle('collapsed');
        }

        function isSpecial(cocktailName) {
            return !!(pricing.items[cocktailName] && pricing.items[cocktailName].special);
        }

        // =============================================
        // DISPONIBILITÀ
        // Un prodotto è esaurito se: segnato a mano da Daniel,
        // oppure la sua scorta è a zero, oppure (per i cocktail)
        // manca almeno uno degli ingredienti della ricetta.
        // =============================================
        function getStock(name) {
            const item = pricing.items[baseNameOf(name)];
            const s = item ? item.stock : -1;
            return (typeof s === 'number') ? s : -1;
        }

        function getIngredientStock(id) {
            const s = pricing.ingredientStock ? pricing.ingredientStock[id] : -1;
            return (typeof s === 'number') ? s : -1;
        }

        // Ingredienti che non bastano per una dose di questo cocktail
        // (non solo "a zero": anche "meno di quanto serve alla ricetta")
        function missingIngredients(name) {
            const recipe = recipes[baseNameOf(name)];
            if (!recipe) return [];
            return Object.keys(recipe).filter(id => {
                const have = getIngredientStock(id);
                return have >= 0 && have < recipe[id];
            });
        }

        function isSoldOut(name) {
            const base = baseNameOf(name);
            const item = pricing.items[base];

            // 1) Segnato manualmente da Daniel
            if (item && item.soldOut) return true;

            // 2) Scorta del prodotto esaurita
            if (getStock(base) === 0) return true;

            // 3) Manca un ingrediente della ricetta
            if (missingIngredients(base).length > 0) return true;

            return false;
        }

        // Ingredienti sotto la soglia di riordino
        function lowStockIngredients() {
            const threshold = pricing.lowStockThreshold ?? 2;
            return ingredients.filter(i => {
                const q = getIngredientStock(i.id);
                return q >= 0 && q <= threshold;
            });
        }

        // Prodotti con poche unità rimaste
        function lowStockProducts() {
            const threshold = pricing.lowStockThreshold ?? 2;
            return allProducts.filter(p => {
                const q = getStock(p.name);
                return q >= 0 && q <= threshold;
            });
        }

        // Scala il magazzino dopo un ordine confermato
        async function decrementStock(productName) {
            const base = baseNameOf(productName);
            const item = pricing.items[base];
            let changed = false;

            // Contatore del prodotto
            if (item && typeof item.stock === 'number' && item.stock > 0) {
                item.stock -= 1;
                changed = true;
            }

            // Ingredienti della ricetta: si scala la quantità reale usata,
            // non genericamente "1 unità". Non si va mai sotto zero:
            // se restano 3cl e la ricetta ne chiede 4, si azzera a 0
            // (l'ultima dose "consuma il fondo bottiglia").
            const recipe = recipes[base];
            if (recipe && pricing.ingredientStock) {
                Object.keys(recipe).forEach(id => {
                    const q = pricing.ingredientStock[id];
                    if (typeof q === 'number' && q >= 0) {
                        pricing.ingredientStock[id] = round2(Math.max(0, q - recipe[id]));
                        changed = true;
                    }
                });
            }

            if (!changed) return;

            localStorage.setItem('cocktailPricing', JSON.stringify(pricing));
            renderCocktails();
            renderLowStockPanel();

            // Propaga il nuovo magazzino agli altri dispositivi. Scrive solo
            // settings/stock: qui siamo nel percorso di un CLIENTE che ordina,
            // e il listino non deve essere nelle sue mani.
            if (cloudReady() && isOnline()) await saveStock();
        }

        // =============================================
        // VERSIONE PREMIUM
        // Il suffisso " Premium" viene aggiunto al nome del cocktail.
        // I dati salvati (ordini/WhatsApp) usano il nome completo,
        // mentre i prezzi si basano sempre sul cocktail base.
        // =============================================
        const PREMIUM_SUFFIX = ' Premium';

        function isPremiumName(name) {
            return typeof name === 'string' && name.endsWith(PREMIUM_SUFFIX);
        }

        // Dal nome visualizzato ricava il cocktail base del listino
        function baseNameOf(name) {
            return isPremiumName(name) ? name.slice(0, -PREMIUM_SUFFIX.length) : name;
        }

        function isPremiumEnabled(cocktailName) {
            const item = pricing.items[cocktailName];
            return !!(item && item.premium);
        }

        function getPremiumSurcharge(cocktailName) {
            const item = pricing.items[cocktailName];
            const s = item ? item.premiumSurcharge : undefined;
            return (typeof s === 'number' && !isNaN(s)) ? s : 0;
        }

        // Elenco delle card da mostrare nel catalogo: i cocktail base
        // più, per quelli con premium attivo, una card dedicata.
        function getCatalogItems() {
            const list = [];
            currentProducts().forEach(c => {
                list.push({ ...c, displayName: c.name, premium: false });
                // La versione Premium esiste solo per i cocktail
                if (isCocktail(c.name) && isPremiumEnabled(c.name)) {
                    list.push({
                        ...c,
                        displayName: c.name + PREMIUM_SUFFIX,
                        premium: true
                    });
                }
            });
            return list;
        }

        // Carica il listino dal cloud (tutti gli utenti)
        // =============================================
        // MAGAZZINO IN UN DOCUMENTO A PARTE
        // Le scorte sono l'unico dato del listino che un CLIENTE deve poter
        // scrivere: ordinando, scala il contatore del prodotto e gli
        // ingredienti della ricetta. Finché stavano dentro settings/pricing,
        // dare al cliente il permesso di scalare le scorte significava dargli
        // il permesso di riscrivere tutto il listino — prezzi, orari, offerte
        // comprese, perché la scrittura è del documento intero.
        //
        // Separandole, settings/pricing può diventare scrivibile solo da
        // Daniel e Renato, e settings/stock resta aperto a chi ordina. In
        // memoria la forma non cambia (pricing.items[x].stock e
        // pricing.ingredientStock), così il resto del codice non se ne accorge.
        // =============================================
        function stockSnapshot() {
            const items = {};
            Object.keys(pricing.items || {}).forEach(n => {
                if (typeof pricing.items[n].stock === 'number') items[n] = pricing.items[n].stock;
            });
            return { items: items, ingredients: Object.assign({}, pricing.ingredientStock || {}) };
        }

        function applyStockSnapshot(snap) {
            if (!snap) return;
            Object.keys(snap.items || {}).forEach(n => {
                if (pricing.items && pricing.items[n]) pricing.items[n].stock = snap.items[n];
            });
            if (snap.ingredients) {
                pricing.ingredientStock = Object.assign({}, pricing.ingredientStock, snap.ingredients);
            }
        }

        async function saveStock() {
            if (!cloudReady()) return false;
            try {
                await firestoreDb.collection('settings').doc('stock').set(stockSnapshot());
                return true;
            } catch (error) {
                console.log('Magazzino non sincronizzato:', error);
                return false;
            }
        }

        // Il listino da salvare, senza le scorte: quelle vanno nel loro documento
        function pricingWithoutStock() {
            const copia = JSON.parse(JSON.stringify(pricing));
            Object.keys(copia.items || {}).forEach(n => { delete copia.items[n].stock; });
            delete copia.ingredientStock;
            return copia;
        }

        async function loadPricing() {
            if (!cloudReady()) return;
            try {
                const [doc, stockDoc] = await Promise.all([
                    firestoreDb.collection('settings').doc('pricing').get(),
                    firestoreDb.collection('settings').doc('stock').get()
                ]);
                if (doc.exists) {
                    const data = doc.data();
                    const merged = buildDefaultPricing();
                    // Unisce i valori salvati con i default (per cocktail aggiunti dopo)
                    if (data.items) {
                        Object.keys(merged.items).forEach(name => {
                            if (data.items[name]) {
                                merged.items[name] = {
                                    prices: data.items[name].prices || merged.items[name].prices,
                                    special: !!data.items[name].special,
                                    soldOut: !!data.items[name].soldOut,
                                    stock: (typeof data.items[name].stock === 'number') ? data.items[name].stock : -1,
                                    premium: !!data.items[name].premium,
                                    premiumSurcharge: (typeof data.items[name].premiumSurcharge === 'number')
                                        ? data.items[name].premiumSurcharge
                                        : merged.items[name].premiumSurcharge
                                };
                            }
                        });
                    }
                    if (data.timeSurcharge) merged.timeSurcharge = data.timeSurcharge;
                    if (data.ingredientStock) merged.ingredientStock = data.ingredientStock;
                    if (typeof data.lowStockThreshold === 'number') merged.lowStockThreshold = data.lowStockThreshold;
                    if (data.amazonLinks) merged.amazonLinks = data.amazonLinks;
                    if (data.choreItems) merged.choreItems = { ...merged.choreItems, ...data.choreItems };
                    if (data.partyItems) merged.partyItems = { ...merged.partyItems, ...data.partyItems };
                    if (data.newsBanner) merged.newsBanner = data.newsBanner;
                    if (data.service) {
                        merged.service = {
                            manualOverride: (data.service.manualOverride === undefined) ? null : data.service.manualOverride,
                            closeReason: data.service.closeReason || null,
                            lockedBy: data.service.lockedBy || null,
                            hours: data.service.hours || merged.service.hours
                        };
                    }

                    // Il magazzino arriva dal suo documento e ha la precedenza.
                    // Se non c'è ancora (primo avvio dopo la separazione), restano
                    // i valori che erano dentro il listino: la migrazione avviene
                    // da sola al primo salvataggio dell'admin.
                    if (stockDoc.exists) {
                        const snap = stockDoc.data();
                        Object.keys(snap.items || {}).forEach(n => {
                            if (merged.items && merged.items[n]) merged.items[n].stock = snap.items[n];
                        });
                        if (snap.ingredients) {
                            merged.ingredientStock = Object.assign({}, merged.ingredientStock, snap.ingredients);
                        }
                    }

                    // Aggiorna l'interfaccia solo se qualcosa è davvero cambiato:
                    // altrimenti le card si rianimerebbero a ogni controllo.
                    const changed = JSON.stringify(merged) !== JSON.stringify(pricing);
                    pricing = merged;
                    localStorage.setItem('cocktailPricing', JSON.stringify(pricing));

                    // Semina il documento del magazzino la prima volta, dal
                    // dispositivo che ha il permesso di scriverlo tutto.
                    if (!stockDoc.exists && isAdmin()) saveStock();

                    // Una volta per sessione: via le immagini del banner che
                    // nessun messaggio cita più (si accumulano se si carica
                    // una foto e poi si chiude il form senza salvare).
                    pulisciImmaginiBannerOrfane();

                    if (changed) {
                        renderCocktails();
                        updatePriceDisplay();
                        updateServiceBanner();
                        renderLowStockPanel();
                        renderSupervisorPanel();
                        startNewsBanner();
                    }
                }
            } catch (error) {
                console.log('Listino non disponibile, uso valori locali:', error);
            }
        }

        // Salva il listino sul cloud (solo admin)
        async function savePricing() {
            if (!cloudReady() || !isAdmin()) return false;
            try {
                // Listino e magazzino in due documenti: il primo lo scrive solo
                // Daniel, il secondo anche chi ordina.
                await firestoreDb.collection('settings').doc('pricing').set(pricingWithoutStock());
                await saveStock();
                localStorage.setItem('cocktailPricing', JSON.stringify(pricing));
                return true;
            } catch (error) {
                console.log('Errore salvataggio listino:', error);
                return false;
            }
        }

        // =============================================
        // STATO DEL SERVIZIO
        // L'interruttore manuale ha la precedenza sugli orari:
        // serve per chiusure anticipate o aperture straordinarie.
        // =============================================
        function getServiceConfig() {
            return (pricing.service) || { manualOverride: null, hours: {} };
        }

        function minutesOf(hhmm) {
            const [h, m] = String(hhmm || '0:00').split(':').map(Number);
            return (h || 0) * 60 + (m || 0);
        }

        // Orario di oggi secondo la programmazione
        function todaySchedule() {
            const cfg = getServiceConfig();
            const day = new Date().getDay();
            return (cfg.hours && cfg.hours[day]) || { open: '10:00', close: '24:00', closed: false };
        }

        // Il servizio è aperto in base al solo orario programmato?
        function isOpenBySchedule() {
            const sched = todaySchedule();
            if (sched.closed) return false;

            const now = new Date();
            const nowMin = now.getHours() * 60 + now.getMinutes();
            const openMin = minutesOf(sched.open);
            let closeMin = minutesOf(sched.close);

            // Chiusura dopo mezzanotte (es. 10:00 → 01:00):
            // l'intervallo scavalca il giorno, va gestito a parte.
            if (closeMin <= openMin) {
                return nowMin >= openMin || nowMin < closeMin;
            }
            return nowMin >= openMin && nowMin < closeMin;
        }

        // Stato effettivo: l'override manuale vince sugli orari
        function isServiceOpen() {
            const cfg = getServiceConfig();
            if (cfg.manualOverride === true) return true;
            if (cfg.manualOverride === false) return false;
            return isOpenBySchedule();
        }

        // Prossimo orario di apertura, da mostrare al cliente
        function nextOpeningText() {
            const cfg = getServiceConfig();
            if (cfg.manualOverride === false) return '';  // chiusura straordinaria: nessun orario certo

            const now = new Date();
            for (let i = 0; i < 8; i++) {
                const d = new Date(now.getTime() + i * 86400000);
                const sched = (cfg.hours && cfg.hours[d.getDay()]) || null;
                if (!sched || sched.closed) continue;
                if (i === 0 && minutesOf(sched.open) <= now.getHours() * 60 + now.getMinutes()) continue;
                if (i === 0) return sched.open;
                if (i === 1) return t('tomorrowAt').replace('{time}', sched.open);
                const days = [t('daySun'), t('dayMon'), t('dayTue'), t('dayWed'), t('dayThu'), t('dayFri'), t('daySat')];
                return days[d.getDay()] + ' ' + sched.open;
            }
            return '';
        }

        // Aggiorna la fascia di avviso in cima all'app
        function updateServiceBanner() {
            const banner = document.getElementById('serviceBanner');
            if (!banner) return;

            if (isServiceOpen()) {
                banner.style.display = 'none';
            } else if (getServiceConfig().closeReason === 'study') {
                // Chiusura per motivi scolastici: un messaggio diverso da
                // quello generico, per non far pensare a un imprevisto.
                document.getElementById('serviceBannerText').textContent = t('serviceClosedStudy');
                banner.style.display = 'block';
            } else {
                const next = nextOpeningText();
                document.getElementById('serviceBannerText').textContent = next
                    ? t('serviceClosedUntil').replace('{time}', next)
                    : t('serviceClosed');
                banner.style.display = 'block';
            }
            updateLayoutOffset();
            renderCocktails();
        }

        // Le fasce fisse in cima non devono coprire il contenuto
        function updateLayoutOffset() {
            const offline = document.getElementById('offlineBanner');
            const service = document.getElementById('serviceBanner');
            let top = 20;
            if (offline && offline.style.display !== 'none') top += 34;
            if (service && service.style.display !== 'none') top += 34;
            document.body.style.paddingTop = top + 'px';
        }

        let currentLang = localStorage.getItem('appLanguage') || 'it';

        function t(key) {
            return (translations[currentLang] && translations[currentLang][key]) || translations.it[key] || key;
        }

        function translateDescription(desc) {
            if (currentLang === 'it') return desc;
            const langData = cocktailUiTranslations[currentLang];
            return (langData && langData.descriptions[desc]) || desc;
        }

        function translateVariant(variant) {
            if (currentLang === 'it') return variant;
            const langData = cocktailUiTranslations[currentLang];
            return (langData && langData.variants[variant]) || variant;
        }

        function translateLocation(loc) {
            const map = {
                'Dove Sono io': 'locWhereIAm',
                'In Casa': 'locHome',
                'In Giardino': 'locGarden'
            };
            return map[loc] ? t(map[loc]) : loc;
        }

        function translateTime(time) {
            const map = {
                'Subito': 'timeNow',
                '10 minuti': 'time10',
                '30 minuti': 'time30'
            };
            return map[time] ? t(map[time]) : time;
        }

        // Apply translations to all elements with data-i18n / data-i18n-placeholder
        function applyTranslations() {
            document.documentElement.lang = currentLang;

            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                el.innerHTML = t(key);
            });

            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                el.setAttribute('placeholder', t(key));
            });

            document.getElementById('langBtnIt').classList.toggle('active', currentLang === 'it');
            document.getElementById('langBtnEn').classList.toggle('active', currentLang === 'en');
            document.getElementById('langBtnEs').classList.toggle('active', currentLang === 'es');
            document.getElementById('langBtnDe').classList.toggle('active', currentLang === 'de');
            document.getElementById('langBtnFr').classList.toggle('active', currentLang === 'fr');
            document.getElementById('langBtnUk').classList.toggle('active', currentLang === 'uk');
            document.getElementById('langBtnPt').classList.toggle('active', currentLang === 'pt');
        }

        // Change language
        function setLanguage(lang) {
            currentLang = lang;
            localStorage.setItem('appLanguage', lang);
            applyTranslations();
            renderCocktails();
            renderOrders();
        }

        let selectedCocktail = null;
        let selectedVariant = null;
        let selectedDeliveryTime = 'Subito'; // Default value
        let selectedLocation = 'Dove Sono io'; // Default value
        let orders = JSON.parse(localStorage.getItem('cocktailOrders') || '[]');
        let ordersPage = 1;              // Pagina corrente dello storico ordini
        const ORDERS_PER_PAGE = 3;       // Numero di ordini mostrati per pagina
        let pendingPayments = [];        // Richieste di pagamento in attesa (vista admin)
        let myPaymentPending = false;    // Il cliente ha una richiesta in attesa?
        let myPendingOrderIds = [];      // ID degli ordini inclusi nella richiesta in attesa
        let customerName = localStorage.getItem('customerName') || '';
        // Numero di Daniel in formato internazionale, prefisso paese incluso
        // e senza + né spazi né zeri iniziali: è il formato che vogliono sia
        // wa.me sia lo schema whatsapp://. Con il solo numero locale il
        // collegamento può non risolvere, tipicamente da SIM estera o da
        // desktop, dove non c'è un paese da cui dedurre il prefisso.
        const ADMIN_PHONE = '393515292930';

        // Genera un ID utente univoco a partire dal nome (case/spazi insensitive)
        // Es: " Marco Rossi " e "marco rossi" → "marco_rossi"
        function getUserId(name) {
            return (name || '')
                .trim()
                .toLowerCase()
                .replace(/\s+/g, '_');
        }

        // =============================================
        // MODALITÀ ADMIN
        // Chi si registra con uno di questi nomi vede TUTTI gli ordini
        // =============================================
        const ADMIN_USER_IDS = ['daniel'];
        const SUPERADMIN_USER_IDS = ['renato']; // supervisiona, ma non gestisce operativamente

        // Con gli UID configurati (vedi ADMIN_UIDS più sotto) il ruolo viene
        // dall'account con cui si è entrati, e coincide con quello che le
        // regole Firestore impongono sul server. Senza UID configurati si
        // ricade sul nome, come prima: è la fase di transizione, in cui
        // l'aggiornamento è pubblicabile ma il muro non c'è ancora.
        function isAdmin() {
            if (authEnforced()) return ADMIN_UIDS.includes(authUid);
            return ADMIN_USER_IDS.includes(getUserId(customerName));
        }

        function isSuperAdmin() {
            if (authEnforced()) return SUPERADMIN_UIDS.includes(authUid);
            return SUPERADMIN_USER_IDS.includes(getUserId(customerName));
        }

        // Il nome dice chi DOVREBBE avere poteri; l'uid dice chi li ha.
        // Serve a mostrare il pulsante "Accedi" a Daniel e Renato, e solo a
        // loro, quando gli UID sono configurati ma non hanno ancora fatto
        // l'accesso su questo dispositivo.
        function claimsPrivilegedName() {
            const id = getUserId(customerName);
            return ADMIN_USER_IDS.includes(id) || SUPERADMIN_USER_IDS.includes(id);
        }

        function needsAdminSignIn() {
            return authEnforced() && claimsPrivilegedName() && !canSupervise();
        }

        // Vede tutto ciò che vede Daniel, ma non è detto che possa agire:
        // usata per decidere COSA MOSTRARE, mai per decidere cosa si può
        // FARE (i pulsanti operativi restano condizionati a isAdmin()).
        function canSupervise() {
            return isAdmin() || isSuperAdmin();
        }

        // =============================================
        // CONTROLLO DIRETTO MODALITÀ STUDIO (solo superadmin)
        // L'unica azione di scrittura concessa a Renato: mettere in pausa
        // o riattivare il servizio per motivi scolastici, senza passare
        // dal listino completo (che resta esclusivo di Daniel).
        // =============================================
        // Riferimento chiamato da showGreeting/polling: il pannello di
        // supervisione oggi è il controllo Modalità studio. Tenerlo come
        // funzione a parte lascia spazio ad altri controlli futuri.
        function renderSupervisorPanel() {
            renderSuperStudyControl();
            renderSuperNewsBannerEditor();
        }

        // Riempie il pannello di Renato con le card correnti dei messaggi:
        // stessa interfaccia del listino di Daniel, ma un salvataggio a
        // parte che tocca solo il banner, non il resto dei prezzi.
        function renderSuperNewsBannerEditor() {
            const panel = document.getElementById('superNewsBannerPanel');
            if (!panel) return;
            if (!isSuperAdmin()) { panel.style.display = 'none'; return; }

            panel.style.display = 'block';
            const cfg = pricing.newsBanner || { enabled: true, messages: [] };
            document.getElementById('superNewsBannerCount').textContent = cfg.messages.length;
            document.getElementById('newsBannerEnabledSuper').checked = cfg.enabled;
            document.getElementById('newsMsgRowsSuper').innerHTML = buildNewsMsgCardsHTML(cfg.messages);
        }

        async function saveNewsBannerAsSupervisor() {
            if (!isSuperAdmin()) return;

            const newsMessages = Array.from(document.querySelectorAll('#newsMsgRowsSuper .news-msg-card'))
                .map(card => ({
                    text: card.querySelector('[data-news-text]').value.trim(),
                    bgImage: card.querySelector('[data-news-bg]').value.trim(),
                    badge: card.querySelector('[data-news-badge]').value.trim(),
                    badgeEnabled: card.querySelector('[data-news-badge-enabled]').checked,
                    badgeColor: card.querySelector('[data-news-badge-color]').value
                }))
                .filter(m => m.text);

            pricing.newsBanner = {
                enabled: document.getElementById('newsBannerEnabledSuper').checked,
                messages: newsMessages
            };

            startNewsBanner(); // effetto visibile subito sul proprio dispositivo

            if (cloudReady()) {
                try {
                    // Solo il proprio sottoalbero: scrivere tutto il listino
                    // rimetterebbe dentro anche le scorte, che ora vivono a parte.
                    await firestoreDb.collection('settings').doc('pricing')
                        .set({ newsBanner: pricing.newsBanner }, { merge: true });
                } catch (error) {
                    console.log('Errore salvataggio banner (supervisore):', error);
                }
            }

            const successMsg = document.getElementById('successMessage');
            successMsg.textContent = t('priceListSaved');
            successMsg.classList.add('show');
            setTimeout(() => successMsg.classList.remove('show'), 3000);
        }

        function renderSuperStudyControl() {
            const panel = document.getElementById('superStudyControlPanel');
            if (!panel) return;
            if (!isSuperAdmin()) { panel.style.display = 'none'; return; }

            panel.style.display = 'block';
            const cfg = getServiceConfig();
            const inStudyMode = cfg.manualOverride === false && cfg.closeReason === 'study';

            const statusText = document.getElementById('superStudyStatusText');
            const toggleBtn = document.getElementById('superStudyToggleBtn');

            if (inStudyMode) {
                const total = studyChecklist.items.length;
                const done = studyChecklist.items.filter(i => i.done).length;
                const checklistComplete = total > 0 && done === total;

                statusText.innerHTML = `📚 Il servizio è in pausa per motivi scolastici.<br>` +
                    `Checklist di Daniel: <strong>${done}/${total}</strong> completata` +
                    (checklistComplete ? ' ✅' : ' ⏳');

                toggleBtn.textContent = '🟢 Riattiva il servizio';
                // Il pulsante resta sempre attivo: la checklist informa la
                // decisione di Renato, non gliela impone. La scelta finale
                // resta sua, anche a checklist non finita.
                toggleBtn.disabled = false;
                toggleBtn.title = '';
            } else {
                statusText.textContent = 'Il servizio segue gli orari/impostazioni normali di Daniel.';
                toggleBtn.textContent = '🎓 Metti in pausa per studio';
                toggleBtn.disabled = false;
                toggleBtn.title = '';
            }
        }

        async function toggleStudyModeDirect() {
            if (!isSuperAdmin()) return;

            const cfg = getServiceConfig();
            const inStudyMode = cfg.manualOverride === false && cfg.closeReason === 'study';

            if (inStudyMode) {
                // La checklist informa la decisione, ma Renato può sempre
                // riattivare: se non è completa, glielo ricorda e chiede
                // conferma esplicita invece di impedirglielo.
                const total = studyChecklist.items.length;
                const done = studyChecklist.items.filter(i => i.done).length;
                const checklistComplete = total > 0 && done === total;

                const confirmMsg = checklistComplete
                    ? 'Checklist completata! Riattivare il servizio del chiosco?'
                    : `Attenzione: la checklist di Daniel è a ${done}/${total}, non ancora completa. Riattivare comunque il servizio?`;
                if (!confirm(confirmMsg)) return;

                pricing.service.manualOverride = null; // torna agli orari automatici
                pricing.service.closeReason = null;
                pricing.service.lockedBy = null;
            } else {
                if (!confirm('Mettere in pausa il servizio per motivi scolastici? Solo tu potrai riattivarlo — vedrai lo stato della checklist di Daniel per decidere quando.')) return;
                pricing.service.manualOverride = false;
                pricing.service.closeReason = 'study';
                pricing.service.lockedBy = 'superadmin';
            }

            renderSuperStudyControl();
            updateServiceBanner();

            if (cloudReady()) {
                try {
                    await firestoreDb.collection('settings').doc('pricing')
                        .set({ service: pricing.service }, { merge: true });
                } catch (error) {
                    console.log('Errore aggiornamento modalità studio:', error);
                }
            }
        }

        // Check if user is registered
        function checkRegistration() {
            if (!customerName) {
                document.getElementById('welcomeModal').classList.add('active');
            } else {
                showGreeting();
                loadOrdersFromCloud();
            }
        }

        // Save first-time registration
        function saveRegistration() {
            const name = document.getElementById('regName').value.trim();
            if (!name) {
                alert(t('enterNameAlert'));
                document.getElementById('regName').focus();
                return;
            }
            customerName = name;
            localStorage.setItem('customerName', customerName);
            document.getElementById('welcomeModal').classList.remove('active');
            showGreeting();
            // Carica dal cloud gli ordini già associati a questo nome (da altri dispositivi)
            loadOrdersFromCloud();
            if (canSupervise()) { loadPendingPayments(); } else { checkMyPaymentStatus(); }
            // Questi caricamenti ora sono legati all'identità (chiedono al
            // database solo i propri dati), quindi all'avvio dell'app non
            // avevano ancora un nome su cui filtrare: si rifanno adesso,
            // senza far aspettare il prossimo giro di polling.
            loadChoresFromCloud();
            loadPartyBookingsFromCloud();
            loadMyLibraryFromCloud();
            loadDonationsFromCloud();
        }

        // Change name (pencil button)
        function changeUserName() {
            // Difesa in profondità: anche se il pulsante è nascosto,
            // la funzione stessa rifiuta di procedere per chiunque non
            // sia il supervisore.
            if (!isSuperAdmin()) return;

            const newName = prompt(t('changeName'), customerName);
            if (newName && newName.trim()) {
                customerName = newName.trim();
                localStorage.setItem('customerName', customerName);

                // Cambiando identità (magari da admin a cliente o viceversa)
                // ricarichiamo l'intera app invece di ripulire a mano ogni
                // singola variabile in memoria (ordini, saldo carta,
                // lavoretti, magazzino...): con tante funzionalità aggiunte
                // nel tempo, un elenco manuale rischia sempre di dimenticarne
                // una e lasciare in giro dati del vecchio utente.
                location.reload();
            }
        }

        // Show greeting bar
        function showGreeting() {
            const roleTag = isAdmin() ? ' (ADMIN)' : (isSuperAdmin() ? ' (SUPERVISORE)' : '');
            document.getElementById('greetingName').textContent = customerName + roleTag;
            document.getElementById('userGreeting').style.display = 'block';
            const priceBtn = document.getElementById('priceListBtn');
            if (priceBtn) priceBtn.style.display = isAdmin() ? 'inline-block' : 'none'; // il listino resta solo di Daniel
            const avatar = document.getElementById('adminAvatar');
            if (avatar) avatar.style.display = isAdmin() ? 'inline-block' : 'none';
            const helpBtn = document.getElementById('helpBtn');
            if (helpBtn) helpBtn.style.display = 'flex'; // guida disponibile per tutti, admin e clienti
            const myAreaBtn = document.getElementById('myAreaBtn');
            if (myAreaBtn) myAreaBtn.style.display = 'flex';
            updateHelpButtonDot();
            // Solo il supervisore può cambiare utente: evita che chiunque
            // sul dispositivo passi a un altro nome (es. diventare admin
            // scrivendo "Daniel") senza che sia una scelta deliberata di Renato.
            const changeNameBtn = document.getElementById('changeNameBtn');
            if (changeNameBtn) changeNameBtn.style.display = isSuperAdmin() ? 'inline-block' : 'none';

            // "Accedi" solo a chi porta un nome con poteri e non ha ancora un
            // account su questo dispositivo. Un cliente non lo vede mai: per
            // ordinare un cocktail non si fa il login.
            const signIn = document.getElementById('adminSignInBtn');
            if (signIn) signIn.style.display = needsAdminSignIn() ? 'inline-block' : 'none';
            const signOut = document.getElementById('adminSignOutBtn');
            if (signOut) signOut.style.display = (authEnforced() && canSupervise()) ? 'inline-block' : 'none';

            renderWalletPanel();
            renderSupervisorPanel();
        }

        // =============================================
        // FIREBASE CONFIG
        // Inserisci qui la configurazione del tuo progetto Firebase
        // (Firebase Console → Impostazioni progetto → Le tue app → Config)
        // =============================================
        const firebaseConfig = {
            apiKey: "AIzaSyD4-aaRF7E2KFHLE9GY8xSe3dwyb_veNJI",
            authDomain: "cocktail-daniel.firebaseapp.com",
            projectId: "cocktail-daniel",
            storageBucket: "cocktail-daniel.firebasestorage.app",
            messagingSenderId: "942098944901",
            appId: "1:942098944901:web:6df0d9a5039afca7f02aec"
        };

        let firestoreDb = null;
        let firebaseAuth = null;
        let authUid = null;          // uid del client, anonimo o con login

        // =============================================
        // CHI SEI, DAVVERO
        // Il ruolo veniva dal NOME digitato alla registrazione: chiunque
        // scrivesse "Daniel" diventava admin. Andava bene finché la regola
        // esisteva solo nel browser, cioè finché non contava niente: le
        // regole Firestore erano aperte e chiunque potesse leggere il
        // sorgente poteva scrivere qualunque documento chiamando l'API.
        //
        // Ora Daniel e Renato hanno un account vero (email e password) e le
        // regole Firestore riconoscono i loro uid. Il nome resta l'identità
        // dei clienti — nessun login per loro, e lo stesso nome continua a
        // ritrovare i propri ordini da un altro dispositivo — ma i poteri
        // (listino, prezzi, conferme di pagamento, accrediti sul saldo,
        // checklist, cancellazioni) sono legati all'uid e imposti dal
        // server, non dal browser.
        //
        // ⚠️ DA COMPLETARE IN CONSOLE FIREBASE, in questo ordine:
        //   1. Authentication → Sign-in method → abilita "Anonimo" e
        //      "Email/password".
        //   2. Authentication → Users → crea l'account di Daniel e quello di
        //      Renato, e copia i loro UID.
        //   3. Incolla quegli UID qui sotto.
        //   4. Pubblica firestore.rules (con gli stessi UID dentro).
        // Finché gli elenchi qui sotto sono vuoti l'app continua a funzionare
        // come prima, col ruolo dedotto dal nome: così questo aggiornamento si
        // può pubblicare subito, senza restare a metà. Ma il muro non c'è
        // ancora — arriva col punto 4.
        const ADMIN_UIDS = [];       // es. ['aBcD1234...']  ← UID di Daniel
        const SUPERADMIN_UIDS = [];  // es. ['eFgH5678...']  ← UID di Renato

        // Pubblicare gli UID qui non è un problema: conoscere un uid non
        // permette di autenticarsi come quell'utente. Serve la password.
        function authEnforced() {
            return ADMIN_UIDS.length > 0 || SUPERADMIN_UIDS.length > 0;
        }

        function isApiConfigured() {
            return firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('INCOLLA_QUI') &&
                   firebaseConfig.projectId && !firebaseConfig.projectId.includes('INCOLLA_QUI');
        }

        // Inizializza Firebase in modo tollerante: se lo script CDN non è
        // raggiungibile (rete assente), l'app continua a funzionare in locale.
        if (isApiConfigured()) {
            try {
                firebase.initializeApp(firebaseConfig);
                firestoreDb = firebase.firestore();
                firebaseAuth = firebase.auth ? firebase.auth() : null;
            } catch (error) {
                console.log('Firebase non disponibile, modalità locale:', error);
                firestoreDb = null;
                firebaseAuth = null;
            }
        }

        // Il cloud è utilizzabile solo se configurato E inizializzato correttamente
        function cloudReady() {
            return isApiConfigured() && firestoreDb !== null;
        }

        // Accesso silenzioso: ogni dispositivo ottiene un token anonimo
        // all'avvio, senza che l'utente faccia nulla. Daniel e Renato poi
        // accedono col loro account e il token diventa il loro.
        //
        // Se l'accesso anonimo non è ancora abilitato in console, la chiamata
        // fallisce: si registra il motivo e si va avanti. Con le regole
        // ancora aperte l'app funziona comunque; con le regole nuove no, ed è
        // per questo che l'ordine dei quattro passi qui sopra conta.
        async function signInSilently() {
            if (!firebaseAuth) return null;
            try {
                if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
                const cred = await firebaseAuth.signInAnonymously();
                return cred.user;
            } catch (error) {
                console.log('Accesso anonimo non riuscito:', error && error.code, '— abilitalo in Firebase Console → Authentication → Sign-in method');
                return null;
            }
        }

        // Accesso di Daniel o Renato. Ritorna una stringa d'errore da mostrare,
        // oppure null se è andata.
        async function signInAsAdmin(email, password) {
            if (!firebaseAuth) return t('authUnavailable');
            try {
                const cred = await firebaseAuth.signInWithEmailAndPassword(email, password);
                authUid = cred.user.uid;
                if (authEnforced() && !ADMIN_UIDS.includes(authUid) && !SUPERADMIN_UIDS.includes(authUid)) {
                    // Account valido ma non fra quelli che hanno poteri:
                    // meglio dirlo che lasciare credere di essere admin.
                    return t('authNotAnAdmin');
                }
                return null;
            } catch (error) {
                console.log('Accesso non riuscito:', error && error.code);
                return t('authSignInFailed');
            }
        }

        async function signOutAdmin() {
            if (!firebaseAuth) return;
            try { await firebaseAuth.signOut(); } catch (e) { /* si ricade sull'anonimo */ }
            location.reload(); // ripulisce ogni dato del vecchio ruolo, come il cambio nome
        }

        function openAdminAuth() {
            document.getElementById('adminAuthEmail').value = '';
            document.getElementById('adminAuthPassword').value = '';
            document.getElementById('adminAuthError').style.display = 'none';
            document.getElementById('adminAuthModal').classList.add('active');
        }

        function closeAdminAuth() {
            document.getElementById('adminAuthModal').classList.remove('active');
        }

        async function submitAdminAuth() {
            const email = document.getElementById('adminAuthEmail').value.trim();
            const password = document.getElementById('adminAuthPassword').value;
            const errBox = document.getElementById('adminAuthError');
            if (!email || !password) {
                errBox.textContent = t('authMissingFields');
                errBox.style.display = 'block';
                return;
            }
            const errore = await signInAsAdmin(email, password);
            if (errore) {
                errBox.textContent = errore;
                errBox.style.display = 'block';
                return;
            }
            closeAdminAuth();
            // Il ruolo è cambiato: si ricarica, come al cambio nome, invece di
            // rimettere a posto a mano ogni pannello e ogni dato in memoria.
            location.reload();
        }

        // Avvio dell'autenticazione, agganciato al ciclo di vita dell'app.
        // Le letture iniziali partono DOPO che c'è un token, altrimenti con le
        // regole nuove verrebbero rifiutate e i pannelli resterebbero vuoti
        // fino al giro di polling successivo.
        async function initAuth() {
            if (!firebaseAuth) {
                if (authEnforced()) console.log('SDK auth non caricato: i permessi non possono essere verificati');
                return;
            }
            const user = firebaseAuth.currentUser || await signInSilently();
            authUid = user ? user.uid : null;
            if (!authEnforced()) {
                console.log('Autenticazione attiva ma UID admin non ancora configurati: il ruolo viene dal nome. Vedi ADMIN_UIDS in index.html.');
            }
        }

        // Load orders from Firestore
        // Admin (Daniel) vede TUTTI gli ordini, gli altri solo i propri
        async function loadOrdersFromCloud() {
            if (!cloudReady() || !customerName) return;
            try {
                let query = firestoreDb.collection('orders');
                if (!canSupervise()) {
                    query = query.where('userId', '==', getUserId(customerName));
                }
                const snapshot = await query.get();
                const allCloudOrders = snapshot.docs.map(doc => doc.data());

                // Ordini rifiutati: vanno esclusi dalla lista e dal totale.
                // Il cliente riceve l'avviso col motivo; l'admin li ha già
                // fatti sparire dalla propria vista al momento del rifiuto.
                const rejected = allCloudOrders.filter(o => o.rejected);
                const cloudOrders = allCloudOrders.filter(o => !o.rejected);

                if (rejected.length && !isAdmin()) {
                    handleRejectedOrders(rejected);
                }

                // Gli ordini creati offline non sono ancora sul cloud:
                // vanno conservati, altrimenti sparirebbero dalla lista.
                const cloudIds = new Set(cloudOrders.map(o => o.id));
                const queuedOrders = getPendingQueue().filter(o => {
                    if (cloudIds.has(o.id)) return false;
                    return isAdmin() || o.userId === getUserId(customerName);
                });

                orders = cloudOrders.concat(queuedOrders)
                    .sort((a, b) => b.id - a.id);
                localStorage.setItem('cocktailOrders', JSON.stringify(orders));
                renderOrders();
            } catch (error) {
                console.log('Cloud non disponibile, uso dati locali:', error);
            }
        }

        // Save single order to Firestore
        async function saveOrderToCloud(order) {
            // Se il cloud non è disponibile o manca la rete, l'ordine finisce
            // in coda e verrà inviato appena la connessione torna.
            if (!cloudReady() || !isOnline()) {
                queueOrderForSync(order);
                return;
            }
            try {
                await firestoreDb.collection('orders').doc(String(order.id)).set(order);
            } catch (error) {
                console.log('Salvataggio cloud fallito, ordine messo in coda:', error);
                queueOrderForSync(order);
            }
        }

        // Save orders to localStorage (cache locale)
        function saveOrders() {
            localStorage.setItem('cocktailOrders', JSON.stringify(orders));
        }

        // Rimosse clearOrders() e clearOrdersOnCloud(): nessuna riga le
        // chiamava, nessun pulsante le raggiungeva. La seconda cancellava in
        // un batch TUTTI gli ordini della collezione quando chi la invocava
        // era admin — un'arma carica senza grilletto, e finché le regole
        // Firestore restano aperte era invocabile anche dalla console del
        // browser da chiunque si registri come "Daniel".

        // Il cliente richiede la chiusura del conto: crea una richiesta in attesa
        // che solo l'admin (Daniel) potrà confermare.
        // =============================================
        // CARTA PREPAGATA E SCONTO FEDELTÀ
        // Il cliente carica credito (Daniel conferma di aver ricevuto i
        // contanti, come per i pagamenti); pagando poi con quel credito
        // ottiene il 10% di sconto — è l'incentivo a ricaricare prima
        // invece di pagare volta per volta.
        // =============================================
        const CARD_DISCOUNT = 0.10; // 10%
        let walletBalance = 0;
        let myPendingTopup = null; // { id, amount } — richiesta di ricarica in attesa

        try {
            const cached = localStorage.getItem('walletBalance');
            if (cached !== null) walletBalance = parseFloat(cached) || 0;
            const cachedTopup = localStorage.getItem('myPendingTopup');
            if (cachedTopup) myPendingTopup = JSON.parse(cachedTopup);
        } catch (e) { /* usa i valori di default */ }

        function walletDocId() {
            return getUserId(customerName);
        }

        async function loadWalletFromCloud() {
            if (!cloudReady() || !customerName) return;
            try {
                const doc = await firestoreDb.collection('wallets').doc(walletDocId()).get();
                walletBalance = doc.exists ? (doc.data().balance || 0) : 0;
                localStorage.setItem('walletBalance', String(walletBalance));
                renderWalletPanel();
            } catch (error) {
                console.log('Saldo carta non disponibile:', error);
            }
        }

        // Tocco sulla scheda "La mia carta": rilegge subito il saldo da
        // Firestore invece di aspettare il prossimo giro di polling
        // automatico (~15s) — utile appena dopo che Daniel ha confermato
        // una ricarica, per vederla comparire senza attendere.
        async function refreshWalletOnTap() {
            const panel = document.getElementById('myWalletPanel');
            if (panel) panel.classList.add('wallet-refreshing');
            await loadWalletFromCloud();
            if (panel) setTimeout(() => panel.classList.remove('wallet-refreshing'), 400);
        }

        // Allinea copia in memoria, cache locale e pannello. Non tocca il
        // cloud: quello passa sempre da una transazione, qui sotto.
        function setLocalWalletBalance(value) {
            walletBalance = Math.max(0, round2(value));
            localStorage.setItem('walletBalance', String(walletBalance));
            renderWalletPanel();
        }

        // ADDEBITO ATOMICO
        // Leggere il saldo, decidere e poi riscriverlo con un valore assoluto
        // era il modo per perdere soldi: se Daniel confermava una ricarica
        // nello stesso momento, l'ultima scrittura cancellava l'altra. Qui
        // lettura, verifica e scrittura stanno in un'unica transazione, che
        // Firestore ripete da sola se il documento cambia nel frattempo.
        //
        // clamp=true serve a "dono tutto": l'importo viene limitato al saldo
        // reale al momento della transazione, non a quello letto prima.
        // Con clamp=false un saldo diventato insufficiente fa fallire
        // l'operazione invece di addebitare un importo sbagliato.
        //
        // Ritorna { ok: true, addebitato, saldo } oppure
        // { ok: false, motivo: 'offline' | 'insufficiente' | 'errore' }.
        async function debitWallet(amount, clamp) {
            const richiesto = round2(amount);
            if (!(richiesto > 0)) return { ok: false, motivo: 'insufficiente' };

            // Senza cloud non esiste un saldo verificabile: meglio rifiutare
            // che scalare credito basandosi su un valore in cache.
            if (!cloudReady() || !customerName) return { ok: false, motivo: 'offline' };

            const ref = firestoreDb.collection('wallets').doc(walletDocId());
            const EPSILON = 0.01; // assorbe gli arrotondamenti dei decimali

            try {
                const esito = await firestoreDb.runTransaction(async (tx) => {
                    const doc = await tx.get(ref);
                    const attuale = doc.exists ? (doc.data().balance || 0) : 0;

                    let addebito = richiesto;
                    if (clamp) addebito = Math.min(addebito, round2(attuale));
                    if (addebito > attuale + EPSILON) return { ok: false, motivo: 'insufficiente' };
                    addebito = Math.min(addebito, round2(attuale)); // mai sotto zero per un centesimo

                    // Un addebito che non sposta niente (saldo già a zero, o
                    // clamp che azzera l'importo) non va scritto: le regole
                    // Firestore concedono al cliente solo un saldo che SCENDE,
                    // quindi una scrittura a parità verrebbe rifiutata. Meglio
                    // uscire qui, con un motivo leggibile, che farsi negare il
                    // permesso a metà operazione.
                    if (addebito <= 0) return { ok: false, motivo: 'insufficiente' };

                    const nuovo = Math.max(0, round2(attuale - addebito));
                    tx.set(ref, {
                        userId: walletDocId(),
                        customerName: customerName,
                        balance: nuovo
                    }, { merge: true });
                    return { ok: true, addebitato: round2(addebito), saldo: nuovo };
                });

                if (esito.ok) setLocalWalletBalance(esito.saldo);
                return esito;
            } catch (error) {
                console.log('Addebito carta non riuscito:', error);
                return { ok: false, motivo: 'errore' };
            }
        }

        // L'ACCREDITO NON PASSA DA QUI
        // C'era una creditWallet() generica. Non è più chiamata da nessuno, e
        // va bene così: l'unico accredito legittimo è la conferma di una
        // ricarica, e vive nella transazione dentro confirmTopupReceived —
        // dove sta insieme alla cancellazione della richiesta, che è ciò che
        // lo rende non ripetibile.
        //
        // Tenere un accredito a disposizione del codice cliente avrebbe
        // obbligato le regole Firestore a permettere a un cliente di far
        // SALIRE il proprio saldo, e con quella porta aperta "nessuno si
        // regala credito" non sarebbe più stato vero. I percorsi che prima
        // rimborsavano sono stati riordinati per non averne bisogno.

        // Mostra il pannello "La mia carta" solo ai clienti (non a Daniel)
        function renderWalletPanel() {
            const panel = document.getElementById('myWalletPanel');
            if (!panel) return;
            if (isAdmin() || !customerName) { panel.style.display = 'none'; return; }

            panel.style.display = 'block';
            document.getElementById('walletBalanceAmount').textContent = formatPrice(walletBalance);

            const donateBtn = document.getElementById('walletDonateBtn');
            if (donateBtn) donateBtn.style.display = walletBalance > 0 ? 'block' : 'none';

            const pendingNote = document.getElementById('walletPendingNote');
            if (myPendingTopup) {
                pendingNote.style.display = 'block';
                pendingNote.textContent = t('topupPendingNote').replace('{amount}', formatPrice(myPendingTopup.amount));
            } else {
                pendingNote.style.display = 'none';
            }
        }

        // =============================================
        // DONAZIONE DEL SALDO ALL'ATTIVITÀ
        // Ognuno decide solo del proprio saldo, mai di quello altrui: è
        // una scelta volontaria, non un prelievo imposto dall'alto.
        // =============================================
        // La donazione può essere parziale: si apre un modale con
        // l'importo libero, invece di donare per forza tutto il saldo.
        async function openDonateModal() {
            // Anche qui: mai fidarsi del saldo già in memoria quando si sta
            // per decidere quanto donare. Si rilegge da Firestore prima
            // di mostrare la cifra su cui l'utente baserà la scelta.
            await loadWalletFromCloud();
            if (walletBalance <= 0) return;
            document.getElementById('donateModalBalance').textContent = formatPrice(walletBalance);
            const input = document.getElementById('donateAmount');
            input.max = walletBalance;
            input.value = '';
            document.getElementById('donateModal').classList.add('active');
        }

        function closeDonateModal() {
            document.getElementById('donateModal').classList.remove('active');
        }

        function setDonateAmount(fraction) {
            // Per "Tutto" usiamo il saldo esatto, non un ricalcolo:
            // moltiplicare e poi arrotondare può introdurre un errore
            // di pochi centesimi che farebbe rifiutare la donazione.
            const amount = (fraction === 1) ? walletBalance : Math.round(walletBalance * fraction * 100) / 100;
            document.getElementById('donateAmount').value = amount;
        }

        async function confirmDonateAmount() {
            let amount = round2(parseFloat(document.getElementById('donateAmount').value));
            if (!amount || amount <= 0) {
                alert(t('donateInvalidAmount'));
                return;
            }

            // Ultima rilettura da Firestore appena prima di validare e
            // scrivere: tra l'apertura del modale e questo tocco può essere
            // passato del tempo, e il saldo vero potrebbe essere cambiato.
            await loadWalletFromCloud();

            // Non si può mai donare più di quanto si possiede — ma una
            // tolleranza di un centesimo assorbe i normali errori di
            // arrotondamento dei numeri decimali in JavaScript, senza
            // aprire una vera falla: un eccesso reale resta bloccato.
            const EPSILON = 0.01;
            if (amount > walletBalance + EPSILON) {
                alert(t('donateExceedsBalance'));
                return;
            }
            amount = Math.min(amount, walletBalance); // mai oltre il saldo reale, arrotondamenti compresi
            if (!confirm(t('confirmDonate').replace('{amount}', formatPrice(amount)))) return;

            closeDonateModal();

            // L'addebito decide: la donazione si registra solo se il saldo è
            // stato scalato per davvero. clamp=true perché "dono tutto" deve
            // valere il saldo del momento, non quello letto un istante prima.
            const esito = await debitWallet(amount, true);
            if (!esito.ok) {
                alert(esito.motivo === 'offline'
                    ? t('walletNeedsConnection')
                    : esito.motivo === 'insufficiente' ? t('donateExceedsBalance') : t('walletOperationFailed'));
                return;
            }
            amount = esito.addebitato; // l'importo vero, dopo il clamp

            const donation = {
                id: Date.now(),
                userId: getUserId(customerName),
                customerName: customerName,
                amount: amount,
                date: new Date().toLocaleDateString('it-IT'),
                time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            };

            try {
                await firestoreDb.collection('donations').doc(String(donation.id)).set(donation);
            } catch (error) {
                // Il saldo è già scalato e non si rimette indietro: rimborsare
                // sarebbe un accredito, e permettere a un cliente di far
                // salire il proprio saldo aprirebbe la porta a regalarsi
                // credito. Qui il denaro è comunque andato dove doveva —
                // all'attività — e manca solo la ricevuta: si avvisa, così
                // Daniel la può registrare a mano.
                console.log('Donazione scalata ma ricevuta non salvata:', error);
                alert(t('donateReceiptFailed'));
            }

            // A questo punto walletBalance è già il saldo RESIDUO dopo la
            // donazione (debitWallet l'ha appena aggiornato):
            // se è ancora positivo, la donazione era parziale.
            const partial = walletBalance > 0;
            let message = `💝 *DONAZIONE RICEVUTA*\n\n`;
            message += `👤 *Da:* ${customerName}\n`;
            message += `💰 *Importo:* ${formatPrice(amount)}\n`;
            message += partial
                ? `\nHa donato parte del saldo della sua carta all'attività! Saldo residuo: ${formatPrice(walletBalance)}`
                : `\nHa donato tutto il saldo della sua carta all'attività!`;
            openWhatsApp(ADMIN_PHONE, encodeURIComponent(message));

            const successMsg = document.getElementById('successMessage');
            successMsg.textContent = t('donateThanksMsg');
            successMsg.classList.add('show');
            setTimeout(() => successMsg.classList.remove('show'), 3500);

            loadDonationsFromCloud();
        }

        // --- Vista supervisione: quanto è stato donato in totale ---
        let donationsList = [];

        async function loadDonationsFromCloud() {
            if (!cloudReady() || !canSupervise()) return;
            try {
                const snapshot = await firestoreDb.collection('donations').get();
                donationsList = snapshot.docs.map(d => d.data()).sort((a, b) => b.id - a.id);
                renderDonationsPanel();
            } catch (error) {
                console.log('Donazioni non disponibili:', error);
            }
        }

        function renderDonationsPanel() {
            const panel = document.getElementById('donationsPanel');
            if (!panel) return;
            if (!canSupervise() || donationsList.length === 0) { panel.style.display = 'none'; return; }

            panel.style.display = 'block';
            document.getElementById('donationsCount').textContent = donationsList.length;
            const total = donationsList.reduce((sum, d) => sum + d.amount, 0);
            document.getElementById('donationsTotal').textContent = formatPrice(total);
            document.getElementById('donationsList').innerHTML = donationsList.map(d => `
                <div class="chore-row">
                    <div class="chore-row-info">
                        <strong>${escapeHtml(d.customerName)}</strong> — <span class="chore-tip">${formatPrice(d.amount)}</span><br>
                        <small>${escapeHtml(d.date)} ${escapeHtml(d.time)}</small>
                    </div>
                </div>
            `).join('');
        }

        // --- Richiesta di ricarica (il cliente la avvia, Daniel la conferma) ---
        function openTopupModal() {
            document.getElementById('topupAmount').value = '';
            document.getElementById('topupModal').classList.add('active');
        }

        function closeTopupModal() {
            document.getElementById('topupModal').classList.remove('active');
        }

        function setTopupAmount(value) {
            document.getElementById('topupAmount').value = value;
        }

        async function confirmTopupRequest() {
            const amount = round2(parseFloat(document.getElementById('topupAmount').value));
            if (!amount || amount <= 0) {
                alert(t('topupInvalidAmount'));
                return;
            }

            const request = {
                id: Date.now(),
                userId: walletDocId(),
                customerName: customerName,
                amount: amount,
                requestedAt: Date.now(),
                requestedDate: new Date().toLocaleDateString('it-IT'),
                requestedTime: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            };

            myPendingTopup = { id: request.id, amount: amount };
            localStorage.setItem('myPendingTopup', JSON.stringify(myPendingTopup));
            closeTopupModal();
            renderWalletPanel();

            if (cloudReady()) {
                try {
                    await firestoreDb.collection('topupRequests').doc(String(request.id)).set(request);
                } catch (error) {
                    console.log('Errore richiesta ricarica:', error);
                }
            }

            let message = `🔋 *RICHIESTA RICARICA CARTA*\n\n`;
            message += `👤 *Cliente:* ${customerName}\n`;
            message += `💰 *Importo:* ${formatPrice(amount)}\n`;
            message += `\n➡️ Conferma nell'app quando hai ricevuto i contanti.`;

            const successMsg = document.getElementById('successMessage');
            successMsg.textContent = t('topupRequestedMsg');
            successMsg.classList.add('show');
            setTimeout(() => successMsg.classList.remove('show'), 3000);

            openWhatsApp(ADMIN_PHONE, encodeURIComponent(message));
        }

        // Il cliente scopre se Daniel ha confermato (la richiesta è sparita)
        async function checkMyTopupStatus() {
            if (!cloudReady() || !customerName || isAdmin() || !myPendingTopup) return;
            try {
                const doc = await firestoreDb.collection('topupRequests').doc(String(myPendingTopup.id)).get();
                if (!doc.exists) {
                    const confirmedAmount = myPendingTopup.amount;
                    myPendingTopup = null;
                    localStorage.removeItem('myPendingTopup');
                    await loadWalletFromCloud();
                    alert(t('topupConfirmedAlert').replace('{amount}', formatPrice(confirmedAmount)));
                }
            } catch (error) {
                console.log('Errore verifica ricarica:', error);
            }
        }

        // --- Vista admin: richieste di ricarica da confermare ---
        let pendingTopups = [];

        async function loadPendingTopups() {
            if (!cloudReady() || !canSupervise()) return;
            try {
                const snapshot = await firestoreDb.collection('topupRequests').get();
                pendingTopups = snapshot.docs.map(d => d.data()).sort((a, b) => b.requestedAt - a.requestedAt);
                renderPendingTopups();
            } catch (error) {
                console.log('Errore caricamento ricariche:', error);
            }
        }

        function renderPendingTopups() {
            const section = document.getElementById('pendingTopupsSection');
            if (!section) return;
            if (!canSupervise() || pendingTopups.length === 0) { section.style.display = 'none'; return; }

            section.style.display = 'block';
            document.getElementById('pendingTopupsCount').textContent = pendingTopups.length;
            document.getElementById('pendingTopupsList').innerHTML = pendingTopups.map(r => `
                <div class="payment-request">
                    <div class="payment-request-info">
                        <strong>${escapeHtml(r.customerName)}</strong><br>
                        <span class="payment-amount">${formatPrice(r.amount)}</span><br>
                        <small style="color:#666;">${escapeHtml(r.requestedDate)} ${escapeHtml(r.requestedTime)}</small>
                    </div>
                    ${isAdmin() ? `<button class="confirm-payment-btn" data-uid="${escapeAttr(r.userId)}" onclick="confirmTopupReceived(this.dataset.uid, ${Number(r.id)})">${t('confirmReceived')}</button>` : `<span class="chore-status">👁️ ${t('supervisorViewOnly')}</span>`}
                </div>
            `).join('');
        }

        async function confirmTopupReceived(userId, requestId) {
            if (!isAdmin()) return; // accreditare è di Daniel: è lui che incassa i contanti
            const req = pendingTopups.find(r => r.id === requestId);
            if (!req) return;
            if (!confirm(`${t('confirmTopupPrompt')} ${req.customerName}: ${formatPrice(req.amount)}?`)) return;

            try {
                // Accredito e chiusura della richiesta in un'unica
                // transazione. Due motivi: sommare lato server invece di
                // rileggere-e-riscrivere non può cancellare un pagamento del
                // cliente avvenuto nello stesso momento; e se la richiesta
                // non c'è più significa che era già stata confermata (doppio
                // tocco, o l'altro dispositivo di Daniel), quindi si esce
                // senza accreditare due volte.
                const walletRef = firestoreDb.collection('wallets').doc(userId);
                const reqRef = firestoreDb.collection('topupRequests').doc(String(requestId));

                const giaFatta = await firestoreDb.runTransaction(async (tx) => {
                    const reqDoc = await tx.get(reqRef);
                    if (!reqDoc.exists) return true; // già confermata: niente da fare
                    const importo = round2(reqDoc.data().amount || 0);
                    tx.set(walletRef, {
                        userId: userId,
                        customerName: req.customerName,
                        balance: firebase.firestore.FieldValue.increment(importo)
                    }, { merge: true });
                    tx.delete(reqRef);
                    return false;
                });

                await loadPendingTopups();

                if (giaFatta) {
                    alert(t('topupAlreadyConfirmed'));
                    return;
                }

                const successMsg = document.getElementById('successMessage');
                successMsg.textContent = t('topupConfirmedMsg').replace('{name}', req.customerName);
                successMsg.classList.add('show');
                setTimeout(() => successMsg.classList.remove('show'), 3000);
            } catch (error) {
                console.log('Errore conferma ricarica:', error);
                alert('Errore durante la conferma. Riprova.');
            }
        }

        // --- Pagamento con la carta (sconto fedeltà) ---
        function openPaymentChoiceModal() {
            const openOrders = orders.slice();
            const preview = previewCardAllocation(openOrders, walletBalance);

            document.getElementById('walletChoiceBalance').textContent = formatPrice(walletBalance);

            const cardInfo = document.getElementById('walletChoiceCardInfo');
            if (preview.covered.length === 0) {
                cardInfo.textContent = t('cardCoversNothing');
                document.getElementById('walletChoiceCardBtn').style.display = 'none';
            } else if (preview.remaining.length === 0) {
                cardInfo.textContent = t('cardCoversAll')
                    .replace('{amount}', formatPrice(preview.coveredDiscountedTotal))
                    .replace('{saved}', formatPrice(preview.savings));
                document.getElementById('walletChoiceCardBtn').style.display = 'block';
            } else {
                cardInfo.textContent = t('cardCoversPartial')
                    .replace('{count}', preview.covered.length)
                    .replace('{saved}', formatPrice(preview.savings))
                    .replace('{remaining}', formatPrice(preview.remainingCashTotal));
                document.getElementById('walletChoiceCardBtn').style.display = 'block';
            }

            document.getElementById('walletChoiceModal').classList.add('active');
        }

        function closeWalletChoiceModal() {
            document.getElementById('walletChoiceModal').classList.remove('active');
        }

        // Il prezzo di un ordine come numero. Un solo posto dove farlo: la
        // stessa riga di parsing era ripetuta, e il pagamento con carta ora
        // deve poter ricalcolare la quota di un singolo ordine per rimborsarla.
        function prezzoOrdine(order) {
            return parseFloat(String(order.price).replace(',', '.').replace('€', '')) || 0;
        }

        // Calcola quali ordini il saldo può coprire (dal più vecchio al più
        // recente) e quanto si risparmierebbe. Funzione pura: non modifica
        // nulla, serve per mostrare l'anteprima prima di confermare.
        function previewCardAllocation(openOrders, balance) {
            const sorted = openOrders.slice().sort((a, b) => a.id - b.id); // più vecchi prima
            let remainingBalance = balance;
            const covered = [];
            const remaining = [];
            let coveredDiscountedTotal = 0;
            let coveredFullTotal = 0;

            sorted.forEach(order => {
                const price = prezzoOrdine(order);
                const discounted = round2(price * (1 - CARD_DISCOUNT));
                if (remaining.length === 0 && remainingBalance >= discounted) {
                    covered.push(order);
                    coveredDiscountedTotal += discounted;
                    coveredFullTotal += price;
                    remainingBalance -= discounted;
                } else {
                    remaining.push(order);
                }
            });

            const remainingCashTotal = remaining.reduce((sum, o) => sum + prezzoOrdine(o), 0);

            return {
                covered, remaining,
                coveredDiscountedTotal: round2(coveredDiscountedTotal),
                remainingCashTotal,
                savings: round2(coveredFullTotal - coveredDiscountedTotal)
            };
        }

        async function payWithCard() {
            // Rilettura appena prima di addebitare davvero: tra l'apertura
            // della scelta e questo click può essere passato tempo, e il
            // saldo mostrato potrebbe non essere più quello vero. Firestore
            // resta l'unica fonte di verità per il denaro, mai il valore
            // già in memoria.
            await loadWalletFromCloud();

            const preview = previewCardAllocation(orders.slice(), walletBalance);
            closeWalletChoiceModal();

            if (preview.covered.length === 0) return;

            // 1) Addebito atomico. Se il saldo non basta più (una donazione da
            // un altro dispositivo, un pagamento in parallelo) l'anteprima
            // appena calcolata è comunque sbagliata: si esce senza toccare
            // nulla e il cliente riprova su dati freschi.
            // 1) PRIMA si chiudono gli ordini, POI si addebita — e si addebita
            // solo la quota di quelli davvero chiusi.
            //
            // L'ordine inverso richiedeva un rimborso quando una cancellazione
            // non riusciva, e un rimborso è un accredito: per permetterlo, le
            // regole Firestore dovrebbero lasciare che un cliente faccia
            // SALIRE il proprio saldo. Sarebbe la fine della garanzia che
            // conta di più — nessuno si regala credito. Chiudere prima e
            // addebitare dopo rende il rimborso inutile.
            //
            // Il rischio residuo si sposta, non sparisce: se l'addebito
            // fallisse dopo cancellazioni riuscite, quegli ordini
            // resterebbero chiusi senza essere stati pagati. È il male minore
            // rispetto al pagare due volte, ed è visibile a Daniel (un ordine
            // scomparso) invece che silenzioso.
            const scontato = (o) => round2(prezzoOrdine(o) * (1 - CARD_DISCOUNT));
            const chiusi = [];
            for (const o of preview.covered) {
                try {
                    await firestoreDb.collection('orders').doc(String(o.id)).delete();
                    chiusi.push(o);
                } catch (error) {
                    console.log('Errore chiusura ordine (carta):', error);
                }
            }

            if (chiusi.length === 0) {
                // Niente è andato a segno e niente è stato addebitato: si
                // torna esattamente allo stato di partenza.
                await loadOrdersFromCloud();
                alert(t('cardPaymentReverted'));
                return;
            }

            // 2) Addebito atomico della quota effettivamente chiusa. Se il
            // saldo non basta più (una donazione da un altro dispositivo, un
            // pagamento in parallelo) si segnala: gli ordini sono già chiusi,
            // ma nessun soldo è stato preso.
            const daPagare = round2(chiusi.reduce((s, o) => s + scontato(o), 0));
            const esito = await debitWallet(daPagare, false);
            if (!esito.ok) {
                await loadWalletFromCloud();
                await loadOrdersFromCloud();
                alert(esito.motivo === 'offline'
                    ? t('walletNeedsConnection')
                    : esito.motivo === 'insufficiente' ? t('cardBalanceChanged') : t('walletOperationFailed'));
                return;
            }

            const parzialmenteChiusi = chiusi.length < preview.covered.length;

            // 3) Consegna dei prodotti digitali e pulizia della lista locale,
            // solo per gli ordini davvero chiusi.
            await grantDigitalPurchases(chiusi);
            const chiusiIds = chiusi.map(o => o.id);
            orders = orders.filter(o => !chiusiIds.includes(o.id));
            saveOrders();
            renderOrders();

            const addebitoReale = esito.addebitato;
            const scontoReale = round2(chiusi.reduce((s, o) => s + prezzoOrdine(o), 0) - addebitoReale);

            // Nota di cortesia a Daniel: non richiede conferma, il credito c'era già
            let message = `💳 *PAGAMENTO CON CARTA*\n\n`;
            message += `👤 *Cliente:* ${customerName}\n`;
            message += `✅ *${chiusi.length} ordini chiusi con il saldo:* ${formatPrice(addebitoReale)}\n`;
            message += `🎁 *Sconto fedeltà:* -${formatPrice(scontoReale)}\n`;
            message += `💰 *Saldo residuo:* ${formatPrice(walletBalance)}`;

            if (parzialmenteChiusi) alert(t('cardPaymentPartlyClosed'));

            if (preview.remaining.length > 0) {
                // Copertura parziale: il resto passa dal flusso in contanti.
                // Il messaggio della carta gli viene passato come premessa,
                // così parte una sola apertura di WhatsApp — e parte come
                // ULTIMA istruzione, dopo che la richiesta di pagamento è
                // stata creata. Aprire WhatsApp prima significava, su mobile,
                // abbandonare la pagina e non creare mai quella richiesta:
                // il resto da pagare sparisce e Daniel non lo vede arrivare.
                const inviato = await proceedCashPayment(message + '\n\n———\n');
                // Se il cliente ha annullato la richiesta per il resto, la
                // parte già pagata con la carta va comunque comunicata:
                // altrimenti Daniel vede ordini scomparire senza sapere perché.
                if (!inviato) openWhatsApp(ADMIN_PHONE, encodeURIComponent(message));
                return;
            }

            const successMsg = document.getElementById('successMessage');
            successMsg.textContent = t('cardPaidFullMsg').replace('{balance}', formatPrice(esito.saldo));
            successMsg.classList.add('show');
            setTimeout(() => successMsg.classList.remove('show'), 4000);

            openWhatsApp(ADMIN_PHONE, encodeURIComponent(message));
        }

        async function payAndClose() {
            if (orders.length === 0) return;

            // L'admin non richiede pagamenti: gestisce quelli dei clienti
            if (isAdmin()) {
                alert('Sei in modalità admin: conferma i pagamenti dalla sezione "Richieste di pagamento".');
                return;
            }

            // Il saldo locale potrebbe essere quello di 15 secondi fa: prima
            // di decidere come pagare, rileggiamo da Firestore — è l'unica
            // fonte di verità per quanto riguarda i soldi.
            await loadWalletFromCloud();

            // Se c'è un saldo sulla carta, prima si sceglie come pagare.
            // Senza saldo si va dritti al flusso in contanti di sempre.
            if (walletBalance > 0) {
                openPaymentChoiceModal();
                return;
            }

            await proceedCashPayment();
        }

        // Flusso "in contanti": crea la richiesta che Daniel dovrà confermare
        // di aver ricevuto. È lo stesso flusso di sempre, ora isolato in una
        // funzione propria così il pagamento con la carta può richiamarlo
        // per l'eventuale resto non coperto dal saldo.
        // premessa: testo opzionale da mettere in cima al messaggio, usato dal
        // pagamento con carta a copertura parziale per raccontare in un solo
        // invio sia la parte già chiusa col saldo sia il resto da pagare.
        // Ritorna true se la richiesta è stata creata e il messaggio inviato,
        // false se non si è arrivati a quel punto (nessun ordine da pagare, o
        // il cliente ha annullato). Chi passa una premessa deve saperlo: quel
        // testo altrimenti non verrebbe recapitato a nessuno.
        async function proceedCashPayment(premessa) {
            const ordersToPay = orders.slice();
            if (ordersToPay.length === 0) return false;
            const orderIdsToPay = ordersToPay.map(o => o.id);

            const total = ordersToPay.reduce((sum, order) => {
                const priceNum = parseFloat(order.price.replace(',', '.').replace('€', ''));
                return sum + (isNaN(priceNum) ? 0 : priceNum);
            }, 0);
            const totalFormatted = total.toFixed(2).replace('.', ',') + '€';

            const confirmMsg = t('confirmPayment').replace('{total}', totalFormatted).replace('{count}', ordersToPay.length);
            if (!confirm(confirmMsg)) return false;

            // Registra la richiesta di pagamento nel cloud (in attesa di conferma admin)
            await createPaymentRequest(total, totalFormatted, orderIdsToPay);

            // Build WhatsApp receipt message
            let message = premessa || '';
            message += `💳 *RICHIESTA CHIUSURA CONTO*\n\n`;
            message += `👤 *Cliente:* ${customerName}\n\n`;
            message += `📋 *Riepilogo ordini:*\n`;
            ordersToPay.forEach((order, i) => {
                message += `${i + 1}. ${order.cocktail} (${order.variant}) - ${order.price}\n`;
            });
            message += `\n💰 *TOTALE DA PAGARE: ${totalFormatted}*\n`;
            message += `📅 ${new Date().toLocaleDateString('it-IT')} ore ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}\n`;
            message += `\n⏳ In attesa di conferma pagamento`;

            const encodedMessage = encodeURIComponent(message);

            // Aggiorna la UI PRIMA di passare a WhatsApp: su mobile la navigazione
            // verso l'app interrompe l'esecuzione del codice successivo.
            await checkMyPaymentStatus();

            const successMsg = document.getElementById('successMessage');
            successMsg.textContent = t('paymentRequestedMsg');
            successMsg.classList.add('show');
            setTimeout(() => {
                successMsg.classList.remove('show');
            }, 3000);

            openWhatsApp(ADMIN_PHONE, encodedMessage);
            return true;
        }

        // =============================================
        // APERTURA WHATSAPP
        // Usa lo schema whatsapp:// per aprire direttamente l'app nativa.
        // wa.me è invece una pagina web di reindirizzamento: aprendola in una
        // nuova scheda il browser mostra "Continua alla chat" invece di passare
        // all'app. Su desktop si usa wa.me come fallback.
        // =============================================
        function isMobileDevice() {
            return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        }

        function openWhatsApp(phone, encodedMessage) {
            if (isMobileDevice()) {
                // Navigazione nella stessa scheda: il sistema passa all'app WhatsApp
                window.location.href = `whatsapp://send?phone=${phone}&text=${encodedMessage}`;
            } else {
                // Desktop: WhatsApp Web / app desktop tramite wa.me
                window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
            }
        }

        // =============================================
        // GESTIONE RICHIESTE DI PAGAMENTO
        // =============================================

        // Il cliente crea la richiesta (documento con id = userId)
        // Salva gli ID degli ordini inclusi: solo QUELLI verranno chiusi alla conferma
        async function createPaymentRequest(total, totalFormatted, orderIds) {
            if (!cloudReady() || !customerName) return;
            try {
                await firestoreDb.collection('payments').doc(getUserId(customerName)).set({
                    userId: getUserId(customerName),
                    customerName: customerName,
                    total: total,
                    totalFormatted: totalFormatted,
                    orderCount: orderIds.length,
                    orderIds: orderIds,
                    requestedAt: Date.now(),
                    requestedDate: new Date().toLocaleDateString('it-IT'),
                    requestedTime: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
                    status: 'pending'
                });
            } catch (error) {
                console.log('Errore creazione richiesta pagamento:', error);
            }
        }

        // Il cliente controlla se ha una richiesta in attesa
        async function checkMyPaymentStatus() {
            if (!cloudReady() || !customerName || isAdmin()) return;
            const banner = document.getElementById('paymentPendingBanner');
            try {
                const doc = await firestoreDb.collection('payments').doc(getUserId(customerName)).get();
                if (doc.exists) {
                    myPaymentPending = true;
                    myPendingOrderIds = doc.data().orderIds || [];
                    document.getElementById('pendingAmount').textContent = doc.data().totalFormatted || '';
                    banner.style.display = 'block';
                } else {
                    // Nessuna richiesta: se prima era in attesa, l'admin ha confermato → conto chiuso
                    if (myPaymentPending) {
                        myPaymentPending = false;
                        myPendingOrderIds = [];
                        await loadOrdersFromCloud();
                        alert(t('paymentConfirmedMsg'));
                    }
                    myPendingOrderIds = [];
                    banner.style.display = 'none';
                }
                renderOrders();
            } catch (error) {
                console.log('Errore verifica pagamento:', error);
            }
        }

        // L'admin carica tutte le richieste in attesa
        async function loadPendingPayments() {
            if (!cloudReady() || !canSupervise()) return;
            try {
                const snapshot = await firestoreDb.collection('payments').get();
                pendingPayments = snapshot.docs
                    .map(doc => doc.data())
                    .sort((a, b) => b.requestedAt - a.requestedAt);
                renderPendingPayments();
            } catch (error) {
                console.log('Errore caricamento richieste pagamento:', error);
            }
        }

        // L'admin visualizza le richieste in attesa
        // =============================================
        // GUIDA ADMIN
        // Solo in italiano: è pensata per Daniel e la famiglia.
        // =============================================
        // Un solo pulsante ❓, due guide diverse: Daniel vede quella
        // amministrativa (solo italiano), i clienti quella d'uso
        // (tradotta come il resto dell'app).
        // "La mia area": raccoglie i pannelli personali/gestionali in una
        // pagina a parte. Li aggiorniamo appena si apre, così non si vede
        // mai un dato vecchio in attesa del prossimo giro di polling.
        function openMyArea() {
            document.getElementById('myAreaModal').classList.add('active');
            renderSupervisorPanel();
            renderDonationsPanel();
            renderStudyChecklistPanel();
            renderPartyPanels();
            renderOrders();
            renderMyLibraryPanel();
        }

        function closeMyArea() {
            document.getElementById('myAreaModal').classList.remove('active');
        }

        function openHelp() {
            if (canSupervise()) openGuide();
            else openUserGuide();
        }

        function openGuide() {
            if (!canSupervise()) return;
            document.getElementById('guideModal').classList.add('active');
            renderGuideDots(GUIDE_VERSIONS, 'guide', 'seenAdminGuideVersions');
            updateHelpButtonDot();
        }

        function closeGuide() {
            document.getElementById('guideModal').classList.remove('active');
        }

        // =============================================
        // NOVITÀ NELLA GUIDA
        // Ogni capitolo ha un numero di versione: quando ne aggiorno il
        // contenuto, alzo il numero. Un pallino compare sui capitoli con
        // versione più recente di quella già vista su questo dispositivo,
        // e sparisce (per sempre, finché non lo aggiorno di nuovo) appena
        // l'utente lo apre almeno una volta.
        // =============================================
        const GUIDE_VERSIONS = {
            start: 1, prices: 1, stock: 1, hours: 2, orders: 1, payments: 3,
            reviews: 1, chores: 1, merch: 1, party: 3, supervisor: 3, study: 3, tech: 1
        };
        const USER_GUIDE_VERSIONS = {
            order: 1, pay: 3, chores: 1, party: 1, reviews: 1, share: 1, offline: 1, danny: 1
        };

        function getSeenGuideVersions(storageKey) {
            try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); }
            catch (e) { return {}; }
        }

        function renderGuideDots(versions, prefix, storageKey) {
            const seen = getSeenGuideVersions(storageKey);
            Object.keys(versions).forEach(id => {
                const btn = document.querySelector('#' + prefix + '-' + id + ' .guide-toggle');
                if (!btn) return;
                let dot = btn.querySelector('.guide-new-dot');
                const isNew = (seen[id] || 0) < versions[id];
                if (isNew && !dot) {
                    dot = document.createElement('span');
                    dot.className = 'guide-new-dot';
                    btn.appendChild(dot);
                } else if (!isNew && dot) {
                    dot.remove();
                }
            });
        }

        function markGuideSectionSeen(versions, id, storageKey) {
            const seen = getSeenGuideVersions(storageKey);
            seen[id] = versions[id];
            localStorage.setItem(storageKey, JSON.stringify(seen));
        }

        // Un pallino sul ❓ stesso: avvisa che c'è qualcosa di nuovo nella
        // guida anche prima di aprirla, altrimenti chi non la consulta mai
        // non scoprirebbe le novità.
        function updateHelpButtonDot() {
            const btn = document.getElementById('helpBtn');
            if (!btn) return;
            const versions = canSupervise() ? GUIDE_VERSIONS : USER_GUIDE_VERSIONS;
            const storageKey = canSupervise() ? 'seenAdminGuideVersions' : 'seenUserGuideVersions';
            const seen = getSeenGuideVersions(storageKey);
            const hasUnseen = Object.keys(versions).some(id => (seen[id] || 0) < versions[id]);

            let dot = btn.querySelector('.guide-new-dot');
            if (hasUnseen && !dot) {
                dot = document.createElement('span');
                dot.className = 'guide-new-dot help-btn-dot';
                btn.appendChild(dot);
            } else if (!hasUnseen && dot) {
                dot.remove();
            }
        }

        function toggleGuide(id) {
            const s = document.getElementById('guide-' + id);
            if (s) s.classList.toggle('collapsed');
            markGuideSectionSeen(GUIDE_VERSIONS, id, 'seenAdminGuideVersions');
            renderGuideDots(GUIDE_VERSIONS, 'guide', 'seenAdminGuideVersions');
            updateHelpButtonDot();
        }

        function openUserGuide() {
            document.getElementById('userGuideModal').classList.add('active');
            renderGuideDots(USER_GUIDE_VERSIONS, 'uguide', 'seenUserGuideVersions');
            updateHelpButtonDot();
        }

        function closeUserGuide() {
            document.getElementById('userGuideModal').classList.remove('active');
        }

        function toggleUserGuide(id) {
            const s = document.getElementById('uguide-' + id);
            if (s) s.classList.toggle('collapsed');
            markGuideSectionSeen(USER_GUIDE_VERSIONS, id, 'seenUserGuideVersions');
            renderGuideDots(USER_GUIDE_VERSIONS, 'uguide', 'seenUserGuideVersions');
            updateHelpButtonDot();
        }

        // Pannello avvisi: cosa sta finendo (solo admin)
        // =============================================
        // RIORDINO SU AMAZON
        // Se Daniel ha salvato il link del prodotto preferito, lo usa.
        // Altrimenti apre una ricerca Amazon.it col nome del prodotto:
        // un tocco in meno rispetto a doverlo cercare da soli.
        // =============================================
        function amazonSearchUrl(query) {
            return 'https://www.amazon.it/s?k=' + encodeURIComponent(query);
        }

        function getAmazonLink(id) {
            const links = pricing.amazonLinks || {};
            return links[id] || '';
        }

        function openAmazonFor(id, fallbackName) {
            const saved = getAmazonLink(id);
            window.open(saved || amazonSearchUrl(fallbackName), '_blank');
        }

        function renderLowStockPanel() {
            const panel = document.getElementById('lowStockPanel');
            if (!panel) return;

            if (!canSupervise()) { panel.style.display = 'none'; return; }

            const lowIng = lowStockIngredients();
            const lowProd = lowStockProducts();
            const total = lowIng.length + lowProd.length;

            if (total === 0) { panel.style.display = 'none'; return; }

            document.getElementById('lowStockCount').textContent = total;

            // Pillola compatta: icona + quantità, il nome completo sta nel
            // title (tooltip) invece che occupare spazio in riga.
            // Il carrello 🛒 apre Amazon per riordinare quel prodotto.
            const chip = (id, icon, name, qty, unit) => {
                const out = qty === 0;
                const label = out ? t('stockZero') : formatQty(qty, unit || '');
                return `<span class="stock-chip${out ? ' stock-chip-out' : ''}" title="${name}">
                    ${icon} ${label}
                    <button type="button" class="chip-buy" onclick="openAmazonFor('${id}', '${name.replace(/'/g, "\\'")}')" title="${t('reorderOn')} Amazon">🛒</button>
                </span>`;
            };

            document.getElementById('lowStockList').innerHTML =
                lowIng.map(i => chip('ing_' + i.id, i.icon, i.name, getIngredientStock(i.id), i.unit)).join('') +
                lowProd.map(p => chip('prod_' + p.name, p.icon, p.name, getStock(p.name), '')).join('');

            panel.style.display = 'block';
        }

        function renderPendingPayments() {
            const section = document.getElementById('pendingPaymentsSection');
            const list = document.getElementById('pendingPaymentsList');

            if (!canSupervise() || pendingPayments.length === 0) {
                section.style.display = 'none';
                return;
            }

            section.style.display = 'block';
            document.getElementById('pendingCount').textContent = pendingPayments.length;
            list.innerHTML = pendingPayments.map(p => `
                <div class="payment-request">
                    <div class="payment-request-info">
                        <strong>${escapeHtml(p.customerName)}</strong><br>
                        <span class="payment-amount">${escapeHtml(p.totalFormatted)}</span>
                        <small style="color:#666;"> · ${escapeHtml(p.orderCount)} ${p.orderCount === 1 ? t('orderSingular') : t('orderPlural')}</small><br>
                        <small style="color:#666;">${escapeHtml(p.requestedDate)} ${escapeHtml(p.requestedTime)}</small>
                    </div>
                    ${isAdmin() ? `<button class="confirm-payment-btn" data-uid="${escapeAttr(p.userId)}" onclick="confirmPaymentReceived(this.dataset.uid)">${t('confirmReceived')}</button>` : `<span class="chore-status">👁️ ${t('supervisorViewOnly')}</span>`}
                </div>
            `).join('');
        }

        // L'admin conferma di aver ricevuto il pagamento → chiude il conto del cliente
        async function confirmPaymentReceived(userId) {
            if (!isAdmin()) return; // solo chi ha ricevuto i soldi chiude il conto
            const payment = pendingPayments.find(p => p.userId === userId);
            if (!payment) return;

            // Stessa frase della conferma ricarica, dal dizionario: era
            // l'unica conferma sul denaro rimasta in italiano fisso.
            if (!confirm(`${t('confirmTopupPrompt')} ${payment.customerName}: ${payment.totalFormatted}?`)) return;

            try {
                const idsToDelete = payment.orderIds || [];

                // Prima di cancellarli, controlla se tra questi ordini c'è
                // un prodotto digitale (es. il libro in PDF): il contante
                // è appena stato confermato, quindi va consegnato subito.
                const paidOrders = orders.filter(o => idsToDelete.includes(o.id));
                await grantDigitalPurchases(paidOrders);

                const batch = firestoreDb.batch();

                // Cancella SOLO gli ordini inclusi nella richiesta di pagamento.
                // Eventuali ordini aggiunti dopo la richiesta restano aperti da pagare.
                idsToDelete.forEach(orderId => {
                    batch.delete(firestoreDb.collection('orders').doc(String(orderId)));
                });

                // Cancella la richiesta di pagamento
                batch.delete(firestoreDb.collection('payments').doc(userId));
                await batch.commit();

                // Aggiorna la vista admin
                await loadPendingPayments();
                await loadOrdersFromCloud();

                const successMsg = document.getElementById('successMessage');
                successMsg.textContent = t('paymentClosedMsg');
                successMsg.classList.add('show');
                setTimeout(() => successMsg.classList.remove('show'), 3000);
            } catch (error) {
                console.log('Errore conferma pagamento:', error);
                alert('Errore durante la conferma. Riprova.');
            }
        }

        // =============================================
        // PAGINA LISTINO (solo admin)
        // =============================================
        // =============================================
        // LISTINO A FISARMONICA
        // Le categorie partono aperte, i singoli prodotti chiusi.
        // I campi restano sempre nel DOM: chiudere una scheda nasconde
        // i valori ma non li perde.
        // =============================================
        function toggleProductCard(safeId) {
            const card = document.getElementById('card-' + safeId);
            if (card) card.classList.toggle('expanded');
        }

        function togglePriceSection(key) {
            const section = document.getElementById('section-' + key);
            if (section) section.classList.toggle('collapsed');
        }

        function addNewsMsgRow(containerId) {
            const container = document.getElementById(containerId || 'newsMsgRows');
            const idx = container.children.length;
            const card = document.createElement('div');
            card.className = 'news-msg-card';
            card.innerHTML = `
                <div style="display:flex; gap:6px; align-items:center;">
                    <input type="text" data-news-text="${idx}" value="" style="flex:1;" placeholder="${t('newsMsgPlaceholder')}">
                    <button type="button" class="reject-btn" style="padding:8px 12px;" onclick="this.closest('.news-msg-card').remove()">✕</button>
                </div>
${newsBgAreaHTML('')}
                <input type="text" data-news-badge="${idx}" value="" placeholder="${t('newsBadgePlaceholder')}" style="margin-top:6px;">
                <div style="display:flex; gap:8px; align-items:center; margin-top:8px;">
                    <label class="soldout-toggle" style="margin:0; flex-shrink:0;">
                        <input type="checkbox" data-news-badge-enabled="${idx}">
                        <span style="font-size:0.85em;">${t('newsBadgeShowLabel')}</span>
                    </label>
                    <select data-news-badge-color="${idx}" style="flex:1; padding:6px; border:2px solid var(--sand-deep); border-radius:6px; font-size:0.85em;">
                        <option value="gold">${t('newsColorGold')}</option>
                        <option value="coral">${t('newsColorCoral')}</option>
                        <option value="lagoon">${t('newsColorLagoon')}</option>
                        <option value="red">${t('newsColorRed')}</option>
                    </select>
                </div>`;
            container.appendChild(card);
        }

        function openPriceList() {
            if (!isAdmin()) return;

            const form = document.getElementById('priceListForm');

            // Genera la scheda di un prodotto. La sezione Premium compare
            // solo per i cocktail: sugli snack non ha senso.
            // Scheda di un prodotto, richiudibile.
            // I campi restano nel DOM anche da chiusi: così il salvataggio
            // li raccoglie tutti senza bisogno di riaprire le schede.
            const buildCard = (c, allowPremium) => {
                const item = pricing.items[c.name] || { prices: [], special: false, premium: false, premiumSurcharge: 2 };
                const safeId = c.name.replace(/\s+/g, '_');

                const rows = c.variants.map((v, i) => `
                    <div class="price-row">
                        <span class="price-variant">${translateVariant(v)}</span>
                        <input type="number" step="0.10" min="0"
                               data-cocktail="${c.name}" data-index="${i}"
                               value="${(item.prices[i] ?? 0.5).toFixed(2)}">
                        <span class="price-currency">€</span>
                    </div>
                `).join('');

                const premiumBlock = allowPremium ? `
                        <div class="premium-section">
                            <label class="premium-toggle">
                                <input type="checkbox" data-premium="${c.name}" ${item.premium ? 'checked' : ''}
                                       onchange="togglePremiumInput('${c.name}', this.checked)">
                                <span>⭐ ${t('premiumEnable')}</span>
                            </label>
                            <div class="price-row" id="premiumRow-${safeId}" style="${item.premium ? '' : 'display:none;'}">
                                <span class="price-variant">${t('premiumSurcharge')}</span>
                                <input type="number" step="0.10" min="0"
                                       data-premium-surcharge="${c.name}"
                                       value="${(item.premiumSurcharge ?? 2).toFixed(2)}">
                                <span class="price-currency">€</span>
                            </div>
                        </div>` : '';

                // Riassunto sulla riga chiusa: fascia di prezzo e stato,
                // per individuare il prodotto senza doverlo aprire.
                const prices = (item.prices || []).filter(p => typeof p === 'number');
                const range = prices.length
                    ? (Math.min(...prices) === Math.max(...prices)
                        ? formatPrice(Math.min(...prices))
                        : formatPrice(Math.min(...prices)) + '–' + formatPrice(Math.max(...prices)))
                    : '';
                const flags = (item.special ? ' 🔥' : '') + (item.soldOut ? ' 🚫' : '') + (item.premium ? ' ⭐' : '');

                return `
                    <div class="price-card${item.soldOut ? ' price-card-soldout' : ''}" id="card-${safeId}">
                        <button type="button" class="price-card-toggle" onclick="toggleProductCard('${safeId}')">
                            <span class="pc-name">${c.icon} <strong>${c.name}</strong></span>
                            <span class="pc-summary">${range}${flags}</span>
                            <span class="pc-chevron">▾</span>
                        </button>
                        <div class="price-card-body" id="body-${safeId}">
                            <label class="special-toggle">
                                <input type="checkbox" data-special="${c.name}" ${item.special ? 'checked' : ''}>
                                <span>🔥 ${t('specialOffer')}</span>
                            </label>
                            <label class="soldout-toggle">
                                <input type="checkbox" data-soldout="${c.name}" ${item.soldOut ? 'checked' : ''}
                                       onchange="document.getElementById('card-${safeId}').classList.toggle('price-card-soldout', this.checked)">
                                <span>🚫 ${t('soldOutEnable')}</span>
                            </label>
                            <div class="price-row stock-row">
                                <span class="price-variant">📦 ${t('stockLabel')}</span>
                                <input type="number" step="1" min="-1"
                                       data-stock="${c.name}"
                                       value="${escapeAttr(item.stock ?? -1)}">
                                <span class="stock-hint">${t('stockUnlimited')}</span>
                            </div>
                            <div class="amazon-link-row">
                                <span class="amazon-link-label">🛒</span>
                                <input type="url" data-amazon="prod_${c.name}"
                                       placeholder="${t('amazonLinkPlaceholder')}"
                                       value="${escapeAttr(pricing.amazonLinks && pricing.amazonLinks['prod_' + c.name] || '')}">
                            </div>
                            ${recipes[c.name] ? `<div class="recipe-note">🧪 ${t('usesIngredients')}: ${Object.keys(recipes[c.name]).map(id => {
                                const ing = ingredientById(id);
                                return ing ? `${ing.name} ${formatQty(recipes[c.name][id], ing.unit)}` : id;
                            }).join(', ')}</div>` : ''}
                            ${rows}
                            ${premiumBlock}
                        </div>
                    </div>
                `;
            };

            // Una categoria richiudibile che contiene le sue schede
            const buildSection = (key, icon, list, allowPremium) => `
                <div class="price-section collapsed" id="section-${key}">
                    <button type="button" class="price-section-toggle" onclick="togglePriceSection('${key}')">
                        <span>${icon} ${t(key)}</span>
                        <span class="ps-count">${list.length}</span>
                        <span class="pc-chevron">▾</span>
                    </button>
                    <div class="price-section-body" id="sectionBody-${key}">
                        ${list.map(p => buildCard(p, allowPremium)).join('')}
                    </div>
                </div>`;

            // Magazzino ingredienti: una riga per bottiglia/confezione
            // Sezione lavoretti: mancia modificabile + pausa
            const buildChoresSection = () => {
                const rows = chores.map(c => {
                    const item = (pricing.choreItems && pricing.choreItems[c.id]) || { tip: 1, paused: false };
                    return `
                        <div class="price-card${item.paused ? ' price-card-soldout' : ''}">
                            <div class="price-card-header">
                                <span>${c.icon} <strong>${c.name}</strong></span>
                                <label class="soldout-toggle" style="margin:0;">
                                    <input type="checkbox" data-chore-pause="${c.id}" ${item.paused ? 'checked' : ''}>
                                    <span>⏸️ ${t('choresPauseEnable')}</span>
                                </label>
                            </div>
                            <div class="price-row">
                                <span class="price-variant">💰 ${t('choreTipLabel')}</span>
                                <input type="number" step="0.10" min="0" data-chore-tip="${c.id}" value="${(item.tip ?? 1).toFixed(2)}">
                                <span class="price-currency">€</span>
                            </div>
                        </div>`;
                }).join('');

                return `
                    <div class="price-section collapsed" id="section-chores">
                        <button type="button" class="price-section-toggle" onclick="togglePriceSection('chores')">
                            <span>🧹 ${t('tabChores')}</span>
                            <span class="ps-count">${chores.length}</span>
                            <span class="pc-chevron">▾</span>
                        </button>
                        <div class="price-section-body" id="sectionBody-chores">${rows}</div>
                    </div>`;
            };

            // Sezione pacchetti festa: prezzo per ciascuna delle 3 fasce
            // di invitati, più la pausa per un tema fuori stagione.
            const buildPartySection = () => {
                const rows = partyPackages.map(p => {
                    const item = (pricing.partyItems && pricing.partyItems[p.id]) || { tiers: [80, 150, 210], paused: false };
                    const tierRows = PARTY_GUEST_TIERS.map((guests, i) => `
                        <div class="price-row">
                            <span class="price-variant">${guests} ${t('guestsLabel')}</span>
                            <input type="number" step="5" min="0" data-party-tier="${p.id}" data-tier-index="${i}" value="${(item.tiers[i] ?? 0).toFixed(2)}">
                            <span class="price-currency">€</span>
                        </div>`).join('');
                    return `
                        <div class="price-card${item.paused ? ' price-card-soldout' : ''}">
                            <div class="price-card-header">
                                <span>${p.icon} <strong>${t('party_' + p.id)}</strong></span>
                                <label class="soldout-toggle" style="margin:0;">
                                    <input type="checkbox" data-party-pause="${p.id}" ${item.paused ? 'checked' : ''}>
                                    <span>⏸️ ${t('partyPauseEnable')}</span>
                                </label>
                            </div>
                            ${tierRows}
                        </div>`;
                }).join('');

                return `
                    <div class="price-section collapsed" id="section-party">
                        <button type="button" class="price-section-toggle" onclick="togglePriceSection('party')">
                            <span>🎉 ${t('tabParty')}</span>
                            <span class="ps-count">${partyPackages.length}</span>
                            <span class="pc-chevron">▾</span>
                        </button>
                        <div class="price-section-body" id="sectionBody-party">${rows}</div>
                    </div>`;
            };

            // Banner novità: attiva/disattiva + una mini-card per messaggio
            // (testo, sfondo immagine opzionale, badge animato opzionale)
            const buildNewsBannerSection = () => {
                const cfg = pricing.newsBanner || { enabled: true, messages: [] };
                const rows = buildNewsMsgCardsHTML(cfg.messages);

                return `
                    <div class="price-section collapsed" id="section-newsbanner">
                        <button type="button" class="price-section-toggle" onclick="togglePriceSection('newsbanner')">
                            <span>📰 ${t('newsBannerSectionTitle')}</span>
                            <span class="ps-count">${cfg.messages.length}</span>
                            <span class="pc-chevron">▾</span>
                        </button>
                        <div class="price-section-body" id="sectionBody-newsbanner">
                            <label class="soldout-toggle" style="margin-bottom:12px;">
                                <input type="checkbox" id="newsBannerEnabled" ${cfg.enabled ? 'checked' : ''}>
                                <span>${t('newsBannerEnableLabel')}</span>
                            </label>
                            <div id="newsMsgRows">${rows}</div>
                            <button type="button" class="checklist-photo-btn" style="width:100%; margin-top:8px;" onclick="addNewsMsgRow('newsMsgRows')">+ ${t('newsAddMsg')}</button>
                        </div>
                    </div>`;
            };

            const buildIngredientsSection = () => {
                const stock = pricing.ingredientStock || {};
                const links = pricing.amazonLinks || {};
                const rows = ingredients.map(i => {
                    const q = (typeof stock[i.id] === 'number') ? round2(stock[i.id]) : -1;
                    const out = q === 0;
                    return `
                        <div class="ingredient-row${out ? ' ingredient-out' : ''}">
                            <span class="ing-name">${i.icon} ${i.name}</span>
                            <input type="number" step="0.5" min="-1"
                                   data-ingredient="${i.id}" value="${q}">
                            <span class="ing-unit">${i.unit}</span>
                            ${out ? `<span class="ing-flag">🚫</span>` : ''}
                        </div>
                        <div class="amazon-link-row">
                            <span class="amazon-link-label">🛒</span>
                            <input type="url" data-amazon="ing_${i.id}"
                                   placeholder="${t('amazonLinkPlaceholder')}"
                                   value="${escapeAttr(links['ing_' + i.id] || '')}">
                        </div>`;
                }).join('');

                return `
                    <div class="price-section collapsed" id="section-ingredients">
                        <button type="button" class="price-section-toggle" onclick="togglePriceSection('ingredients')">
                            <span>🧪 ${t('tabIngredients')}</span>
                            <span class="ps-count">${ingredients.length}</span>
                            <span class="pc-chevron">▾</span>
                        </button>
                        <div class="price-section-body" id="sectionBody-ingredients">
                            <p class="ing-help">${t('stockUnlimitedHelp')}</p>
                            <div class="price-row" style="margin-bottom:12px;">
                                <span class="price-variant">⚠️ ${t('lowStockThreshold')}</span>
                                <input type="number" step="1" min="0" id="lowStockThreshold"
                                       value="${escapeAttr(pricing.lowStockThreshold ?? 2)}">
                            </div>
                            ${rows}
                        </div>
                    </div>`;
            };

            form.innerHTML =
                buildSection('tabCocktails', '🍹', cocktails, true) +
                buildSection('tabSnacks', '🍿', snacks, false) +
                buildSection('tabSoftdrinks', '🥤', softdrinks, false) +
                buildSection('tabDesserts', '🍰', desserts, false) +
                buildSection('tabMerch', '🛍️', merch, false) +
                buildIngredientsSection() +
                buildChoresSection() +
                buildPartySection() +
                buildNewsBannerSection();

            const ts = pricing.timeSurcharge || {};
            document.getElementById('surchargeNow').value = (ts['Subito'] ?? 1).toFixed(2);
            document.getElementById('surcharge10').value = (ts['10 minuti'] ?? 0.5).toFixed(2);
            document.getElementById('surcharge30').value = (ts['30 minuti'] ?? 0).toFixed(2);

            // Pannello servizio
            pendingServiceOverride = getServiceConfig().manualOverride ?? null;
            pendingCloseReason = getServiceConfig().closeReason ?? null;
            renderServiceHours();
            refreshServiceButtons();

            document.getElementById('priceListModal').classList.add('active');
        }

        // Mostra/nasconde il campo maggiorazione quando si attiva Premium
        function togglePremiumInput(cocktailName, checked) {
            const row = document.getElementById('premiumRow-' + cocktailName.replace(/\s+/g, '_'));
            if (row) row.style.display = checked ? '' : 'none';
        }

        function closePriceList() {
            document.getElementById('priceListModal').classList.remove('active');
        }

        async function savePriceList() {
            if (!isAdmin()) return;

            const updated = buildDefaultPricing();

            // Prezzi per variante
            document.querySelectorAll('#priceListForm input[data-cocktail]').forEach(input => {
                const name = input.getAttribute('data-cocktail');
                const idx = parseInt(input.getAttribute('data-index'), 10);
                const val = parseFloat(input.value);
                if (!updated.items[name]) updated.items[name] = { prices: [], special: false };
                updated.items[name].prices[idx] = isNaN(val) ? 0.5 : round2(val);
            });

            // Offerte speciali
            document.querySelectorAll('#priceListForm input[data-special]').forEach(chk => {
                const name = chk.getAttribute('data-special');
                if (updated.items[name]) updated.items[name].special = chk.checked;
            });

            // Prodotti esauriti
            document.querySelectorAll('#priceListForm input[data-soldout]').forEach(chk => {
                const name = chk.getAttribute('data-soldout');
                if (updated.items[name]) updated.items[name].soldOut = chk.checked;
            });

            // Scorte per prodotto
            document.querySelectorAll('#priceListForm input[data-stock]').forEach(input => {
                const name = input.getAttribute('data-stock');
                const val = parseInt(input.value, 10);
                if (updated.items[name]) {
                    updated.items[name].stock = isNaN(val) ? -1 : val;
                }
            });

            // Magazzino ingredienti
            const ingStock = {};
            document.querySelectorAll('#priceListForm input[data-ingredient]').forEach(input => {
                const id = input.getAttribute('data-ingredient');
                const val = parseInt(input.value, 10);
                ingStock[id] = isNaN(val) ? -1 : round2(val);
            });
            if (Object.keys(ingStock).length) updated.ingredientStock = ingStock;

            // Link Amazon per il riordino rapido
            const amazonLinks = {};
            document.querySelectorAll('#priceListForm input[data-amazon]').forEach(input => {
                const key = input.getAttribute('data-amazon');
                const url = input.value.trim();
                if (url) amazonLinks[key] = url;
            });
            updated.amazonLinks = amazonLinks;

            // Mance e pausa dei lavoretti
            const choreItems = {};
            chores.forEach(c => { choreItems[c.id] = { tip: 1, paused: false }; });
            document.querySelectorAll('#priceListForm input[data-chore-tip]').forEach(input => {
                const id = input.getAttribute('data-chore-tip');
                const val = parseFloat(input.value);
                if (choreItems[id]) choreItems[id].tip = isNaN(val) ? 1 : round2(val);
            });
            document.querySelectorAll('#priceListForm input[data-chore-pause]').forEach(input => {
                const id = input.getAttribute('data-chore-pause');
                if (choreItems[id]) choreItems[id].paused = input.checked;
            });
            updated.choreItems = choreItems;

            // Prezzi e pausa dei pacchetti festa
            const partyItems = {};
            partyPackages.forEach(p => { partyItems[p.id] = { tiers: [80, 150, 210], paused: false }; });
            document.querySelectorAll('#priceListForm input[data-party-tier]').forEach(input => {
                const id = input.getAttribute('data-party-tier');
                const idx = parseInt(input.getAttribute('data-tier-index'), 10);
                const val = parseFloat(input.value);
                if (partyItems[id]) partyItems[id].tiers[idx] = isNaN(val) ? 0 : round2(val);
            });
            document.querySelectorAll('#priceListForm input[data-party-pause]').forEach(input => {
                const id = input.getAttribute('data-party-pause');
                if (partyItems[id]) partyItems[id].paused = input.checked;
            });
            updated.partyItems = partyItems;

            const thrEl = document.getElementById('lowStockThreshold');
            if (thrEl) {
                const thr = parseInt(thrEl.value, 10);
                updated.lowStockThreshold = isNaN(thr) ? 2 : thr;
            }

            // Versione premium attiva/disattiva
            document.querySelectorAll('#priceListForm input[data-premium]').forEach(chk => {
                const name = chk.getAttribute('data-premium');
                if (updated.items[name]) updated.items[name].premium = chk.checked;
            });

            // Maggiorazione premium per cocktail
            document.querySelectorAll('#priceListForm input[data-premium-surcharge]').forEach(input => {
                const name = input.getAttribute('data-premium-surcharge');
                const val = parseFloat(input.value);
                if (updated.items[name]) {
                    updated.items[name].premiumSurcharge = isNaN(val) ? 2.00 : round2(val);
                }
            });

            // Supplementi orario
            const num = (id, fallback) => {
                const v = parseFloat(document.getElementById(id).value);
                return isNaN(v) ? fallback : round2(v);
            };
            updated.timeSurcharge = {
                'Subito': num('surchargeNow', 1),
                '10 minuti': num('surcharge10', 0.5),
                '30 minuti': num('surcharge30', 0)
            };

            // Stato e orari del servizio
            const hours = {};
            for (let d = 0; d < 7; d++) {
                const openEl = document.querySelector(`input[data-day-open="${d}"]`);
                const closeEl = document.querySelector(`input[data-day-close="${d}"]`);
                const offEl = document.querySelector(`input[data-day-closed="${d}"]`);
                hours[d] = {
                    open: openEl ? openEl.value : '10:00',
                    close: closeEl ? closeEl.value : '23:59',
                    closed: offEl ? offEl.checked : false
                };
            }
            // Se il blocco è stato imposto da Renato, il salvataggio di
            // Daniel non può toccare lo stato del servizio: resta quello
            // bloccato, qualunque cosa i pulsanti (già disabilitati)
            // avrebbero selezionato. Difesa in profondità, non solo UI.
            const currentCfg = getServiceConfig();
            const lockedBySuper = currentCfg.lockedBy === 'superadmin' && !isSuperAdmin();
            updated.service = lockedBySuper
                ? { manualOverride: currentCfg.manualOverride, closeReason: currentCfg.closeReason, lockedBy: currentCfg.lockedBy, hours: hours }
                : {
                    manualOverride: (pendingServiceOverride === undefined) ? null : pendingServiceOverride,
                    closeReason: pendingCloseReason || null,
                    lockedBy: null, // un cambiamento fatto da Daniel non è mai un blocco del supervisore
                    hours: hours
                };

            // Banner novità: una card per messaggio, con testo/sfondo/badge.
            // Le card rimosse col ✕ non esistono più nel DOM, quindi
            // spariscono automaticamente dall'elenco salvato.
            const newsEnabledEl = document.getElementById('newsBannerEnabled');
            const newsMessages = Array.from(document.querySelectorAll('#newsMsgRows .news-msg-card'))
                .map(card => ({
                    text: card.querySelector('[data-news-text]').value.trim(),
                    bgImage: card.querySelector('[data-news-bg]').value.trim(),
                    badge: card.querySelector('[data-news-badge]').value.trim(),
                    badgeEnabled: card.querySelector('[data-news-badge-enabled]').checked,
                    badgeColor: card.querySelector('[data-news-badge-color]').value
                }))
                .filter(m => m.text);
            updated.newsBanner = {
                enabled: newsEnabledEl ? newsEnabledEl.checked : true,
                messages: newsMessages
            };

            pricing = updated;
            const ok = await savePricing();

            closePriceList();
            renderCocktails();
            updatePriceDisplay();
            updateServiceBanner();
            renderLowStockPanel();
            startNewsBanner();

            const successMsg = document.getElementById('successMessage');
            successMsg.textContent = ok ? t('priceListSaved') : t('priceListSavedLocal');
            successMsg.classList.add('show');
            setTimeout(() => successMsg.classList.remove('show'), 3000);
        }

        // Passa da Cocktail a Snack e viceversa
        function setCategory(category) {
            currentCategory = category;
            localStorage.setItem('currentCategory', category);
            updateCategoryTabs();
            renderCocktails();
        }

        function updateCategoryTabs() {
            // Evidenzia la scheda attiva e la porta in vista se fuori schermo
            Object.keys(CATEGORIES).forEach(cat => {
                const id = 'tab' + cat.charAt(0).toUpperCase() + cat.slice(1);
                const el = document.getElementById(id);
                if (el) el.classList.toggle('active', currentCategory === cat);
            });
            const active = document.querySelector('.category-tab.active');
            if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        // Mostra/nasconde le sfumature ai bordi in base a quanto si è
        // scorso: niente sfumatura a sinistra se si è già all'inizio,
        // niente a destra se si è arrivati in fondo.
        function updateTabScrollHints() {
            const tabs = document.getElementById('categoryTabs');
            const wrap = document.getElementById('categoryTabsWrap');
            if (!tabs || !wrap) return;
            const atStart = tabs.scrollLeft <= 2;
            const atEnd = tabs.scrollLeft >= tabs.scrollWidth - tabs.clientWidth - 2;
            wrap.classList.toggle('at-start', atStart);
            wrap.classList.toggle('at-end', atEnd);
        }

        // Scorre la fila di schede di circa una scheda alla volta.
        // Le frecce sono la parte esplicita del suggerimento: un pulsante
        // si riconosce come controllo molto più di una sfumatura sullo sfondo.
        function scrollTabs(direction) {
            const tabs = document.getElementById('categoryTabs');
            if (!tabs) return;
            tabs.scrollBy({ left: direction * 110, behavior: 'smooth' });
            markTabsScrollDiscovered();
        }

        // Una volta che l'utente ha scorso almeno una volta (a mano o con
        // le frecce), il richiamo visivo non serve più: il gesto è chiaro.
        function markTabsScrollDiscovered() {
            if (localStorage.getItem('discoveredTabScroll')) return;
            localStorage.setItem('discoveredTabScroll', '1');
            const tabs = document.getElementById('categoryTabs');
            const rightArrow = document.querySelector('.tab-scroll-arrow-right');
            if (tabs) tabs.classList.remove('swipe-hint');
            if (rightArrow) rightArrow.classList.remove('needs-attention');
        }

        function initTabScrollHints() {
            const tabs = document.getElementById('categoryTabs');
            if (!tabs) return;
            const hasMoreThanFits = tabs.scrollWidth > tabs.clientWidth + 4;

            tabs.addEventListener('scroll', () => {
                updateTabScrollHints();
                markTabsScrollDiscovered(); // anche lo scorrimento manuale conta
            }, { passive: true });
            updateTabScrollHints();

            if (!hasMoreThanFits) return;

            // Finché l'utente non ha mai scoperto che si scorre, la freccia
            // destra pulsa e la fila fa un piccolo movimento a ogni apertura:
            // due richiami diversi, non solo uno sottile, per essere sicuri
            // che si notino.
            if (!localStorage.getItem('discoveredTabScroll')) {
                const rightArrow = document.querySelector('.tab-scroll-arrow-right');
                if (rightArrow) rightArrow.classList.add('needs-attention');
                setTimeout(() => {
                    tabs.classList.add('swipe-hint');
                    setTimeout(() => tabs.classList.remove('swipe-hint'), 2200);
                }, 500);
            }
        }

        // Render cocktails
        function renderCocktails() {
            const grid = document.getElementById('cocktailGrid');

            // I lavoretti sono un catalogo a parte: niente varianti,
            // niente prezzo a fasce, solo una mancia fissa.
            if (currentCategory === 'chores') {
                renderChoreCards(grid);
                return;
            }

            // I pacchetti festa sono prenotazioni, non ordini immediati:
            // catalogo e modale sono completamente diversi dal resto.
            if (currentCategory === 'party') {
                renderPartyCards(grid);
                return;
            }

            grid.innerHTML = getCatalogItems().map(item => {
                const baseName = item.name;
                // I prodotti digitali (es. il libro in PDF) restano acquistabili
                // anche a servizio chiuso: non dipendono dal bar fisico.
                const closed = !isServiceOpen() && !getDigitalProduct(baseName);
                const soldOut = isSoldOut(baseName) || closed;
                // Su un prodotto esaurito l'offerta non ha senso: non si può ordinare
                const special = !soldOut && !item.premium && isSpecial(baseName);
                const basePrices = pricing.items[baseName]?.prices || [0.50];
                let fromPrice = Math.min(...basePrices);
                if (item.premium) fromPrice += getPremiumSurcharge(baseName);

                let cardClass = item.premium ? ' cocktail-premium' : (special ? ' cocktail-special' : '');
                if (soldOut) cardClass += ' cocktail-soldout';

                const badge = soldOut
                    ? (isSoldOut(baseName)
                        ? `<div class="soldout-ribbon">${t('soldOutLabel')}</div>`
                        : `<div class="soldout-ribbon closed-ribbon">${t('closedLabel')}</div>`)
                    : (item.premium
                        ? `<div class="premium-badge">⭐ ${t('premiumLabel')}</div>`
                        : (special ? `<div class="special-badge">🔥 ${t('specialOffer')}</div>` : ''));

                // Se esaurito la card non è cliccabile
                const openHandler = soldOut ? '' : ` onclick="openOrderModal('${item.displayName}')"`;

                return `
                <div class="cocktail-card${cardClass}"${openHandler}>
                    ${badge}
                    <div class="cocktail-icon">${item.icon}</div>
                    <div class="cocktail-info">
                        <div class="cocktail-name">${item.displayName}</div>
                        <div class="cocktail-description">${translateDescription(item.description)}${item.premium ? ` · <em>${t('premiumDesc')}</em>` : ''}</div>
                        <div class="cocktail-price">${t('fromPrice')} ${formatPrice(fromPrice)}</div>
                    </div>
                    ${soldOut
                        ? `<button class="order-btn order-btn-disabled" disabled>${isSoldOut(baseName) ? t('soldOutButton') : t('closedButton')}</button>`
                        : `<button class="order-btn" onclick="event.stopPropagation(); openOrderModal('${item.displayName}')">${t('orderNow')}</button>`}
                </div>`;
            }).join('');
        }

        // Open order modal
        // Card semplificata per un lavoretto: icona, nome, mancia,
        // pulsante "Assegna" invece di "Ordina".
        function renderChoreCards(grid) {
            const closed = !isServiceOpen(); // i lavoretti seguono comunque gli orari di servizio? No: sempre disponibili
            grid.innerHTML = chores.map(c => {
                const paused = isChorePaused(c.id);
                const tip = formatPrice(getChoreTip(c.id));
                const badge = paused ? `<div class="soldout-ribbon closed-ribbon">${t('chorePausedLabel')}</div>` : '';
                const openHandler = paused ? '' : ` onclick="openChoreModal('${c.id}')"`;
                return `
                <div class="cocktail-card${paused ? ' cocktail-soldout' : ''}"${openHandler}>
                    ${badge}
                    <div class="cocktail-icon">${c.icon}</div>
                    <div class="cocktail-info">
                        <div class="cocktail-name">${c.name}</div>
                        <div class="cocktail-description">${t('choreCat_' + c.category) || c.category}</div>
                        <div class="cocktail-price">${tip}</div>
                    </div>
                    ${paused
                        ? `<button class="order-btn order-btn-disabled" disabled>${t('choresPausedButton')}</button>`
                        : `<button class="order-btn" onclick="event.stopPropagation(); openChoreModal('${c.id}')">${t('assignChore')}</button>`}
                </div>`;
            }).join('');
        }

        // =============================================
        // ASSEGNAZIONE LAVORETTI
        // =============================================
        let selectedChoreId = null;
        let chores_data = []; // lavoretti caricati dal cloud

        function openChoreModal(choreId) {
            const chore = choreById(choreId);
            if (!chore) return;
            selectedChoreId = choreId;
            document.getElementById('choreModalIcon').textContent = chore.icon;
            document.getElementById('choreModalName').textContent = chore.name;
            document.getElementById('choreModalTip').textContent = formatPrice(getChoreTip(choreId));
            document.getElementById('choreNote').value = '';
            document.getElementById('choreModal').classList.add('active');
        }

        function closeChoreModal() {
            document.getElementById('choreModal').classList.remove('active');
            selectedChoreId = null;
        }

        async function confirmChoreAssign() {
            const chore = choreById(selectedChoreId);
            if (!chore) return;

            const note = document.getElementById('choreNote').value.trim();
            const now = new Date();
            const choreOrder = {
                id: Date.now(),
                choreId: chore.id,
                name: chore.name,
                icon: chore.icon,
                tip: formatPrice(getChoreTip(chore.id)),
                assignedBy: customerName,
                userId: getUserId(customerName),
                note: note,
                date: now.toLocaleDateString('it-IT'),
                time: now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
                done: false
            };

            chores_data.unshift(choreOrder);
            closeChoreModal();

            if (cloudReady()) {
                try {
                    await firestoreDb.collection('chores').doc(String(choreOrder.id)).set(choreOrder);
                } catch (error) {
                    console.log('Errore salvataggio lavoretto:', error);
                }
            }

            // Notifica Daniel via WhatsApp
            let message = `🧹 *NUOVO LAVORETTO*\n\n`;
            message += `📋 *Cosa:* ${chore.icon} ${chore.name}\n`;
            message += `👤 *Richiesto da:* ${customerName}\n`;
            message += `💰 *Mancia:* ${choreOrder.tip}\n`;
            if (note) message += `📝 *Note:* ${note}\n`;
            message += `\n➡️ Segna come fatto nell'app quando lo hai completato!`;
            openWhatsApp(ADMIN_PHONE, encodeURIComponent(message));

            renderChoresPanels();

            const successMsg = document.getElementById('successMessage');
            successMsg.textContent = t('choreAssignedMsg').replace('{name}', chore.name);
            successMsg.classList.add('show');
            setTimeout(() => successMsg.classList.remove('show'), 3000);
        }

        // Carica i lavoretti dal cloud
        async function loadChoresFromCloud() {
            if (!cloudReady() || !customerName) return;
            try {
                // Daniel e Renato hanno bisogno di tutti i lavoretti; a un
                // cliente serve solo quello che ha assegnato lui. Chiedere
                // l'intera collezione a tutti costava una lettura per
                // documento a ogni giro di polling e faceva transitare i
                // dati degli altri nel suo browser.
                let query = firestoreDb.collection('chores');
                if (!canSupervise()) {
                    query = query.where('userId', '==', getUserId(customerName));
                }
                const snapshot = await query.get();
                chores_data = snapshot.docs.map(d => d.data()).sort((a, b) => b.id - a.id);
                renderChoresPanels();
            } catch (error) {
                console.log('Lavoretti non disponibili:', error);
            }
        }

        // L'admin spunta un lavoretto come fatto: resta "da pagare"
        async function markChoreDone(id) {
            if (!isAdmin()) return; // le regole Firestore concedono chores/update solo a Daniel
            const chore = chores_data.find(c => c.id === id);
            if (!chore) return;
            chore.done = true;
            chore.doneDate = new Date().toLocaleDateString('it-IT');
            renderChoresPanels();
            if (cloudReady()) {
                try {
                    await firestoreDb.collection('chores').doc(String(id)).update({ done: true, doneDate: chore.doneDate });
                } catch (error) {
                    console.log('Errore aggiornamento lavoretto:', error);
                }
            }
        }

        // Daniel salda tutte le mance dei lavoretti fatti
        async function settleChorePayouts() {
            if (!isAdmin()) return; // le regole Firestore concedono chores/delete solo a Daniel
            const done = chores_data.filter(c => c.done);
            if (done.length === 0) return;
            const total = done.reduce((s, c) => s + (parseFloat(String(c.tip).replace(',', '.').replace('€', '')) || 0), 0);
            if (!confirm(t('confirmSettleChores').replace('{total}', formatPrice(total)))) return;

            chores_data = chores_data.filter(c => !c.done);
            renderChoresPanels();

            if (cloudReady()) {
                for (const c of done) {
                    try { await firestoreDb.collection('chores').doc(String(c.id)).delete(); }
                    catch (error) { console.log('Errore rimozione lavoretto pagato:', error); }
                }
            }
        }

        // Aggiorna sia il pannello admin che la mini-lista personale
        function renderChoresPanels() {
            renderAdminChoresPanel();
            renderMyChoresPanel();
        }

        function renderAdminChoresPanel() {
            const panel = document.getElementById('adminChoresPanel');
            if (!panel) return;
            if (!canSupervise()) { panel.style.display = 'none'; return; }

            const todo = chores_data.filter(c => !c.done);
            const done = chores_data.filter(c => c.done);

            if (todo.length === 0 && done.length === 0) { panel.style.display = 'none'; return; }
            panel.style.display = 'block';

            document.getElementById('choresTodoCount').textContent = todo.length;

            document.getElementById('choresTodoList').innerHTML = todo.length
                ? todo.map(c => `
                    <div class="chore-row">
                        <div class="chore-row-info">
                            <strong>${escapeHtml(c.icon)} ${escapeHtml(c.name)}</strong> — <span class="chore-tip">${escapeHtml(c.tip)}</span><br>
                            <small>${t('requestedBy')} ${escapeHtml(c.assignedBy)} · ${escapeHtml(c.date)} ${escapeHtml(c.time)}</small>
                            ${c.note ? `<br><small>📝 ${escapeHtml(c.note)}</small>` : ''}
                        </div>
                        ${isAdmin() ? `<button class="chore-done-btn" onclick="markChoreDone(${c.id})">✓ ${t('choreDone')}</button>` : `<span class="chore-status">👁️ ${t('supervisorViewOnly')}</span>`}
                    </div>`).join('')
                : `<p class="ing-help">${t('noChoresTodo')}</p>`;

            const totalOwed = done.reduce((s, c) => s + (parseFloat(String(c.tip).replace(',', '.').replace('€', '')) || 0), 0);
            const payoutBox = document.getElementById('chorePayoutBox');
            if (done.length > 0) {
                payoutBox.style.display = 'block';
                document.getElementById('chorePayoutTotal').textContent = formatPrice(totalOwed);
                document.getElementById('chorePayoutList').innerHTML = done.map(c =>
                    `<div class="chore-payout-item">${escapeHtml(c.icon)} ${escapeHtml(c.name)} — ${escapeHtml(c.tip)} <em>(${escapeHtml(c.assignedBy)})</em></div>`
                ).join('');
                const settleBtn = document.getElementById('settleChoresBtn');
                if (settleBtn) settleBtn.style.display = isAdmin() ? 'block' : 'none'; // saldare è compito di Daniel
            } else {
                payoutBox.style.display = 'none';
            }
        }

        // Mini-lista personale: cosa ho assegnato io e a che punto è
        function renderMyChoresPanel() {
            const panel = document.getElementById('myChoresPanel');
            if (!panel) return;
            if (isAdmin() || !customerName) { panel.style.display = 'none'; return; }

            const mine = chores_data.filter(c => c.userId === getUserId(customerName));
            if (mine.length === 0) { panel.style.display = 'none'; return; }

            panel.style.display = 'block';
            document.getElementById('myChoresList').innerHTML = mine.map(c => `
                <div class="chore-row">
                    <div class="chore-row-info">
                        <strong>${escapeHtml(c.icon)} ${escapeHtml(c.name)}</strong> — <span class="chore-tip">${escapeHtml(c.tip)}</span>
                    </div>
                    <span class="chore-status ${c.done ? 'chore-status-done' : ''}">${c.done ? '✅ ' + t('choreDoneLabel') : '⏳ ' + t('choreTodoLabel')}</span>
                </div>`).join('');
        }

        // Card di un pacchetto festa: mostra cosa contiene e il prezzo
        // di partenza (fascia più economica), pulsante "Prenota".
        function renderPartyCards(grid) {
            grid.innerHTML = partyPackages.map(p => {
                const paused = isPartyPaused(p.id);
                const fromPrice = formatPrice(getPartyTierPrice(p.id, 0));
                const badge = paused ? `<div class="soldout-ribbon closed-ribbon">${t('choresPausedButton')}</div>` : '';
                const openHandler = paused ? '' : ` onclick="openPartyModal('${p.id}')"`;
                const contents = [...p.drinks, ...p.food, ...p.dessert].slice(0, 3).join(', ');
                return `
                <div class="cocktail-card${paused ? ' cocktail-soldout' : ''}"${openHandler}>
                    ${badge}
                    <div class="cocktail-icon">${p.icon}</div>
                    <div class="cocktail-info">
                        <div class="cocktail-name">${t('party_' + p.id)}</div>
                        <div class="cocktail-description">${contents}...</div>
                        <div class="cocktail-price">${t('fromPrice')} ${fromPrice}</div>
                    </div>
                    ${paused
                        ? `<button class="order-btn order-btn-disabled" disabled>${t('choresPausedButton')}</button>`
                        : `<button class="order-btn" onclick="event.stopPropagation(); openPartyModal('${p.id}')">${t('bookParty')}</button>`}
                </div>`;
            }).join('');
        }

        // =============================================
        // PRENOTAZIONE PACCHETTI FESTA
        // Diversamente da tutto il resto: qui si sceglie una data futura
        // e la richiesta resta "in attesa" finché Daniel non conferma
        // la disponibilità (o la rifiuta con un motivo).
        // =============================================
        let selectedPartyId = null;
        let selectedPartyTier = 0;
        let partyBookings_data = [];

        let editingPartyBookingId = null; // se valorizzato, si sta modificando una richiesta esistente
        let rebookingCancelledParty = false; // true se si sta riproponendo una festa annullata

        // Una festa annullata può essere riaperta: il cliente propone una
        // nuova data/orario e la richiesta torna "in attesa" di conferma,
        // senza dover ricominciare la prenotazione da zero.
        function openRebookPartyModal(bookingId) {
            const booking = partyBookings_data.find(b => b.id === bookingId);
            if (!booking || booking.status !== 'cancelled') return;
            editingPartyBookingId = bookingId;
            rebookingCancelledParty = true;
            openPartyModal(booking.partyId, booking);
        }

        function openPartyModal(partyId, prefill) {
            const party = partyById(partyId);
            if (!party) return;
            selectedPartyId = partyId;
            selectedPartyTier = prefill ? PARTY_GUEST_TIERS.indexOf(prefill.guests) : 0;
            if (selectedPartyTier < 0) selectedPartyTier = 0;

            document.getElementById('partyModalIcon').textContent = party.icon;
            document.getElementById('partyModalName').textContent = t('party_' + partyId);
            document.getElementById('partyDrinks').textContent = party.drinks.join(', ');
            document.getElementById('partyFood').textContent = party.food.join(', ');
            // Non tutti i pacchetti hanno un dolce (es. il BBQ): un testo
            // di riserva invece di lasciare la riga vuota.
            document.getElementById('partyDessert').textContent = party.dessert.length ? party.dessert.join(', ') : t('partyNotIncluded');
            document.getElementById('partyDecor').textContent = party.decor;
            document.getElementById('partyNote').value = prefill ? (prefill.note || '') : '';

            // Data minima: da domani in poi, non ha senso prenotare per oggi.
            // toISOString() userebbe l'UTC (stesso rischio di sfasamento
            // della funzione qui sopra): calcoliamo la data locale a mano.
            const tomorrow = new Date(Date.now() + 86400000);
            const yyyy = tomorrow.getFullYear();
            const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const dd = String(tomorrow.getDate()).padStart(2, '0');
            const dateInput = document.getElementById('partyDate');
            dateInput.min = `${yyyy}-${mm}-${dd}`;
            dateInput.value = prefill ? prefill.eventDate : '';
            document.getElementById('partyTime').value = prefill ? (prefill.eventTime || '') : '';

            // Il pulsante e l'avviso cambiano testo a seconda del caso:
            // nuova richiesta, modifica di una in attesa, oppure nuova
            // data proposta per una festa annullata.
            const btnLabel = rebookingCancelledParty ? t('rebookPartyConfirm') : (prefill ? t('updatePartyRequest') : t('sendPartyRequest'));
            const noticeLabel = rebookingCancelledParty ? t('partyRebookNotice') : (prefill ? t('partyEditingNotice') : t('partyConfirmationNotice'));
            document.getElementById('partyConfirmBtn').textContent = btnLabel;
            document.getElementById('partyConfirmationNotice').textContent = noticeLabel;

            renderPartyTierButtons(partyId);
            document.getElementById('partyModal').classList.add('active');
        }

        // Finché la richiesta è "in attesa", il cliente può ancora
        // correggere fascia, data, orario o note. Una volta confermata o
        // rifiutata, non si può più modificare (bisogna farne una nuova).
        function openEditPartyModal(bookingId) {
            const booking = partyBookings_data.find(b => b.id === bookingId);
            if (!booking || booking.status !== 'pending') return;
            editingPartyBookingId = bookingId;
            openPartyModal(booking.partyId, booking);
        }

        function renderPartyTierButtons(partyId) {
            const box = document.getElementById('partyTierButtons');
            box.innerHTML = PARTY_GUEST_TIERS.map((guests, i) => `
                <button type="button" class="variant-btn party-tier-btn${i === selectedPartyTier ? ' selected' : ''}"
                        onclick="selectPartyTier(${i})">
                    ${guests} ${t('guestsLabel')}<br><strong>${formatPrice(getPartyTierPrice(partyId, i))}</strong>
                </button>
            `).join('');
        }

        function selectPartyTier(tierIndex) {
            selectedPartyTier = tierIndex;
            renderPartyTierButtons(selectedPartyId);
        }

        function closePartyModal() {
            document.getElementById('partyModal').classList.remove('active');
            selectedPartyId = null;
            editingPartyBookingId = null;
            rebookingCancelledParty = false;
        }

        async function confirmPartyBooking() {
            const party = partyById(selectedPartyId);
            if (!party) return;

            const eventDate = document.getElementById('partyDate').value;
            const eventTime = document.getElementById('partyTime').value;
            if (!eventDate) {
                alert(t('partyDateRequired'));
                return;
            }
            if (!eventTime) {
                alert(t('partyTimeRequired'));
                return;
            }

            const note = document.getElementById('partyNote').value.trim();
            const guests = PARTY_GUEST_TIERS[selectedPartyTier];
            const price = formatPrice(getPartyTierPrice(selectedPartyId, selectedPartyTier));
            const now = new Date();

            if (editingPartyBookingId) {
                // Due casi condividono questo ramo: la modifica di una
                // richiesta ancora in attesa, e il "riproponi" di una festa
                // annullata (che torna in attesa con la nuova data/orario).
                const booking = partyBookings_data.find(b => b.id === editingPartyBookingId);
                if (!booking) { closePartyModal(); return; }

                const wasRebook = rebookingCancelledParty;

                booking.guests = guests;
                booking.price = price;
                booking.eventDate = eventDate;
                booking.eventTime = eventTime;
                booking.note = note;
                if (wasRebook) {
                    booking.status = 'pending';
                    booking.cancelReason = '';
                    booking.cancelledAt = null; // non è più annullata: non deve scadere
                }

                const editedId = editingPartyBookingId;
                closePartyModal();
                renderPartyPanels();

                if (cloudReady()) {
                    try {
                        const updateData = { guests, price, eventDate, eventTime, note };
                        if (wasRebook) { updateData.status = 'pending'; updateData.cancelReason = ''; updateData.cancelledAt = null; }
                        await firestoreDb.collection('partyBookings').doc(String(editedId)).update(updateData);
                    } catch (error) { console.log('Errore aggiornamento prenotazione:', error); }
                }

                // Se in futuro questa festa venisse confermata o annullata
                // di nuovo, deve poter generare un nuovo avviso: puliamo i
                // riferimenti alla vecchia risoluzione già vista.
                if (wasRebook) {
                    try {
                        let seen = JSON.parse(localStorage.getItem('seenPartyResolutions') || '[]');
                        seen = seen.filter(s => s !== editedId && s !== ('cancel-' + editedId));
                        localStorage.setItem('seenPartyResolutions', JSON.stringify(seen));
                    } catch (e) { /* nessun problema se non c'era nulla da pulire */ }
                }

                let updateMsg = wasRebook
                    ? `🎉 *NUOVA DATA PROPOSTA (evento annullato in precedenza)*\n\n`
                    : `🎉 *RICHIESTA FESTA AGGIORNATA*\n\n`;
                updateMsg += `📋 *Pacchetto:* ${booking.icon} ${booking.partyName}\n`;
                updateMsg += `👤 *Richiesto da:* ${customerName}\n`;
                updateMsg += `📅 *Data evento:* ${formatEventDate(eventDate)}\n`;
                updateMsg += `⏰ *Orario:* ${eventTime}\n`;
                updateMsg += `👥 *Invitati:* ${guests}\n`;
                updateMsg += `💰 *Prezzo:* ${price}\n`;
                if (note) updateMsg += `📝 *Note:* ${note}\n`;
                updateMsg += wasRebook
                    ? `\n➡️ Verifica la disponibilità per la nuova data e conferma o rifiuta!`
                    : `\n➡️ I dati della richiesta sono cambiati, verifica di nuovo la disponibilità!`;
                openWhatsApp(ADMIN_PHONE, encodeURIComponent(updateMsg));

                const successMsg = document.getElementById('successMessage');
                successMsg.textContent = wasRebook ? t('partyRebookedMsg') : t('partyUpdatedMsg');
                successMsg.classList.add('show');
                setTimeout(() => successMsg.classList.remove('show'), 3500);
                return;
            }

            const booking = {
                id: Date.now(),
                partyId: party.id,
                partyName: translations.it['party_' + party.id] || party.name, // salvato in italiano: lo vede Daniel
                icon: party.icon,
                guests: guests,
                price: price,
                eventDate: eventDate,
                eventTime: eventTime,
                note: note,
                requestedBy: customerName,
                userId: getUserId(customerName),
                requestedAt: Date.now(),
                requestedDate: now.toLocaleDateString('it-IT'),
                status: 'pending'
            };

            partyBookings_data.unshift(booking);
            closePartyModal();

            if (cloudReady()) {
                try {
                    await firestoreDb.collection('partyBookings').doc(String(booking.id)).set(booking);
                } catch (error) {
                    console.log('Errore salvataggio prenotazione:', error);
                }
            }

            let message = `🎉 *NUOVA RICHIESTA PACCHETTO FESTA*\n\n`;
            message += `📋 *Pacchetto:* ${booking.icon} ${booking.partyName}\n`;
            message += `👤 *Richiesto da:* ${customerName}\n`;
            message += `📅 *Data evento:* ${formatEventDate(eventDate)}\n`;
            message += `⏰ *Orario:* ${eventTime}\n`;
            message += `👥 *Invitati:* ${guests}\n`;
            message += `💰 *Prezzo:* ${price}\n`;
            if (note) message += `📝 *Note:* ${note}\n`;
            message += `\n➡️ Conferma o rifiuta la disponibilità nell'app!`;
            openWhatsApp(ADMIN_PHONE, encodeURIComponent(message));

            renderPartyPanels();

            const successMsg = document.getElementById('successMessage');
            successMsg.textContent = t('partyRequestedMsg');
            successMsg.classList.add('show');
            setTimeout(() => successMsg.classList.remove('show'), 3500);
        }

        // Carica le prenotazioni dal cloud
        // Una festa annullata resta visibile per poterla riproporre con
        // una nuova data. Ma se restano annullate per troppo tempo senza
        // che nessuno le riprenda, si accumulano inutilmente: dopo 10
        // giorni vengono eliminate da sole.
        const CANCELLED_PARTY_CLEANUP_MS = 10 * 24 * 60 * 60 * 1000;

        // Cancellazione definitiva: la fa solo l'admin. Prima girava su ogni
        // dispositivo, quello dei clienti compreso, e decideva sull'orologio
        // locale — un telefono avanti di undici giorni avrebbe potuto ripulire
        // di colpo le feste annullate di tutti.
        async function cleanupOldCancelledParties() {
            if (!isAdmin() || !cloudReady()) return;

            const now = Date.now();
            const stale = partyBookings_data.filter(b => {
                if (b.status !== 'cancelled') return false;
                // Senza timestamp l'età non è calcolabile: prima il fallback a 0
                // significava "scaduta dal 1970" e la prenotazione spariva
                // subito. Meglio lasciarla stare che cancellare al buio.
                const quando = b.cancelledAt || b.requestedAt;
                if (!quando) return false;
                return (now - quando) > CANCELLED_PARTY_CLEANUP_MS;
            });
            if (stale.length === 0) return;

            const staleIds = stale.map(b => b.id);
            partyBookings_data = partyBookings_data.filter(b => !staleIds.includes(b.id));

            for (const b of stale) {
                // Prima le foto delle sue checklist, altrimenti restano
                // documenti orfani senza più nessuno che li nomini.
                await deleteChecklistPhotos(
                    [[b.prepChecklist, 'prep'], [b.cleanupChecklist, 'cleanup']],
                    (tipo, itemId) => partyPhotoId(b.id, tipo, itemId)
                );
                try { await firestoreDb.collection('partyBookings').doc(String(b.id)).delete(); }
                catch (error) { console.log('Errore pulizia festa annullata scaduta:', error); }
            }
        }

        async function loadPartyBookingsFromCloud() {
            if (!cloudReady() || !customerName) return;
            try {
                let docs;
                if (canSupervise()) {
                    docs = (await firestoreDb.collection('partyBookings').get()).docs;
                } else {
                    // Al cliente servono due cose, e nient'altro: le proprie
                    // prenotazioni in qualunque stato, e quelle confermate di
                    // tutti, che il pannello "feste in arrivo" mostra a tutta
                    // la famiglia. Due query mirate invece dell'intera
                    // collezione: le richieste in attesa, rifiutate e
                    // annullate degli altri non escono più dal database.
                    const [mine, confirmed] = await Promise.all([
                        firestoreDb.collection('partyBookings').where('userId', '==', getUserId(customerName)).get(),
                        firestoreDb.collection('partyBookings').where('status', '==', 'confirmed').get()
                    ]);
                    docs = mine.docs.concat(confirmed.docs);
                }
                // Le due query possono restituire lo stesso documento (una
                // festa mia e confermata): si tiene una copia per id.
                const byId = new Map();
                docs.forEach(d => byId.set(d.id, d.data()));
                partyBookings_data = Array.from(byId.values()).sort((a, b) => b.requestedAt - a.requestedAt);
                await cleanupOldCancelledParties();
                renderPartyPanels();
            } catch (error) {
                console.log('Prenotazioni feste non disponibili:', error);
            }
        }

        // L'admin accetta: la data è confermata
        async function acceptPartyBooking(id) {
            if (!isAdmin()) return; // accettare una festa è di Daniel
            const booking = partyBookings_data.find(b => b.id === id);
            if (!booking) return;
            if (!confirm(t('confirmAcceptParty').replace('{name}', booking.partyName))) return;

            booking.status = 'confirmed';
            renderPartyPanels();

            // Il pagamento del pacchetto segue lo stesso percorso di un
            // ordine normale: creiamo un ordine per l'intero importo, che
            // il cliente troverà nel suo storico e salderà con "Paga e
            // chiudi conto" (contanti, oppure carta con lo sconto fedeltà).
            // L'id dell'ordine resta collegato alla prenotazione: se Daniel
            // dovesse annullare più avanti, sappiamo cosa rimuovere.
            const order = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                userId: booking.userId,
                customerName: booking.requestedBy,
                cocktail: `${booking.icon} ${booking.partyName}`,
                variant: `${booking.guests} ${t('guestsLabel')}`,
                location: 'Evento',
                time: `${formatEventDate(booking.eventDate)}, ore ${booking.eventTime || '-'}`,
                orderTime: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
                orderDate: new Date().toLocaleDateString('it-IT'),
                notes: booking.note || '',
                price: booking.price
            };
            booking.orderId = order.id;

            if (cloudReady()) {
                try {
                    await firestoreDb.collection('orders').doc(String(order.id)).set(order);
                    await firestoreDb.collection('partyBookings').doc(String(id)).update({ status: 'confirmed', orderId: order.id });
                } catch (error) { console.log('Errore conferma festa:', error); }
            }

            // Se è Daniel stesso a guardare lo storico, lo vede aggiornato subito
            await loadOrdersFromCloud();
        }

        // L'admin rifiuta: chiede un motivo breve (data non disponibile, ecc.)
        async function rejectPartyBooking(id) {
            if (!isAdmin()) return;
            const booking = partyBookings_data.find(b => b.id === id);
            if (!booking) return;
            const reason = prompt(t('partyRejectReasonPrompt'));
            if (reason === null) return; // annullato

            booking.status = 'rejected';
            booking.rejectReason = reason || t('partyRejectReasonDefault');
            renderPartyPanels();
            if (cloudReady()) {
                try {
                    await firestoreDb.collection('partyBookings').doc(String(id)).update({
                        status: 'rejected',
                        rejectReason: booking.rejectReason
                    });
                } catch (error) { console.log('Errore rifiuto festa:', error); }
            }
        }

        // Il cliente scopre l'esito (confermata/rifiutata) e la richiesta
        // sparisce dalla sua vista dopo l'avviso, come per i pagamenti.
        async function checkMyPartyBookingsStatus() {
            if (!customerName || isAdmin()) return;
            const mine = partyBookings_data.filter(b => b.userId === getUserId(customerName));
            const seen = JSON.parse(localStorage.getItem('seenPartyResolutions') || '[]');
            const toRemove = []; // rifiutate/annullate: una volta viste, non servono più

            for (const b of mine) {
                if (b.status === 'confirmed' && !seen.includes(b.id)) {
                    alert(t('partyConfirmedAlert').replace('{name}', b.partyName).replace('{date}', formatEventDate(b.eventDate)));
                    seen.push(b.id);
                } else if (b.status === 'rejected' && !seen.includes(b.id)) {
                    alert(t('partyRejectedAlert').replace('{name}', b.partyName).replace('{reason}', b.rejectReason || ''));
                    seen.push(b.id);
                    toRemove.push(b.id);
                } else if (b.status === 'cancelled' && !seen.includes('cancel-' + b.id)) {
                    alert(t('partyCancelledAlert').replace('{name}', b.partyName).replace('{reason}', b.cancelReason || ''));
                    seen.push('cancel-' + b.id);
                    // Non la rimuoviamo: il cliente potrebbe volerla riaprire
                    // e proporre una nuova data, invece di dover ricominciare
                    // da capo scegliendo di nuovo il pacchetto.
                }
            }
            localStorage.setItem('seenPartyResolutions', JSON.stringify(seen));

            // Una richiesta rifiutata o un evento annullato, una volta letto
            // l'avviso, non ha più motivo di restare: si comporta come un
            // ordine rifiutato, che sparisce dopo la notifica.
            if (toRemove.length) {
                partyBookings_data = partyBookings_data.filter(b => !toRemove.includes(b.id));
                renderPartyPanels();
                if (cloudReady()) {
                    for (const id of toRemove) {
                        try { await firestoreDb.collection('partyBookings').doc(String(id)).delete(); }
                        catch (error) { console.log('Errore rimozione prenotazione risolta:', error); }
                    }
                }
            }
        }

        function renderPartyPanels() {
            renderAdminPartyPanel();
            renderMyPartyPanel();
            renderPublicPartyPanel();
        }

        // =============================================
        // CHECKLIST PREPARAZIONE E PULIZIA
        // Una copia per evento (non condivisa tra feste diverse), così
        // Daniel segna i progressi specifici di quella data.
        // =============================================
        function buildDefaultPrepChecklist() {
            return [
                'Controllare scorte ingredienti e ghiaccio',
                'Allestire il bancone bar',
                'Preparare tavoli e sedie per gli invitati',
                'Montare le decorazioni a tema',
                'Preparare bicchieri e attrezzature',
                'Verificare che i bagni siano puliti e riforniti',
                'Controllare che i cestini della spazzatura siano vuoti',
                'Testare impianto audio/luci, se previsto'
            ].map((label, i) => ({ id: i, label, done: false }));
        }

        function buildDefaultCleanupChecklist() {
            return [
                'Lavare i pavimenti',
                'Pulire i bagni',
                'Pulire e riordinare il bancone bar',
                'Svuotare e sostituire i sacchi della spazzatura',
                'Lavare bicchieri e stoviglie rimaste',
                'Rimuovere decorazioni e disallestire',
                'Riporre tavoli e sedie',
                'Arieggiare il locale',
                'Aggiornare il magazzino con le scorte residue'
            ].map((label, i) => ({ id: i, label, done: false }));
        }

        // Quali checklist sono aperte in questo momento (si perde al
        // ricaricamento, non serve persisterlo: è solo stato di vista).
        const expandedChecklists = new Set();

        function toggleChecklistView(bookingId, type) {
            const key = bookingId + '-' + type;
            if (expandedChecklists.has(key)) expandedChecklists.delete(key);
            else expandedChecklists.add(key);
            renderAdminPartyPanel();
        }

        async function toggleChecklistItem(bookingId, type, itemId) {
            if (!isAdmin()) return; // la casella è già disabilitata, ma la guardia va anche qui
            const booking = partyBookings_data.find(b => b.id === bookingId);
            if (!booking) return;
            const list = type === 'prep' ? booking.prepChecklist : booking.cleanupChecklist;
            const item = list && list.find(i => i.id === itemId);
            if (!item) return;

            if (!item.done && !item.photo && !item.hasPhoto) {
                alert(t('photoProofRequired'));
                renderAdminPartyPanel(); // ripristina la checkbox
                return;
            }

            item.done = !item.done;
            renderAdminPartyPanel();

            if (cloudReady()) {
                const field = type === 'prep' ? 'prepChecklist' : 'cleanupChecklist';
                try { await firestoreDb.collection('partyBookings').doc(String(bookingId)).update({ [field]: list }); }
                catch (error) { console.log('Errore aggiornamento checklist:', error); }
            }
        }

        function renderChecklistBlock(booking, type) {
            const list = type === 'prep' ? booking.prepChecklist : booking.cleanupChecklist;
            const done = list.filter(i => i.done).length;
            const label = type === 'prep' ? t('prepChecklistBtn') : t('cleanupChecklistBtn');
            const expanded = expandedChecklists.has(booking.id + '-' + type);
            const editable = isAdmin(); // il supervisore vede i progressi, non li spunta al posto di Daniel

            const items = expanded ? `
                <div class="checklist-items">
                    ${list.map(item => `
                        <div class="checklist-item-row">
                            <label class="checklist-item${item.done ? ' checklist-item-done' : ''}" style="${editable ? '' : 'cursor:default;'}">
                                <input type="checkbox" ${item.done ? 'checked' : ''} ${editable ? '' : 'disabled'}
                                       onchange="toggleChecklistItem(${booking.id}, '${type}', ${item.id})">
                                <span>${escapeHtml(item.label)}</span>
                            </label>
                            ${renderPhotoControls(
                                photoOf(item, partyPhotoId(booking.id, type, item.id)), editable,
                                `handlePartyPhotoSelected(${booking.id}, '${type}', ${item.id}, this.files[0])`,
                                `removePartyPhoto(${booking.id}, '${type}', ${item.id})`,
                                `partyPhotoInput-${booking.id}-${type}-${item.id}`
                            )}
                        </div>
                    `).join('')}
                </div>` : '';

            // Solo per la checklist aperta: chiuse non costano una lettura.
            if (expanded) {
                ensurePhotos(
                    list.filter(i => i.hasPhoto && !i.photo).map(i => partyPhotoId(booking.id, type, i.id)),
                    renderAdminPartyPanel
                );
            }

            return `
                <button type="button" class="checklist-toggle" onclick="toggleChecklistView(${booking.id}, '${type}')">
                    ${label} (${done}/${list.length})
                </button>
                ${items}`;
        }

        async function handlePartyPhotoSelected(bookingId, type, itemId, file) {
            if (!file || !isAdmin()) return;
            const booking = partyBookings_data.find(b => b.id === bookingId);
            if (!booking) return;
            const list = type === 'prep' ? booking.prepChecklist : booking.cleanupChecklist;
            const item = list.find(i => i.id === itemId);
            if (!item) return;
            try {
                const dataUrl = await compressImageFile(file, 640, 0.55);
                const salvata = await savePhoto(partyPhotoId(bookingId, type, itemId), dataUrl);
                if (!salvata) { alert(t('photoSaveFailed')); return; }
                item.hasPhoto = true;
                delete item.photo; // eventuale copia nel vecchio formato: ora è di troppo
                renderAdminPartyPanel();
                const field = type === 'prep' ? 'prepChecklist' : 'cleanupChecklist';
                await firestoreDb.collection('partyBookings').doc(String(bookingId)).update({ [field]: list });
            } catch (error) {
                console.log('Errore allegato foto checklist evento:', error);
                alert(t('photoSaveFailed'));
            }
        }

        async function removePartyPhoto(bookingId, type, itemId) {
            if (!isAdmin()) return;
            const booking = partyBookings_data.find(b => b.id === bookingId);
            if (!booking) return;
            const list = type === 'prep' ? booking.prepChecklist : booking.cleanupChecklist;
            const item = list.find(i => i.id === itemId);
            if (!item) return;
            await deletePhoto(partyPhotoId(bookingId, type, itemId));
            delete item.photo;
            item.hasPhoto = false;
            item.done = false; // senza foto non c'è più la prova
            renderAdminPartyPanel();
            if (cloudReady()) {
                try {
                    const field = type === 'prep' ? 'prepChecklist' : 'cleanupChecklist';
                    await firestoreDb.collection('partyBookings').doc(String(bookingId)).update({ [field]: list });
                } catch (error) { console.log('Errore rimozione foto evento:', error); }
            }
        }

        // L'admin annulla un evento già confermato per un imprevisto.
        // Rimuove anche l'ordine di pagamento già creato: il cliente non
        // deve restare a dover pagare qualcosa che non si farà più.
        async function cancelPartyBooking(id) {
            if (!isAdmin()) return;
            const booking = partyBookings_data.find(b => b.id === id);
            if (!booking) return;

            const reason = prompt(t('partyCancelReasonPrompt'));
            if (reason === null) return; // annullata l'azione stessa

            if (!confirm(t('confirmCancelParty').replace('{name}', booking.partyName))) return;

            booking.status = 'cancelled';
            booking.cancelReason = reason.trim() || t('partyCancelReasonDefault');
            booking.cancelledAt = Date.now(); // serve per la pulizia automatica dopo 10 giorni
            renderPartyPanels();

            orders = orders.filter(o => o.id !== booking.orderId);
            saveOrders();
            renderOrders();

            if (cloudReady()) {
                try {
                    await firestoreDb.collection('partyBookings').doc(String(id)).update({
                        status: 'cancelled',
                        cancelReason: booking.cancelReason,
                        cancelledAt: booking.cancelledAt
                    });
                    if (booking.orderId) {
                        await firestoreDb.collection('orders').doc(String(booking.orderId)).delete();
                    }
                } catch (error) { console.log('Errore annullamento festa:', error); }
            }
        }

        // Pannello pubblico: visibile a chiunque (non solo a chi ha
        // prenotato o all'admin), un calendario condiviso di cosa è in
        // programma per tutta la famiglia.
        function renderPublicPartyPanel() {
            const panel = document.getElementById('publicPartyPanel');
            if (!panel) return;
            if (!customerName) { panel.style.display = 'none'; return; }

            const upcoming = partyBookings_data
                .filter(b => b.status === 'confirmed')
                .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

            if (upcoming.length === 0) { panel.style.display = 'none'; return; }
            panel.style.display = 'block';
            document.getElementById('publicPartyCount').textContent = upcoming.length;

            document.getElementById('publicPartyList').innerHTML = upcoming.map(b => `
                <div class="chore-row">
                    <div class="chore-row-info">
                        <strong>${escapeHtml(b.icon)} ${escapeHtml(t('party_' + b.partyId))}</strong><br>
                        <small>📅 ${formatEventDate(b.eventDate)} · ⏰ ${escapeHtml(b.eventTime || '-')} · 👥 ${escapeHtml(b.guests)} ${t('guestsLabel')} · ${t('hostedBy')} ${escapeHtml(b.requestedBy)}</small>
                    </div>
                </div>
            `).join('');
        }

        // =============================================
        // CHECKLIST STUDIO GIORNALIERA
        // Un'unica checklist condivisa (non per evento come le feste):
        // si azzera da sola ogni giorno. Chiunque in famiglia la vede,
        // ma solo Daniel può spuntarla — l'autovalutazione è il punto,
        // non farla segnare a qualcun altro.
        // =============================================
        // =============================================
        // FOTO ALLEGATE ALLE CHECKLIST (studio e feste)
        // Compresse lato client, UNA PER DOCUMENTO nella collezione
        // checklistPhotos.
        //
        // Prima stavano dentro il documento della checklist. Il calcolo
        // tornava per la checklist studio (4 voci), ma non era stato
        // rifatto quando la stessa meccanica è passata alle checklist degli
        // eventi, che hanno 17 voci: 17 foto in base64 fanno 0,7-1,4 MB
        // contro il limite di 1 MiB per documento. Oltre la soglia
        // Firestore rifiuta la scrittura, e l'errore finiva in un
        // console.log: la foto compariva nell'interfaccia, sembrava
        // salvata, e alla ricarica non c'era più. Proprio sulle prove del
        // lavoro fatto.
        //
        // Con un documento per foto il limite non si avvicina nemmeno, e il
        // documento della prenotazione torna leggero: non trascina più
        // centinaia di KB di base64 a ogni giro di polling.
        //
        // Firebase Storage resterebbe la sede giusta per i file binari, ma
        // va attivato dalla console e le sue regole pubblicate da lì.
        // =============================================
        const photoCache = new Map();     // id foto → data URL, oppure null se non c'è
        const photoInFlight = new Set();  // id già in corso di scaricamento

        function studyPhotoId(itemId, dayId) {
            return 'study_' + (dayId || todayId()) + '_' + itemId;
        }

        function partyPhotoId(bookingId, type, itemId) {
            return 'party_' + bookingId + '_' + type + '_' + itemId;
        }

        // La foto da mostrare per una voce. item.photo è il formato vecchio
        // (base64 dentro il documento): resta leggibile, così le checklist
        // già compilate non perdono le prove già caricate.
        function photoOf(item, photoId) {
            if (item.photo) return item.photo;
            if (!item.hasPhoto) return null;
            return photoCache.get(photoId) || null;
        }

        // Scarica le foto che servono e richiama il render una volta sola,
        // quando sono arrivate. Le voci senza foto non costano nulla, e ogni
        // id viene chiesto una volta per sessione.
        // collezione e campo sono parametri con un valore di default: lo stesso
        // meccanismo serve anche alle immagini del banner novità, che stanno in
        // bannerImages/<id> col campo "image". Le chiamate esistenti non
        // cambiano.
        function ensurePhotos(ids, onLoaded, collezione, campo) {
            if (!cloudReady()) return;
            const nomeColl = collezione || 'checklistPhotos';
            const nomeCampo = campo || 'photo';
            const daPrendere = ids.filter(id => id && !photoCache.has(id) && !photoInFlight.has(id));
            if (!daPrendere.length) return;
            daPrendere.forEach(id => photoInFlight.add(id));
            Promise.all(daPrendere.map(async (id) => {
                try {
                    const doc = await firestoreDb.collection(nomeColl).doc(id).get();
                    photoCache.set(id, doc.exists ? (doc.data()[nomeCampo] || null) : null);
                } catch (error) {
                    // Si registra null anche in caso di errore: senza questo il
                    // render successivo richiederebbe la stessa foto in un ciclo
                    // senza fine. Un ricaricamento della pagina riprova.
                    photoCache.set(id, null);
                    console.log('Foto non disponibile:', id, error);
                } finally {
                    photoInFlight.delete(id);
                }
            })).then(() => { if (typeof onLoaded === 'function') onLoaded(); });
        }

        // Ritorna true solo se la foto è davvero salvata. Chi chiama deve
        // guardare l'esito: era proprio il silenzio a far sparire le prove.
        async function savePhoto(photoId, dataUrl) {
            if (!isAdmin()) return false; // le prove del lavoro le carica Daniel
            photoCache.set(photoId, dataUrl);
            if (!cloudReady()) return false;
            try {
                await firestoreDb.collection('checklistPhotos').doc(photoId).set({
                    photo: dataUrl,
                    updatedAt: Date.now()
                });
                return true;
            } catch (error) {
                console.log('Errore salvataggio foto:', error);
                photoCache.delete(photoId);
                return false;
            }
        }

        async function deletePhoto(photoId) {
            if (!isAdmin()) return;
            photoCache.set(photoId, null);
            if (!cloudReady()) return;
            try { await firestoreDb.collection('checklistPhotos').doc(photoId).delete(); }
            catch (error) { console.log('Errore rimozione foto:', error); }
        }

        // Le foto di una checklist che sta per sparire (festa annullata e
        // ripulita, giornata di studio archiviata): senza questo resterebbero
        // documenti orfani a occupare spazio per sempre.
        async function deleteChecklistPhotos(lists, idFor) {
            const ids = [];
            (lists || []).forEach(([list, tipo]) => {
                (list || []).forEach(item => {
                    if (item.hasPhoto) ids.push(idFor(tipo, item.id));
                });
            });
            for (const id of ids) await deletePhoto(id);
        }

        function compressImageFile(file, maxWidth, quality) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const scale = Math.min(1, maxWidth / img.width);
                        const canvas = document.createElement('canvas');
                        canvas.width = Math.round(img.width * scale);
                        canvas.height = Math.round(img.height * scale);
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL('image/jpeg', quality));
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        function openPhotoLightbox(src) {
            document.getElementById('photoLightboxImg').src = src;
            document.getElementById('photoLightboxModal').classList.add('active');
        }

        function closePhotoLightbox() {
            document.getElementById('photoLightboxModal').classList.remove('active');
        }

        // Riga HTML riusabile per il pulsante fotocamera + miniatura,
        // usata sia dalla checklist studio sia da quelle degli eventi.
        function renderPhotoControls(photo, editable, onSelect, onRemove, inputId) {
            const thumb = photo
                ? `<img class="checklist-photo-thumb" src="${escapeAttr(photo)}" onclick="openPhotoLightbox(this.src)" alt="Foto allegata">
                   ${editable ? `<button type="button" class="checklist-photo-remove" onclick="${onRemove}">✕</button>` : ''}`
                : '';
            const addBtn = (editable && !photo)
                ? `<button type="button" class="checklist-photo-btn" onclick="document.getElementById('${inputId}').click()">📷</button>`
                : '';
            const input = editable
                ? `<input type="file" accept="image/*" capture="environment" style="display:none" id="${inputId}" onchange="${onSelect}">`
                : '';
            return `<span class="checklist-photo-area">${thumb}${addBtn}${input}</span>`;
        }

        function buildDefaultStudyChecklist() {
            return [
                'Compiti scritti completati',
                'Materiale per domani preparato',
                'Ripasso di almeno 20 minuti fatto',
                'Diario/agenda controllato'
            ].map((label, i) => ({ id: i, label, done: false }));
        }

        let studyChecklist = { date: '', items: [] };

        function todayKey() {
            return new Date().toLocaleDateString('it-IT'); // gg/mm/aaaa, da mostrare
        }

        // Stessa data in forma ordinabile e valida come id di documento
        // (niente barre): 2026-08-31.
        function dayId(date) {
            const d = date || new Date();
            const p = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
        }

        function todayId() {
            return dayId();
        }

        function studyChecklistRef(id) {
            return firestoreDb.collection('settings').doc('studyChecklist_' + (id || todayId()));
        }

        // Una checklist per giorno, con la data nell'id del documento, e solo
        // il dispositivo di Daniel la crea.
        //
        // Prima c'era un unico documento riscritto ogni giorno, e a riscriverlo
        // era QUALUNQUE dispositivo che vedesse una data diversa dalla propria,
        // calcolata sull'orologio locale: bastava un telefono avanti di un
        // giorno — o un fuso diverso in vacanza — per azzerare i progressi e le
        // foto già caricate da Daniel. Ora il peggio che può fare un orologio
        // sbagliato è creare la checklist di un altro giorno, senza distruggere
        // quella di oggi.
        async function loadStudyChecklistFromCloud() {
            if (!cloudReady()) return;
            try {
                const doc = await studyChecklistRef().get();
                if (doc.exists) {
                    studyChecklist = doc.data();
                } else {
                    // Eredità: il documento unico del formato precedente, se è di oggi
                    const legacy = await firestoreDb.collection('settings').doc('studyChecklist').get();
                    const dati = legacy.exists ? legacy.data() : null;
                    if (dati && dati.date === todayKey()) {
                        studyChecklist = dati;
                        if (isAdmin()) await studyChecklistRef().set(studyChecklist);
                    } else if (isAdmin()) {
                        studyChecklist = { date: todayKey(), items: buildDefaultStudyChecklist() };
                        await studyChecklistRef().set(studyChecklist);
                        pulisciFotoStudioVecchie(); // in sottofondo, senza far attendere
                    } else {
                        // Non c'è ancora la checklist di oggi: la famiglia vede il
                        // pannello vuoto finché Daniel non apre l'app. Meglio di un
                        // azzeramento deciso dall'orologio di chi sta guardando.
                        studyChecklist = { date: todayKey(), items: [] };
                    }
                }
                renderStudyChecklistPanel();
                renderSuperStudyControl(); // il pulsante di Renato deve riflettere subito i dati appena arrivati
            } catch (error) {
                console.log('Checklist studio non disponibile:', error);
            }
        }

        // Le checklist dei giorni passati restano (sono minuscole e fanno
        // storia), le loro FOTO no: sono la parte che pesa. Si spazzano i
        // sette giorni precedenti, una volta al giorno, solo da admin.
        async function pulisciFotoStudioVecchie() {
            if (!isAdmin() || !cloudReady()) return;
            for (let i = 1; i <= 7; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const id = dayId(d);
                try {
                    const doc = await studyChecklistRef(id).get();
                    if (!doc.exists) continue;
                    const items = doc.data().items || [];
                    for (const item of items) {
                        if (item.hasPhoto) await deletePhoto(studyPhotoId(item.id, id));
                    }
                    if (items.some(i2 => i2.hasPhoto)) {
                        await studyChecklistRef(id).set({
                            items: items.map(i2 => Object.assign({}, i2, { hasPhoto: false }))
                        }, { merge: true });
                    }
                } catch (error) { /* niente da fare: si riprova domani */ }
            }
        }

        async function toggleStudyChecklistItem(itemId) {
            if (!isAdmin()) return; // solo Daniel spunta la propria checklist
            const item = studyChecklist.items.find(i => i.id === itemId);
            if (!item) return;

            // Non si può spuntare senza una foto come prova. Scheckare
            // resta sempre libero: togliere una prova già data va bene.
            if (!item.done && !item.photo && !item.hasPhoto) {
                alert(t('photoProofRequired'));
                renderStudyChecklistPanel(); // ripristina la checkbox, il click nativo l'aveva già spuntata
                return;
            }

            item.done = !item.done;
            renderStudyChecklistPanel();
            if (cloudReady()) {
                try {
                    await studyChecklistRef().set(studyChecklist);
                } catch (error) { console.log('Errore aggiornamento checklist studio:', error); }
            }
        }

        function renderStudyChecklistPanel() {
            const panel = document.getElementById('studyChecklistPanel');
            if (!panel || !customerName || !studyChecklist.items.length) {
                if (panel) panel.style.display = 'none';
                return;
            }
            panel.style.display = 'block';
            document.getElementById('studyChecklistDate').textContent = studyChecklist.date;
            const doneCount = studyChecklist.items.filter(i => i.done).length;
            document.getElementById('studyChecklistCount').textContent = `${doneCount}/${studyChecklist.items.length}`;

            const editable = isAdmin();
            document.getElementById('studyChecklistList').innerHTML = studyChecklist.items.map(item => `
                <div class="checklist-item-row">
                    <label class="checklist-item${item.done ? ' checklist-item-done' : ''}" style="${editable ? '' : 'cursor:default;'}">
                        <input type="checkbox" ${item.done ? 'checked' : ''} ${editable ? '' : 'disabled'}
                               onchange="toggleStudyChecklistItem(${item.id})">
                        <span>${escapeHtml(item.label)}</span>
                    </label>
                    ${renderPhotoControls(
                        photoOf(item, studyPhotoId(item.id)), editable,
                        `handleStudyPhotoSelected(${item.id}, this.files[0])`,
                        `removeStudyPhoto(${item.id})`,
                        'studyPhotoInput-' + item.id
                    )}
                </div>
            `).join('');

            // Le foto vivono in documenti a parte: si chiedono solo quelle
            // che servono, e il pannello si ridisegna quando arrivano.
            ensurePhotos(
                studyChecklist.items.filter(i => i.hasPhoto && !i.photo).map(i => studyPhotoId(i.id)),
                renderStudyChecklistPanel
            );
        }

        async function handleStudyPhotoSelected(itemId, file) {
            if (!file || !isAdmin()) return;
            const item = studyChecklist.items.find(i => i.id === itemId);
            if (!item) return;
            try {
                const dataUrl = await compressImageFile(file, 640, 0.55);
                const salvata = await savePhoto(studyPhotoId(itemId), dataUrl);
                if (!salvata) { alert(t('photoSaveFailed')); return; }
                item.hasPhoto = true;
                delete item.photo; // se c'era una copia nel vecchio formato, ora è di troppo
                renderStudyChecklistPanel();
                await studyChecklistRef().set(studyChecklist);
            } catch (error) {
                console.log('Errore allegato foto checklist studio:', error);
                alert(t('photoSaveFailed'));
            }
        }

        async function removeStudyPhoto(itemId) {
            if (!isAdmin()) return;
            const item = studyChecklist.items.find(i => i.id === itemId);
            if (!item) return;
            await deletePhoto(studyPhotoId(itemId));
            delete item.photo;
            item.hasPhoto = false;
            // Senza foto non c'è più la prova: la spunta perde senso
            item.done = false;
            renderStudyChecklistPanel();
            if (cloudReady()) {
                try { await studyChecklistRef().set(studyChecklist); }
                catch (error) { console.log('Errore rimozione foto:', error); }
            }
        }

        function renderAdminPartyPanel() {
            const panel = document.getElementById('adminPartyPanel');
            if (!panel) return;
            if (!canSupervise()) { panel.style.display = 'none'; return; }

            const pending = partyBookings_data.filter(b => b.status === 'pending');
            const confirmed = partyBookings_data.filter(b => b.status === 'confirmed')
                .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

            if (pending.length === 0 && confirmed.length === 0) { panel.style.display = 'none'; return; }
            panel.style.display = 'block';
            document.getElementById('partyPendingCount').textContent = pending.length;

            document.getElementById('partyPendingList').innerHTML = pending.length
                ? pending.map(b => `
                    <div class="chore-row">
                        <div class="chore-row-info">
                            <strong>${escapeHtml(b.icon)} ${escapeHtml(b.partyName)}</strong> — <span class="chore-tip">${escapeHtml(b.price)}</span><br>
                            <small>${t('requestedBy')} ${escapeHtml(b.requestedBy)} · 📅 ${formatEventDate(b.eventDate)} · ⏰ ${escapeHtml(b.eventTime || '-')} · 👥 ${escapeHtml(b.guests)}</small>
                            ${b.note ? `<br><small>📝 ${escapeHtml(b.note)}</small>` : ''}
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            ${isAdmin() ? `
                            <button class="chore-done-btn" onclick="acceptPartyBooking(${b.id})">✓ ${t('accept')}</button>
                            <button class="reject-btn" onclick="rejectPartyBooking(${b.id})">🚫 ${t('rejectOrder')}</button>` : `
                            <span class="chore-status">👁️ ${t('supervisorViewOnly')}</span>`}
                        </div>
                    </div>`).join('')
                : `<p class="ing-help">${t('noPartyPending')}</p>`;

            const upcomingBox = document.getElementById('partyUpcomingBox');
            if (confirmed.length > 0) {
                // Ogni evento confermato: dati essenziali, le due checklist
                // e il pulsante per annullarlo in caso di imprevisti.
                confirmed.forEach(b => {
                    if (!b.prepChecklist) b.prepChecklist = buildDefaultPrepChecklist();
                    if (!b.cleanupChecklist) b.cleanupChecklist = buildDefaultCleanupChecklist();
                });

                upcomingBox.style.display = 'block';
                document.getElementById('partyUpcomingList').innerHTML = confirmed.map(b => `
                    <div class="party-confirmed-card">
                        <div class="chore-payout-item">
                            📅 ${formatEventDate(b.eventDate)} ⏰ ${escapeHtml(b.eventTime || '-')} — ${escapeHtml(b.icon)} ${escapeHtml(b.partyName)}
                            (${escapeHtml(b.guests)} ${t('guestsLabel')}) <em>${escapeHtml(b.requestedBy)}</em>
                        </div>
                        ${renderChecklistBlock(b, 'prep')}
                        ${renderChecklistBlock(b, 'cleanup')}
                        ${isAdmin() ? `<button class="reject-btn" style="margin-top:8px; width:100%;" onclick="cancelPartyBooking(${b.id})">🚫 ${t('cancelParty')}</button>` : ''}
                    </div>
                `).join('');
            } else {
                upcomingBox.style.display = 'none';
            }
        }

        function renderMyPartyPanel() {
            const panel = document.getElementById('myPartyPanel');
            if (!panel) return;
            if (isAdmin() || !customerName) { panel.style.display = 'none'; return; }

            const mine = partyBookings_data.filter(b => b.userId === getUserId(customerName));
            if (mine.length === 0) { panel.style.display = 'none'; return; }

            panel.style.display = 'block';
            document.getElementById('myPartyCount').textContent = mine.length;
            document.getElementById('myPartyList').innerHTML = mine.map(b => {
                const statusLabel = b.status === 'confirmed' ? '✅ ' + t('partyConfirmedLabel')
                    : b.status === 'rejected' ? '❌ ' + t('partyRejectedLabel')
                    : b.status === 'cancelled' ? '🚫 ' + t('partyCancelledLabel')
                    : '⏳ ' + t('partyPendingLabel');
                const statusClass = b.status === 'confirmed' ? 'chore-status-done' : '';
                // Finché è in attesa, il cliente può ancora correggere i dati.
                // Se è stata annullata, può riproporre una nuova data.
                const editBtn = b.status === 'pending'
                    ? `<button class="chore-done-btn" style="margin-top:4px;" onclick="openEditPartyModal(${b.id})">✏️ ${t('editParty')}</button>`
                    : b.status === 'cancelled'
                    ? `<button class="chore-done-btn" style="margin-top:4px;" onclick="openRebookPartyModal(${b.id})">🔄 ${t('rebookParty')}</button>`
                    : '';
                const reasonNote = (b.status === 'cancelled' && b.cancelReason)
                    ? `<br><small>📝 ${escapeHtml(b.cancelReason)}</small>` : '';
                return `
                <div class="chore-row">
                    <div class="chore-row-info">
                        <strong>${escapeHtml(b.icon)} ${escapeHtml(t('party_' + b.partyId))}</strong> — <span class="chore-tip">${escapeHtml(b.price)}</span><br>
                        <small>📅 ${formatEventDate(b.eventDate)} · ⏰ ${escapeHtml(b.eventTime || '-')} · 👥 ${escapeHtml(b.guests)} ${t('guestsLabel')}</small>${reasonNote}
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                        <span class="chore-status ${statusClass}">${statusLabel}</span>
                        ${editBtn}
                    </div>
                </div>`;
            }).join('');
        }

        function openOrderModal(cocktailName) {
            // cocktailName può essere "Mojito" o "Mojito Premium"
            const cocktail = findProduct(cocktailName);
            if (!cocktail) return;

            // Protezione: a servizio chiuso non si ordina. Eccezione: un
            // prodotto digitale (es. il libro in PDF) non dipende dagli
            // orari del bar fisico, si può acquistare sempre.
            if (!isServiceOpen() && !getDigitalProduct(cocktailName)) {
                const next = nextOpeningText();
                alert(next ? t('serviceClosedUntil').replace('{time}', next) : t('serviceClosed'));
                return;
            }

            // Protezione: un prodotto esaurito non è ordinabile
            if (isSoldOut(cocktailName)) {
                alert(t('soldOutAlert').replace('{name}', cocktailName));
                return;
            }
            
            selectedCocktail = cocktailName;
            selectedVariant = cocktail.variants[0]; // Auto-select first variant
            selectedDeliveryTime = 'Subito'; // Reset to default
            
            document.getElementById('modalCocktail').value = cocktailName;
            document.getElementById('orderModal').classList.add('active');
            renderUpsell(cocktailName);
            
            // Render variant buttons
            const variantButtons = document.getElementById('variantButtons');
            variantButtons.innerHTML = cocktail.variants.map(variant => `
                <button type="button" class="variant-btn cocktail-variant-btn" data-value="${variant}" onclick="selectVariant('${variant}')">
                    ${translateVariant(variant)}
                </button>
            `).join('');
            
            // Reset form
            document.getElementById('orderNotes').value = '';

            // Il merchandising si ritira al banco: niente posizione né orario.
            const merchandise = isMerch(cocktailName);
            document.getElementById('locationFormGroup').style.display = merchandise ? 'none' : 'block';
            document.getElementById('timeFormGroup').style.display = merchandise ? 'none' : 'block';
            document.getElementById('merchPickupNotice').style.display = merchandise ? 'block' : 'none';

            // Reset selections to defaults
            selectedDeliveryTime = merchandise ? '' : 'Subito';
            selectedLocation = merchandise ? '' : 'Dove Sono io';
            
            // Pre-select default buttons after a short delay to ensure buttons are rendered
            setTimeout(() => {
                selectVariant(cocktail.variants[0]); // Select first variant (also updates price)
                if (!merchandise) {
                    selectDeliveryTime('Subito');
                    selectLocation('Dove Sono io');
                }
            }, 10);
        }

        // Select variant
        function selectVariant(variant) {
            selectedVariant = variant;
            
            // Update button states - ONLY for cocktail variant buttons
            const buttons = document.querySelectorAll('.cocktail-variant-btn');
            buttons.forEach(btn => {
                if (btn.getAttribute('data-value') === variant) {
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            });
            
            // Update price display
            updatePriceDisplay();
        }

        // Update price display based on selected variant
        // =============================================
        // UPSELLING NEL MODALE ORDINE
        // Propone fino a 2 prodotti complementari a ciò che si sta
        // ordinando. Stessa logica di abbinamento già usata da Danny
        // (cocktail↔snack, cibo↔bibita), per restare coerenti:
        // non deve sembrare un secondo consiglio in contraddizione.
        // =============================================
        let upsellSelection = {}; // { nomeProdotto: true } — extra scelti in questo ordine

        // Prodotti disponibili di una categoria, esclusi esauriti e quello
        // che si sta già ordinando
        function availableIn(list, excludeName) {
            const excludeBase = baseNameOf(excludeName || '');
            return list.filter(p => p.name !== excludeBase && !isSoldOut(p.name));
        }

        function pickUpsellSuggestions(orderingName) {
            if (!isServiceOpen()) return [];

            const base = baseNameOf(orderingName);
            const isCocktailOrder = cocktails.some(c => c.name === base);
            const isSnackOrder = snacks.some(s => s.name === base);
            const isDrinkOrder = softdrinks.some(d => d.name === base);
            const isDessertOrder = desserts.some(d => d.name === base);

            let pool = [];
            if (isCocktailOrder) {
                // Un cocktail si abbina bene a uno snack e a un dolce
                pool = availableIn(snacks, base).slice(0, 1)
                    .concat(availableIn(desserts, base).slice(0, 1));
            } else if (isSnackOrder) {
                // Uno snack chiama una bibita, poi eventualmente un altro snack
                pool = availableIn(softdrinks, base).slice(0, 1)
                    .concat(availableIn(snacks, base).slice(0, 1));
            } else if (isDrinkOrder) {
                pool = availableIn(snacks, base).slice(0, 2);
            } else if (isDessertOrder) {
                // Chi ordina un dolce ha già chiuso bene da solo:
                // niente da proporre, come da regola.
                pool = [];
            }

            return pool.filter(Boolean).slice(0, 2);
        }

        function renderUpsell(orderingName) {
            upsellSelection = {};
            const section = document.getElementById('upsellSection');
            const cardsBox = document.getElementById('upsellCards');
            const suggestions = pickUpsellSuggestions(orderingName);

            if (suggestions.length === 0) {
                section.style.display = 'none';
                cardsBox.innerHTML = '';
                return;
            }

            cardsBox.innerHTML = suggestions.map(p => {
                const price = formatPrice(getBasePrice(p.name, 0));
                const safeId = p.name.replace(/\s+/g, '_');
                return `
                    <div class="upsell-card" id="upsell-${safeId}">
                        <div class="upsell-icon">${p.icon}</div>
                        <div class="upsell-name">${p.name}</div>
                        <div class="upsell-price">${price}</div>
                        <button type="button" class="upsell-add" onclick="toggleUpsell('${p.name}', '${safeId}')">
                            + ${t('upsellAdd')}
                        </button>
                    </div>`;
            }).join('');

            section.style.display = 'block';
        }

        function toggleUpsell(productName, safeId) {
            const card = document.getElementById('upsell-' + safeId);
            const btn = card.querySelector('.upsell-add');
            if (upsellSelection[productName]) {
                delete upsellSelection[productName];
                card.classList.remove('upsell-selected');
                btn.textContent = '+ ' + t('upsellAdd');
            } else {
                upsellSelection[productName] = true;
                card.classList.add('upsell-selected');
                btn.textContent = '✓ ' + t('upsellAdded');
            }
            updatePriceDisplay(); // Il totale mostrato include ora anche gli extra
        }

        function updatePriceDisplay() {
            const cocktail = findProduct(selectedCocktail);
            if (!cocktail) return;

            const totalPrice = computePrice(selectedCocktail, selectedVariant, selectedDeliveryTime);

            // Gli extra scelti nell'upselling si sommano al prezzo mostrato:
            // il cliente deve vedere subito quanto pagherà in totale.
            const extrasTotal = Object.keys(upsellSelection).reduce((sum, name) => {
                const product = findProduct(name);
                if (!product) return sum;
                return sum + getBasePrice(baseNameOf(name), 0);
            }, 0);

            const priceFormatted = formatPrice(totalPrice + extrasTotal);
            
            const priceDisplay = document.getElementById('priceDisplay');
            if (priceDisplay) {
                priceDisplay.textContent = priceFormatted;
            }
        }

        // Select delivery time
        function selectDeliveryTime(time) {
            selectedDeliveryTime = time;
            
            // Update button states for delivery time buttons using data-value
            const timeButtons = document.querySelectorAll('.delivery-time-btn');
            timeButtons.forEach(btn => {
                if (btn.getAttribute('data-value') === time) {
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            });
            
            // Update price display
            updatePriceDisplay();
        }

        // Select location
        function selectLocation(location) {
            selectedLocation = location;
            
            // Update button states for location buttons using data-value
            const locationButtons = document.querySelectorAll('.location-btn');
            locationButtons.forEach(btn => {
                if (btn.getAttribute('data-value') === location) {
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            });
        }

        // Select contact from device contacts
        async function selectFromContacts() {
            try {
                // Check if Contact Picker API is supported
                if ('contacts' in navigator && 'ContactsManager' in window) {
                    const props = ['name'];
                    const opts = { multiple: false };
                    
                    const contacts = await navigator.contacts.select(props, opts);
                    
                    if (contacts && contacts.length > 0) {
                        const contact = contacts[0];
                        const newName = contact.name || '';
                        document.getElementById('customerName').value = newName;
                        // Aggiorna anche il nome salvato
                        if (newName) {
                            userName = newName;
                            localStorage.setItem('userName', newName);
                        }
                    }
                } else {
                    // Fallback: just focus the input field
                    alert('La selezione dalla rubrica non è supportata su questo dispositivo. Puoi modificare manualmente il nome.');
                    document.getElementById('customerName').focus();
                }
            } catch (error) {
                // User cancelled or error occurred
                console.log('Contact selection cancelled or error:', error);
            }
        }

        // Close modal
        function closeModal() {
            document.getElementById('orderModal').classList.remove('active');
        }

        // Get GPS location
        function getGPSLocation() {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocation non supportata dal browser'));
                    return;
                }
                
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy
                        });
                    },
                    (error) => {
                        reject(error);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            });
        }

        // Confirm order
        async function confirmOrder() {
            const notes = document.getElementById('orderNotes').value.trim();

            // Il servizio potrebbe aver chiuso mentre il modale era aperto
            // (i prodotti digitali fanno eccezione, come sopra)
            if (!isServiceOpen() && !getDigitalProduct(selectedCocktail)) {
                const next = nextOpeningText();
                alert(next ? t('serviceClosedUntil').replace('{time}', next) : t('serviceClosed'));
                closeModal();
                renderCocktails();
                return;
            }

            // Il prodotto potrebbe essere finito mentre il modale era aperto
            if (isSoldOut(selectedCocktail)) {
                alert(t('soldOutAlert').replace('{name}', selectedCocktail));
                closeModal();
                renderCocktails();
                return;
            }

            // Calculate price using the shared pricing configuration
            const price = formatPrice(computePrice(selectedCocktail, selectedVariant, selectedDeliveryTime));

            // Get GPS coordinates if location is "Dove Sono io"
            let gpsCoordinates = null;
            if (selectedLocation === 'Dove Sono io') {
                // Show loading message
                const confirmBtn = document.querySelector('.btn-primary');
                const originalText = confirmBtn.textContent;
                confirmBtn.textContent = t('gettingLocation');
                confirmBtn.disabled = true;
                
                try {
                    gpsCoordinates = await getGPSLocation();
                } catch (error) {
                    console.error('Error getting GPS:', error);
                    
                    // Restore button
                    confirmBtn.textContent = originalText;
                    confirmBtn.disabled = false;
                    
                    // Determine error type and show appropriate message
                    let errorMessage = t('gpsErrorTitle');
                    
                    if (error.code === 1) { // PERMISSION_DENIED
                        errorMessage += t('gpsErrorDenied');
                    } else if (error.code === 2) { // POSITION_UNAVAILABLE
                        errorMessage += t('gpsErrorUnavailable');
                    } else if (error.code === 3) { // TIMEOUT
                        errorMessage += t('gpsErrorTimeout');
                    } else {
                        errorMessage += t('gpsErrorUnknown');
                    }
                    
                    alert(errorMessage);
                    return;
                }
                
                // Restore button
                confirmBtn.textContent = originalText;
                confirmBtn.disabled = false;
            }

            const now = new Date();
            const orderTime = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            const orderDate = now.toLocaleDateString('it-IT');

            const order = {
                id: Date.now(),
                userId: getUserId(customerName),
                customerName: customerName,
                cocktail: selectedCocktail,
                variant: selectedVariant,
                location: selectedLocation,
                time: selectedDeliveryTime,
                orderTime: orderTime,
                orderDate: orderDate,
                notes: notes,
                price: price,
                gps: gpsCoordinates
            };

            // Gli extra scelti nell'upselling diventano ordini a sé stanti,
            // stessa posizione e orario del prodotto principale.
            const extraNames = Object.keys(upsellSelection);
            const extraOrders = extraNames.map((name, i) => {
                const product = findProduct(name);
                const variant = product ? product.variants[0] : '';
                return {
                    id: order.id + 1 + i,
                    userId: order.userId,
                    customerName: customerName,
                    cocktail: name,
                    variant: variant,
                    location: selectedLocation,
                    time: selectedDeliveryTime,
                    orderTime: orderTime,
                    orderDate: orderDate,
                    notes: '',
                    price: formatPrice(computePrice(name, variant, selectedDeliveryTime)),
                    gps: gpsCoordinates
                };
            });

            // Save order persistently
            orders.unshift(order);
            extraOrders.forEach(o => orders.unshift(o));
            ordersPage = 1; // Torna alla prima pagina per mostrare il nuovo ordine
            saveOrders();
            await saveOrderToCloud(order);
            for (const o of extraOrders) await saveOrderToCloud(o);
            await decrementStock(selectedCocktail); // Scala scorte e ingredienti
            for (const o of extraOrders) await decrementStock(o.cocktail);

            // Show success message
            const successMsg = document.getElementById('successMessage');
            successMsg.textContent = t('orderSuccess');
            successMsg.classList.add('show');
            setTimeout(() => {
                successMsg.classList.remove('show');
            }, 3000);

            // Close modal and refresh orders
            closeModal();
            renderOrders();
            resetDannyIdle(15000); // Danny riproverà dopo la pausa post-ordine

            // Passa a WhatsApp per ultimo: su mobile interrompe l'esecuzione
            sendWhatsAppMessage(order, ADMIN_PHONE, extraOrders);
        }

        // Send WhatsApp message
        function sendWhatsAppMessage(order, phone, extraOrders) {
            const merchOrder = isMerch(order.cocktail);
            let message = merchOrder ? `🛍️ *NUOVO ORDINE MERCHANDISING*\n\n` : `🍹 *NUOVO ORDINE COCKTAIL*\n\n`;
            message += `👤 *Cliente:* ${order.customerName}\n`;
            message += `📋 *${merchOrder ? 'Prodotto' : 'Cocktail'}:* ${order.cocktail} - ${order.variant}\n`;
            (extraOrders || []).forEach(extra => {
                message += `➕ *Extra:* ${extra.cocktail}${extra.variant ? ' - ' + extra.variant : ''} (${extra.price})\n`;
            });

            if (merchOrder) {
                message += `🛍️ *Ritiro:* al banco\n`;
            } else {
                message += `📍 *Posizione:* ${order.location}\n`;

                // Add GPS coordinates if available
                if (order.gps) {
                    const lat = order.gps.latitude.toFixed(6);
                    const lng = order.gps.longitude.toFixed(6);
                    message += `🌍 *Coordinate GPS:*\n`;
                    message += `https://www.google.com/maps?q=${lat},${lng}\n`;
                }

                message += `⏰ *Da servire:* ${order.time}\n`;
            }
            message += `🕐 *Ordinato alle:* ${order.orderTime}\n`;

            const extrasTotal = (extraOrders || []).reduce((sum, e) => {
                const n = parseFloat(String(e.price).replace(',', '.').replace('€', ''));
                return sum + (isNaN(n) ? 0 : n);
            }, 0);
            const mainTotal = parseFloat(String(order.price).replace(',', '.').replace('€', '')) || 0;

            if (extraOrders && extraOrders.length) {
                message += `💰 *Totale:* ${formatPrice(mainTotal + extrasTotal)}\n`;
            } else {
                message += `💰 *Prezzo:* ${order.price}\n`;
            }
            if (order.notes) {
                message += `📝 *Note:* ${order.notes}\n`;
            }
            message += `\n✅ Preparare e servire!`;

            const encodedMessage = encodeURIComponent(message);
            openWhatsApp(phone, encodedMessage);
        }

        // Render orders
        function renderOrders() {
            const ordersList = document.getElementById('ordersList');
            const totalSpentEl = document.getElementById('totalSpent');
            const countBadge = document.getElementById('ordersHistoryCount');
            if (countBadge) countBadge.textContent = orders.length;

            if (orders.length === 0) {
                ordersList.innerHTML = `<div class="no-orders">${t('noOrders')}</div>`;
                totalSpentEl.style.display = 'none';
                return;
            }

            // Calcola il totale complessivo
            const priceOf = (order) => {
                const n = parseFloat(order.price.replace(',', '.').replace('€', ''));
                return isNaN(n) ? 0 : n;
            };
            const total = orders.reduce((sum, order) => sum + priceOf(order), 0);

            // Separa gli ordini già inclusi in una richiesta in attesa da quelli ancora aperti
            const openOrders = orders.filter(o => !myPendingOrderIds.includes(o.id));
            const openTotal = openOrders.reduce((sum, order) => sum + priceOf(order), 0);

            document.getElementById('totalAmount').textContent = total.toFixed(2).replace('.', ',') + '€';
            document.getElementById('totalCount').textContent = orders.length + ' ' + (orders.length === 1 ? t('orderSingular') : t('orderPlural'));
            totalSpentEl.style.display = 'block';

            // Se ci sono ordini aggiunti dopo la richiesta, mostra quanto resta ancora da pagare
            const openInfoEl = document.getElementById('openAmountInfo');
            if (openInfoEl) {
                if (myPaymentPending && openOrders.length > 0) {
                    openInfoEl.textContent = t('stillToPay') + ' ' + openTotal.toFixed(2).replace('.', ',') + '€';
                    openInfoEl.style.display = 'block';
                } else {
                    openInfoEl.style.display = 'none';
                }
            }

            // Il pulsante di pagamento:
            // - nascosto in modalità admin (l'admin conferma, non paga)
            // - nascosto se tutti gli ordini sono già in una richiesta in attesa
            // - visibile se ci sono nuovi ordini ancora da pagare
            const payBtn = document.getElementById('payButton');
            if (payBtn) {
                payBtn.style.display = (isAdmin() || openOrders.length === 0) ? 'none' : 'inline-block';
            }

            // Paginazione sugli ordini (i più recenti per primi)
            const totalPages = Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));

            // Mantieni la pagina corrente entro i limiti validi
            if (ordersPage > totalPages) ordersPage = totalPages;
            if (ordersPage < 1) ordersPage = 1;

            const startIdx = (ordersPage - 1) * ORDERS_PER_PAGE;
            const pageOrders = orders.slice(startIdx, startIdx + ORDERS_PER_PAGE);

            let html = pageOrders.map(order => {
                const isPending = myPendingOrderIds.includes(order.id);
                const needsSync = isPendingSync(order.id);
                // L'admin può rifiutare, ma non un ordine già incluso in una
                // richiesta di pagamento in attesa: il conto è già stato chiesto.
                const canReject = isAdmin() && !needsSync;
                const merchOrder = isMerch(order.cocktail);
                return `
                <div class="order-item${isPending ? ' order-pending' : ''}">
                    <strong>${escapeHtml(order.cocktail)}</strong> - <em>${escapeHtml(translateVariant(order.variant))}</em> - <strong style="color: var(--coral);">${escapeHtml(order.price)}</strong>
                    ${isPending ? `<span class="pending-tag">⏳ ${t('pendingTag')}</span>` : ''}
                    ${needsSync ? `<span class="sync-tag">📡 ${t('syncTag')}</span>` : ''}<br>
                    👤 ${escapeHtml(order.customerName || '-')}<br>
                    ${merchOrder ? `🛍️ ${t('merchPickupLabel')}<br>` : `📍 ${escapeHtml(translateLocation(order.location))} | ⏰ ${escapeHtml(translateTime(order.time))}<br>`}
                    <small style="color: var(--dusk-soft);">${t('orderedLabel')} ${escapeHtml(order.orderDate)} ${escapeHtml(order.orderTime)}</small>
                    ${order.notes ? `<br><small>📝 ${escapeHtml(order.notes)}</small>` : ''}
                    ${canReject ? `<div class="order-actions"><button class="reject-btn" onclick="openRejectModal(${order.id})">🚫 ${t('rejectOrder')}</button></div>` : ''}
                </div>
            `;
            }).join('');

            // Controlli di paginazione (solo se serve più di una pagina)
            if (totalPages > 1) {
                let pageButtons = '';
                for (let p = 1; p <= totalPages; p++) {
                    pageButtons += `<button class="page-btn ${p === ordersPage ? 'active' : ''}" onclick="goToOrdersPage(${p})">${p}</button>`;
                }
                html += `
                    <div class="pagination">
                        <button class="page-btn nav" onclick="goToOrdersPage(${ordersPage - 1})" ${ordersPage === 1 ? 'disabled' : ''}>‹</button>
                        ${pageButtons}
                        <button class="page-btn nav" onclick="goToOrdersPage(${ordersPage + 1})" ${ordersPage === totalPages ? 'disabled' : ''}>›</button>
                    </div>
                `;
            }

            ordersList.innerHTML = html;
        }

        // Cambia pagina nello storico ordini
        function goToOrdersPage(page) {
            ordersPage = page;
            renderOrders();
            document.querySelector('.orders-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        let selectedRating = 0;

        function openReviewModal() {
            selectedRating = 0;
            document.getElementById('reviewText').value = '';
            updateStars(0);
            document.getElementById('reviewModal').classList.add('active');
        }

        function closeReviewModal() {
            document.getElementById('reviewModal').classList.remove('active');
        }

        function setRating(stars) {
            selectedRating = stars;
            updateStars(stars);

            // Le stelle selezionate rimbalzano a cascata
            const spans = document.getElementById('starRating').children;
            for (let i = 0; i < stars; i++) {
                const el = spans[i];
                el.classList.remove('pop');
                void el.offsetWidth; // forza il riavvio dell'animazione
                setTimeout(() => el.classList.add('pop'), i * 55);
            }
        }

        function hoverRating(stars) {
            updateStars(stars);
        }

        function resetHover() {
            updateStars(selectedRating);
        }

        function updateStars(count) {
            const spans = document.getElementById('starRating').children;
            for (let i = 0; i < spans.length; i++) {
                spans[i].textContent = i < count ? '★' : '☆';
                spans[i].style.color = i < count ? 'var(--sand-gold)' : 'var(--sand-deep)';
            }
        }

        // =============================================
        // RECENSIONI PUBBLICHE
        // Salvate su Firestore (collezione "reviews"), visibili a tutti.
        // =============================================
        let allReviews = [];
        let reviewsPage = 1;
        const REVIEWS_PER_PAGE = 5;

        async function saveReviewToCloud(rating, text) {
            if (!cloudReady()) return;
            try {
                const id = Date.now();
                await firestoreDb.collection('reviews').doc(String(id)).set({
                    id: id,
                    userId: getUserId(customerName),
                    customerName: customerName,
                    rating: rating,
                    text: text,
                    date: new Date().toLocaleDateString('it-IT'),
                    time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                });
            } catch (error) {
                console.log('Errore salvataggio recensione:', error);
            }
        }

        async function loadReviews() {
            if (!cloudReady()) return;
            try {
                const snapshot = await firestoreDb.collection('reviews').get();
                allReviews = snapshot.docs
                    .map(doc => doc.data())
                    .sort((a, b) => b.id - a.id); // più recenti prima
                renderReviews();
            } catch (error) {
                console.log('Errore caricamento recensioni:', error);
            }
        }

        async function openReviewsPage() {
            reviewsPage = 1;
            document.getElementById('reviewsModal').classList.add('active');
            document.getElementById('reviewsList').innerHTML =
                `<div class="no-orders">${t('loadingReviews')}</div>`;
            await loadReviews();
        }

        function closeReviewsPage() {
            document.getElementById('reviewsModal').classList.remove('active');
        }

        function goToReviewsPage(page) {
            reviewsPage = page;
            renderReviews();
        }

        // Elimina una recensione (solo admin)
        async function deleteReview(reviewId) {
            if (!isAdmin()) return;
            if (!confirm(t('confirmDeleteReview'))) return;
            try {
                await firestoreDb.collection('reviews').doc(String(reviewId)).delete();
                await loadReviews();
            } catch (error) {
                console.log('Errore eliminazione recensione:', error);
            }
        }

        function renderReviews() {
            const list = document.getElementById('reviewsList');
            const summary = document.getElementById('reviewsSummary');

            if (allReviews.length === 0) {
                summary.style.display = 'none';
                list.innerHTML = `<div class="no-orders">${t('noReviews')}</div>`;
                return;
            }

            // Media e distribuzione delle valutazioni
            const total = allReviews.reduce((s, r) => s + (r.rating || 0), 0);
            const avg = total / allReviews.length;
            document.getElementById('reviewsAvg').textContent = avg.toFixed(1).replace('.', ',');
            document.getElementById('reviewsAvgStars').textContent =
                '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));
            document.getElementById('reviewsCount').textContent =
                allReviews.length + ' ' + (allReviews.length === 1 ? t('reviewSingular') : t('reviewPlural'));

            const bars = [5, 4, 3, 2, 1].map(star => {
                const count = allReviews.filter(r => r.rating === star).length;
                const pct = Math.round((count / allReviews.length) * 100);
                return `
                    <div class="rating-bar-row">
                        <span class="rating-bar-label">${star}★</span>
                        <div class="rating-bar"><div class="rating-bar-fill" style="width:${pct}%"></div></div>
                        <span class="rating-bar-count">${count}</span>
                    </div>`;
            }).join('');
            document.getElementById('reviewsDistribution').innerHTML = bars;
            summary.style.display = 'block';

            // Paginazione
            const totalPages = Math.max(1, Math.ceil(allReviews.length / REVIEWS_PER_PAGE));
            if (reviewsPage > totalPages) reviewsPage = totalPages;
            if (reviewsPage < 1) reviewsPage = 1;
            const start = (reviewsPage - 1) * REVIEWS_PER_PAGE;
            const pageReviews = allReviews.slice(start, start + REVIEWS_PER_PAGE);

            let html = pageReviews.map(r => `
                <div class="review-item">
                    <div class="review-header">
                        <strong>${escapeHtml(r.customerName || '-')}</strong>
                        <span class="review-stars">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</span>
                    </div>
                    <div class="review-text">${escapeHtml(r.text || '')}</div>
                    <div class="review-date">
                        ${escapeHtml(r.date || '')} ${escapeHtml(r.time || '')}
                        ${isAdmin() ? `<button class="delete-review-btn" onclick="deleteReview(${r.id})">🗑️</button>` : ''}
                    </div>
                </div>
            `).join('');

            if (totalPages > 1) {
                let pageButtons = '';
                for (let p = 1; p <= totalPages; p++) {
                    pageButtons += `<button class="page-btn ${p === reviewsPage ? 'active' : ''}" onclick="goToReviewsPage(${p})">${p}</button>`;
                }
                html += `
                    <div class="pagination">
                        <button class="page-btn nav" onclick="goToReviewsPage(${reviewsPage - 1})" ${reviewsPage === 1 ? 'disabled' : ''}>‹</button>
                        ${pageButtons}
                        <button class="page-btn nav" onclick="goToReviewsPage(${reviewsPage + 1})" ${reviewsPage === totalPages ? 'disabled' : ''}>›</button>
                    </div>`;
            }

            list.innerHTML = html;
        }

        // Neutralizza l'HTML in un valore prima di interpolarlo in una
        // pagina. Da usare su TUTTO quello che arriva da Firestore: nomi,
        // note, messaggi. Chiunque possa scrivere nel database potrebbe
        // altrimenti far eseguire codice nel browser di tutti gli altri,
        // compresa la sessione admin.
        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str === undefined || str === null ? '' : str;
            return div.innerHTML;
        }

        // Come escapeHtml, ma sicura anche DENTRO un attributo: neutralizza
        // pure gli apici, che altrimenti chiuderebbero l'attributo e
        // lascerebbero agganciare un handler.
        function escapeAttr(str) {
            return escapeHtml(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }

        // I prodotti digitali sono file statici accanto all'app: un
        // percorso relativo. Un valore con uno schema (javascript:, data:)
        // non arriva da noi e non va messo in un href.
        function safeFileUrl(url) {
            const clean = String(url || '');
            return /^[A-Za-z0-9][A-Za-z0-9._~%!$&'()*+,;=@/-]*$/.test(clean) ? escapeAttr(clean) : '#';
        }

        // =============================================
        // CONDIVISIONE APP
        // 1) Pannello di condivisione nativo del telefono (WhatsApp, Telegram, SMS...)
        // 2) Su desktop o se non disponibile: WhatsApp
        // 3) Ultima risorsa: copia il link negli appunti
        // =============================================
        const APP_URL = 'https://renato-clementi.github.io/Cocktail-Daniel/';

        async function shareApp() {
            const text = t('shareMessage');
            const fullMessage = `${text}\n${APP_URL}`;

            // 1) Condivisione nativa
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Cocktail Daniel',
                        text: text,
                        url: APP_URL
                    });
                    return;
                } catch (error) {
                    // L'utente ha annullato: non serve alcun fallback
                    if (error && error.name === 'AbortError') return;
                }
            }

            // 2) WhatsApp (senza destinatario: l'utente sceglie il contatto)
            const encoded = encodeURIComponent(fullMessage);
            if (isMobileDevice()) {
                window.location.href = `whatsapp://send?text=${encoded}`;
                return;
            }

            // 3) Desktop: WhatsApp Web, con copia negli appunti come riserva
            try {
                window.open(`https://wa.me/?text=${encoded}`, '_blank');
            } catch (error) {
                try {
                    await navigator.clipboard.writeText(fullMessage);
                    alert(t('linkCopied'));
                } catch (e) {
                    prompt(t('copyLinkManually'), APP_URL);
                }
            }
        }

        // =============================================
        // PWA — INSTALLAZIONE E FUNZIONAMENTO OFFLINE
        // =============================================

        // Registra il service worker che tiene l'app in cache
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('service-worker.js')
                    .then(reg => {
                        // Controlla se esiste una versione nuova:
                        // all'avvio, al ritorno in primo piano e ogni 30 minuti.
                        const check = () => {
                            reg.update().catch(() => {});
                            if (navigator.serviceWorker.controller) {
                                navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
                            }
                        };
                        check();
                        document.addEventListener('visibilitychange', () => {
                            if (!document.hidden) check();
                        });
                        setInterval(check, 30 * 60 * 1000);
                    })
                    .catch(err => console.log('Service worker non registrato:', err));

                // Il service worker segnala che l'app è stata aggiornata
                navigator.serviceWorker.addEventListener('message', event => {
                    if (event.data && event.data.type === 'APP_UPDATED') {
                        showUpdateBanner();
                    }
                });
            });
        }

        // Avvisa che c'è una versione nuova, senza ricaricare a sorpresa
        // (l'utente potrebbe essere a metà di un ordine).
        function showUpdateBanner() {
            if (document.getElementById('updateBanner')) return;
            const bar = document.createElement('div');
            bar.id = 'updateBanner';
            bar.className = 'update-banner';
            bar.innerHTML = `
                <span>${t('updateAvailable')}</span>
                <button onclick="location.reload()">${t('updateNow')}</button>
            `;
            document.body.appendChild(bar);
        }

        // --- Stato della connessione ---
        function isOnline() {
            return navigator.onLine !== false;
        }

        function updateOfflineBanner() {
            const banner = document.getElementById('offlineBanner');
            if (!banner) return;
            banner.style.display = isOnline() ? 'none' : 'block';
            // Le due fasce possono coesistere: l'offset lo calcola una sola funzione
            updateLayoutOffset();
        }

        window.addEventListener('online', () => {
            updateOfflineBanner();
            syncPendingOrders();
        });
        window.addEventListener('offline', updateOfflineBanner);

        // --- Coda degli ordini creati offline ---
        // Gli ordini non sincronizzati restano qui finché la rete non torna.
        function getPendingQueue() {
            try {
                return JSON.parse(localStorage.getItem('pendingSyncOrders') || '[]');
            } catch (e) {
                return [];
            }
        }

        function setPendingQueue(queue) {
            localStorage.setItem('pendingSyncOrders', JSON.stringify(queue));
        }

        function queueOrderForSync(order) {
            const queue = getPendingQueue();
            if (!queue.some(o => o.id === order.id)) {
                queue.push(order);
                setPendingQueue(queue);
            }
        }

        function isPendingSync(orderId) {
            return getPendingQueue().some(o => o.id === orderId);
        }

        // Invia al cloud gli ordini rimasti in coda
        async function syncPendingOrders() {
            if (!cloudReady() || !isOnline()) return;

            const queue = getPendingQueue();
            if (queue.length === 0) return;

            const stillPending = [];
            for (const order of queue) {
                try {
                    await firestoreDb.collection('orders').doc(String(order.id)).set(order);
                } catch (error) {
                    stillPending.push(order); // riproveremo più tardi
                }
            }
            setPendingQueue(stillPending);

            const synced = queue.length - stillPending.length;
            if (synced > 0) {
                renderOrders();
                const successMsg = document.getElementById('successMessage');
                successMsg.textContent = t('ordersSynced').replace('{count}', synced);
                successMsg.classList.add('show');
                setTimeout(() => successMsg.classList.remove('show'), 3000);
            }
        }

        // =============================================
        // DANNY — il barista virtuale
        // Suggerisce l'azione utile in base alla situazione.
        // Regole per non essere invadente:
        //  - non ripete mai lo stesso suggerimento
        //  - se lo chiudi, tace per il resto della sessione
        //  - non parla mai con un modale aperto
        // =============================================
        let dannyDismissed = false;      // chiuso dall'utente in questa sessione
        let dannyOpen = false;
        let dannyShownTips = [];         // suggerimenti già mostrati (persistenti)
        let dannyCurrentAction = null;
        let dannySecondaryAction = null;
        let dannyIdleTimer = null;

        try {
            dannyShownTips = JSON.parse(localStorage.getItem('dannyShownTips') || '[]');
        } catch (e) { dannyShownTips = []; }

        function markTipShown(id) {
            if (!dannyShownTips.includes(id)) {
                dannyShownTips.push(id);
                localStorage.setItem('dannyShownTips', JSON.stringify(dannyShownTips));
            }
        }

        function anyModalOpen() {
            return document.querySelectorAll('.modal.active').length > 0;
        }

        // Sceglie il suggerimento più pertinente al momento.
        // Ritorna { id, text, actionLabel, action } oppure null.
        function pickDannyTip(onlyUnseen) {
            const tips = [];
            const myOrders = orders.filter(o => isAdmin() || o.userId === getUserId(customerName));
            const openOrders = myOrders.filter(o => !myPendingOrderIds.includes(o.id));
            const specialName = allProducts.map(p => p.name).find(n => isSpecial(n) && !isSoldOut(n));
            const premiumName = cocktails.map(c => c.name).find(n => isPremiumEnabled(n) && !isSoldOut(n));

            // Di cosa ha già ordinato il cliente, per categoria
            const orderedNames = myOrders.map(o => baseNameOf(o.cocktail));
            const hasFrom = list => list.some(p => orderedNames.includes(p.name));
            const hasCocktail = hasFrom(cocktails);
            const hasSnack = hasFrom(snacks);
            const hasDrink = hasFrom(softdrinks);
            const hasDessert = hasFrom(desserts);

            // Primo prodotto disponibile di una categoria
            const pick = list => list.find(p => !isSoldOut(p.name));

            // Azioni riutilizzabili
            const goCategory = cat => () => { setCategory(cat); document.querySelector('.cocktail-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

            if (!isOnline()) {
                tips.push({ id: 'offline', text: t('dannyOffline'), priority: 100 });
            }

            // A servizio chiuso il consiglio è uno solo: quando si riapre
            if (!isServiceOpen()) {
                const next = nextOpeningText();
                return {
                    id: 'service_closed',
                    priority: 110,
                    text: next ? t('dannyClosedUntil').replace('{time}', next) : t('dannyClosed')
                };
            }

            if (myOrders.length === 0) {
                tips.push({
                    id: 'welcome',

                    priority: 90,
                    text: t('dannyWelcome'),
                    actionLabel: t('dannySeeMenu'),
                    action: () => document.querySelector('.cocktail-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                });

                // Sta guardando senza decidersi: suggerisce un classico
                const suggestion = pick(currentProducts());
                if (suggestion) {
                    tips.push({
                        id: 'undecided_' + suggestion.name,

                        priority: 70,
                        text: t('dannyUndecided').replace('{name}', suggestion.name),
                        actionLabel: t('dannyOrderIt'),
                        action: () => openOrderModal(suggestion.name),
                        secondaryLabel: t('dannySeeMenu'),
                        secondaryAction: goCategory(currentCategory)
                    });
                }
            }

            // Suggerimento legato all'ora: al tramonto è ora di aperitivo
            const hour = new Date().getHours();
            if (hour >= 17 && hour <= 21) {
                const spritz = pick(cocktails.filter(c => c.name.includes('Spritz'))) || pick(cocktails);
                if (spritz) {
                    tips.push({
                        id: 'sunset_hour',

                        priority: 68,
                        text: t('dannySunset').replace('{name}', spritz.name),
                        actionLabel: t('dannyOrderIt'),
                        action: () => openOrderModal(spritz.name)
                    });
                }
            }

            if (specialName) {
                tips.push({
                    id: 'special_' + specialName,

                    priority: 72,
                    text: t('dannySpecial').replace('{name}', specialName),
                    actionLabel: t('dannyOrderIt'),
                    action: () => openOrderModal(specialName)
                });
            }

            if (premiumName && myOrders.length >= 1) {
                tips.push({
                    id: 'premium_' + premiumName,

                    priority: 60,
                    text: t('dannyPremium').replace('{name}', premiumName),
                    actionLabel: t('dannyTryIt'),
                    action: () => openOrderModal(premiumName + PREMIUM_SUFFIX)
                });
            }

            if (myOrders.length === 1) {
                const other = allProducts.find(p => p.name !== orderedNames[0] && !isSoldOut(p.name));
                if (other) {
                    tips.push({
                        id: 'second_round',

                        priority: 65,
                        text: t('dannySecondRound').replace('{name}', other.name),
                        actionLabel: t('dannyOrderIt'),
                        action: () => openOrderModal(other.name)
                    });
                }
            }

            // ABBINAMENTI: il cuore della parte "propositiva"
            // Ha bevuto ma non ha preso nulla da sgranocchiare
            if (hasCocktail && !hasSnack) {
                const snack = pick(snacks);
                if (snack) {
                    tips.push({
                        id: 'pair_snack',

                        priority: 80,
                        text: t('dannyPairSnack').replace('{drink}', orderedNames[0]).replace('{name}', snack.name),
                        actionLabel: t('dannyAddIt'),
                        action: () => openOrderModal(snack.name),
                        secondaryLabel: t('dannySeeSnacks'),
                        secondaryAction: goCategory('snacks')
                    });
                }
            }

            // Ha mangiato ma non ha niente da bere
            if (hasSnack && !hasDrink && !hasCocktail) {
                const drink = pick(softdrinks);
                if (drink) {
                    tips.push({
                        id: 'pair_drink',

                        priority: 80,
                        text: t('dannyPairDrink').replace('{name}', drink.name),
                        actionLabel: t('dannyAddIt'),
                        action: () => openOrderModal(drink.name),
                        secondaryLabel: t('dannySeeDrinks'),
                        secondaryAction: goCategory('softdrinks')
                    });
                }
            }

            // Due o più ordini e ancora nessun dolce: la torta della nonna
            if (myOrders.length >= 2 && !hasDessert) {
                const cake = pick(desserts);
                if (cake) {
                    tips.push({
                        id: 'suggest_dessert',

                        priority: 78,
                        text: t('dannyDessert').replace('{name}', cake.name),
                        actionLabel: t('dannyOrderIt'),
                        action: () => openOrderModal(cake.name),
                        secondaryLabel: t('dannySeeDesserts'),
                        secondaryAction: goCategory('desserts')
                    });
                }
            }

            // "Il solito?": riordino rapido di ciò che prende sempre
            if (myOrders.length >= 2) {
                const counts = {};
                orderedNames.forEach(n => { counts[n] = (counts[n] || 0) + 1; });
                const usual = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
                if (usual && counts[usual] >= 2 && !isSoldOut(usual)) {
                    tips.push({
                        id: 'the_usual_' + usual,

                        priority: 75,
                        text: t('dannyUsual').replace('{name}', usual),
                        actionLabel: t('dannyYesPlease'),
                        action: () => openOrderModal(usual)
                    });
                }
            }

            if (openOrders.length >= 2 && !isAdmin()) {
                tips.push({
                    id: 'close_bill',

                    priority: 85,
                    text: t('dannyCloseBill').replace('{count}', openOrders.length),
                    actionLabel: t('dannyCloseBillAction'),
                    action: () => document.getElementById('totalSpent')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                });
            }

            if (myOrders.length >= 3) {
                tips.push({
                    id: 'ask_review',

                    priority: 40,
                    text: t('dannyAskReview'),
                    actionLabel: t('dannyReviewAction'),
                    action: () => openReviewModal(),
                    secondaryLabel: t('dannyReadReviews'),
                    secondaryAction: () => openReviewsPage()
                });
            }

            if (myOrders.length >= 2) {
                tips.push({
                    id: 'share',

                    priority: 30,
                    text: t('dannyShare'),
                    actionLabel: t('dannyShareAction'),
                    action: () => shareApp()
                });
            }

            const pool = onlyUnseen ? tips.filter(x => !dannyShownTips.includes(x.id)) : tips;
            // Vince il suggerimento con la priorità più alta: così l'ordine
            // in cui sono scritti qui sopra non influenza la scelta.
            pool.sort((a, b) => (b.priority || 0) - (a.priority || 0));
            return pool.length ? pool[0] : null;
        }

        function showDannyTip(tip) {
            if (!tip) return;
            document.getElementById('dannyText').textContent = tip.text;

            const actionBtn = document.getElementById('dannyAction');
            if (tip.actionLabel && tip.action) {
                actionBtn.textContent = tip.actionLabel;
                actionBtn.style.display = 'block';
                dannyCurrentAction = tip.action;
            } else {
                actionBtn.style.display = 'none';
                dannyCurrentAction = null;
            }

            // Seconda azione: un'alternativa, per non lasciare vicoli ciechi
            const secondBtn = document.getElementById('dannySecondary');
            if (tip.secondaryLabel && tip.secondaryAction) {
                secondBtn.textContent = tip.secondaryLabel;
                secondBtn.style.display = 'block';
                dannySecondaryAction = tip.secondaryAction;
            } else {
                secondBtn.style.display = 'none';
                dannySecondaryAction = null;
            }

            document.getElementById('dannyBubble').style.display = 'block';
            const avatar = document.querySelector('.danny-avatar');
            avatar.classList.remove('calling');
            document.getElementById('dannyDot').style.display = 'none';
            dannyOpen = true;
            markTipShown(tip.id);
        }

        function hideDannyBubble() {
            document.getElementById('dannyBubble').style.display = 'none';
            dannyOpen = false;
        }

        // Tocco sull'avatar: apre o chiude il fumetto
        function toggleDanny() {
            if (dannyOpen) { hideDannyBubble(); return; }
            // Su richiesta esplicita mostra il consiglio migliore,
            // anche se già visto in passato.
            const tip = pickDannyTip(false) || { id: 'generic', text: t('dannyGeneric') };
            showDannyTip(tip);
        }

        // Chiusura esplicita: Danny tace per il resto della sessione
        function dismissDanny() {
            hideDannyBubble();
            dannyDismissed = true;
            document.querySelector('.danny-avatar').classList.remove('calling');
            document.getElementById('dannyDot').style.display = 'none';
        }

        // Intervento spontaneo: solo se non disturba
        function maybeShowDannyTip() {
            if (dannyDismissed || dannyOpen || anyModalOpen() || !customerName) return;
            const tip = pickDannyTip(true);
            if (!tip) return;

            // Prima si fa notare (rimbalzo + pallino), poi parla:
            // così l'occhio ha il tempo di seguirlo.
            const avatar = document.querySelector('.danny-avatar');
            document.getElementById('dannyDot').style.display = 'block';
            avatar.classList.add('calling');
            setTimeout(() => {
                if (!dannyDismissed && !dannyOpen && !anyModalOpen()) showDannyTip(tip);
            }, 900);
        }

        // Riparte il conto alla rovescia a ogni interazione dell'utente:
        // Danny parla solo dopo una pausa, mai mentre si sta facendo altro.
        function resetDannyIdle(delay) {
            clearTimeout(dannyIdleTimer);
            dannyIdleTimer = setTimeout(maybeShowDannyTip, delay || 8000);
        }

        function initDanny() {
            document.getElementById('danny').style.display = 'flex';
            document.getElementById('dannyAction').addEventListener('click', () => {
                const act = dannyCurrentAction;
                hideDannyBubble();
                if (act) act();
            });
            document.getElementById('dannySecondary').addEventListener('click', () => {
                const act = dannySecondaryAction;
                hideDannyBubble();
                if (act) act();
            });
            ['click', 'touchstart', 'scroll'].forEach(evt => {
                document.addEventListener(evt, () => {
                    if (!dannyOpen) resetDannyIdle();
                }, { passive: true });
            });
            resetDannyIdle(9000); // primo intervento dopo 9 secondi di quiete
        }

        // =============================================
        // PANNELLO SERVIZIO (admin)
        // =============================================
        let pendingServiceOverride; // valore scelto nel pannello, salvato col listino
        let pendingCloseReason = null; // 'study' se la chiusura è per motivi scolastici

        function setServiceOverride(value, reason) {
            pendingServiceOverride = value;
            pendingCloseReason = reason || null;
            refreshServiceButtons();
        }

        function refreshServiceButtons() {
            const map = { 'svcAuto': null, 'svcOpen': true, 'svcClosed': false };
            const lockedBySuper = getServiceConfig().lockedBy === 'superadmin' && !isSuperAdmin();

            Object.keys(map).forEach(id => {
                const el = document.getElementById(id);
                // "Chiuso" e "Studio" condividono lo stesso valore (false):
                // si distinguono solo dal motivo, non dal pulsante Chiuso normale.
                const matches = pendingServiceOverride === map[id]
                    && !(id === 'svcClosed' && pendingCloseReason === 'study');
                if (el) {
                    el.classList.toggle('active', matches);
                    el.disabled = lockedBySuper;
                }
            });
            const studyBtn = document.getElementById('svcStudy');
            if (studyBtn) {
                studyBtn.classList.toggle('active', pendingServiceOverride === false && pendingCloseReason === 'study');
                studyBtn.disabled = lockedBySuper;
            }

            // Messaggio esplicito: Daniel deve capire perché non può toccarli
            const lockNote = document.getElementById('svcLockNote');
            if (lockNote) lockNote.style.display = lockedBySuper ? 'block' : 'none';

            // Anteprima di come apparirà ai clienti
            const stateEl = document.getElementById('svcCurrentState');
            if (stateEl) {
                let open;
                if (pendingServiceOverride === true) open = true;
                else if (pendingServiceOverride === false) open = false;
                else open = isOpenBySchedule();
                stateEl.textContent = open ? t('svcStateOpen')
                    : (pendingCloseReason === 'study' ? t('svcStateStudy') : t('svcStateClosed'));
                stateEl.className = 'svc-state ' + (open ? 'svc-open' : 'svc-closed');
            }
        }

        function renderServiceHours() {
            const box = document.getElementById('serviceHours');
            if (!box) return;
            const cfg = getServiceConfig();
            const dayKeys = ['daySun','dayMon','dayTue','dayWed','dayThu','dayFri','daySat'];
            // Si parte da lunedì: più naturale della domenica
            const order = [1, 2, 3, 4, 5, 6, 0];

            box.innerHTML = order.map(d => {
                const h = (cfg.hours && cfg.hours[d]) || { open: '10:00', close: '24:00', closed: false };
                return `
                    <div class="hours-row${h.closed ? ' hours-row-off' : ''}" id="hoursRow-${d}">
                        <label class="hours-day">
                            <input type="checkbox" data-day-closed="${d}" ${h.closed ? 'checked' : ''}
                                   onchange="document.getElementById('hoursRow-${d}').classList.toggle('hours-row-off', this.checked)">
                            <span>${t(dayKeys[d])}</span>
                        </label>
                        <input type="time" data-day-open="${d}" value="${escapeAttr(h.open)}">
                        <span class="hours-sep">–</span>
                        <input type="time" data-day-close="${d}" value="${escapeAttr(h.close === '24:00' ? '23:59' : h.close)}">
                    </div>`;
            }).join('');
        }

        // =============================================
        // RIFIUTO ORDINI (admin)
        // L'ordine viene marcato come rifiutato sul cloud. Il cliente
        // riceve l'avviso col motivo alla prima sincronizzazione, poi
        // l'ordine sparisce. Nel frattempo è già escluso dal totale.
        // =============================================
        let rejectingOrderId = null;

        function openRejectModal(orderId) {
            if (!isAdmin()) return;
            rejectingOrderId = orderId;
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            document.getElementById('rejectOrderInfo').textContent =
                `${order.cocktail} · ${order.customerName || '-'} · ${order.price}`;
            document.getElementById('rejectCustomReason').value = '';
            document.getElementById('rejectModal').classList.add('active');
        }

        function closeRejectModal() {
            document.getElementById('rejectModal').classList.remove('active');
            rejectingOrderId = null;
        }

        // Rifiuta con un motivo predefinito
        function rejectWithReason(reasonKey) {
            doRejectOrder(t(reasonKey));
        }

        // Rifiuta con il motivo scritto a mano
        function rejectWithCustomReason() {
            const txt = document.getElementById('rejectCustomReason').value.trim();
            doRejectOrder(txt || t('rejectReasonOther'));
        }

        async function doRejectOrder(reason) {
            const orderId = rejectingOrderId;
            if (!orderId || !isAdmin()) return;

            const order = orders.find(o => o.id === orderId);
            closeRejectModal();
            if (!order) return;

            if (!cloudReady()) {
                alert(t('rejectNeedsCloud'));
                return;
            }

            try {
                await firestoreDb.collection('orders').doc(String(orderId)).update({
                    rejected: true,
                    rejectedReason: reason,
                    rejectedAt: Date.now()
                });

                // Sparisce subito dalla vista dell'admin
                orders = orders.filter(o => o.id !== orderId);
                saveOrders();
                renderOrders();

                const successMsg = document.getElementById('successMessage');
                successMsg.textContent = t('orderRejectedMsg').replace('{name}', order.cocktail);
                successMsg.classList.add('show');
                setTimeout(() => successMsg.classList.remove('show'), 3000);
            } catch (error) {
                console.log('Errore rifiuto ordine:', error);
                alert(t('rejectError'));
            }
        }

        // Avvisa il cliente degli ordini rifiutati, poi li elimina
        async function handleRejectedOrders(rejectedOrders) {
            if (!rejectedOrders.length) return;

            const names = rejectedOrders.map(o => `• ${o.cocktail} — ${o.rejectedReason || ''}`).join('\n');
            alert(t('orderRejectedNotice') + '\n\n' + names);

            // Una volta avvisato il cliente, l'ordine non serve più
            for (const o of rejectedOrders) {
                try {
                    await firestoreDb.collection('orders').doc(String(o.id)).delete();
                } catch (error) {
                    console.log('Errore rimozione ordine rifiutato:', error);
                }
            }
        }

        async function sendReview() {
            const reviewText = document.getElementById('reviewText').value.trim();

            if (selectedRating === 0) {
                alert(t('selectStarAlert'));
                return;
            }
            if (!reviewText) {
                alert(t('writeCommentAlert'));
                document.getElementById('reviewText').focus();
                return;
            }

            // Salva la recensione su Firebase: sarà visibile a tutti
            // nella pagina "Leggi le recensioni". Nessun invio via WhatsApp.
            await saveReviewToCloud(selectedRating, reviewText);

            closeReviewModal();

            const successMsg = document.getElementById('successMessage');
            successMsg.textContent = t('reviewSentMsg');
            successMsg.classList.add('show');
            setTimeout(() => {
                successMsg.classList.remove('show');
            }, 3000);
        }

        // Controlla periodicamente lo stato dei pagamenti
        // - Admin: nuove richieste da confermare
        // - Cliente: se l'admin ha confermato, il conto viene chiuso
        function startPaymentPolling() {
            const poll = () => {
                if (!customerName) return;
                // Con l'app in secondo piano nessuno sta guardando: il giro
                // di interrogazioni si ferma e riprende al rientro, invece
                // di continuare a pagare letture per uno schermo spento.
                if (document.hidden) return;
                if (canSupervise()) {
                    loadPendingPayments();
                    loadPendingTopups();
                } else {
                    checkMyPaymentStatus();
                    checkMyTopupStatus();
                    loadWalletFromCloud();
                }
                // Ricarica gli ordini: è così che il cliente scopre
                // se Daniel ne ha rifiutato uno.
                loadOrdersFromCloud();
                loadChoresFromCloud();
                loadPartyBookingsFromCloud().then(() => {
                    if (!isAdmin()) checkMyPartyBookingsStatus();
                });
                if (!isAdmin()) loadMyLibraryFromCloud();
                loadStudyChecklistFromCloud();
                loadDonationsFromCloud();
            };
            poll();
            setInterval(poll, 15000); // ogni 15 secondi

            // Al rientro si aggiorna subito, senza aspettare il prossimo
            // giro: è il momento in cui l'utente vuole vedere i dati freschi.
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) poll();
            });
        }

        // Ricarica periodicamente il listino: se l'admin cambia un prezzo
        // o attiva un'offerta, gli altri dispositivi se ne accorgono da soli.
        function startPricingPolling() {
            const poll = () => {
                if (!isOnline()) return;
                loadPricing();
            };
            poll();
            setInterval(poll, 60000); // ogni minuto
            // L'orario cambia anche senza modifiche al listino:
            // il banner va rivalutato comunque ogni minuto.
            setInterval(updateServiceBanner, 60000);

            // Aggiorna anche quando l'utente riapre l'app
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) poll();
            });
            window.addEventListener('online', poll);
        }

        // Initialize
        applyTranslations();
        updateOfflineBanner();   // Mostra subito lo stato della connessione
        updateServiceBanner();   // Mostra subito se il servizio è chiuso
        updateCategoryTabs();    // Evidenzia la categoria salvata
        initTabScrollHints();    // Sfumature ai bordi + invito a scorrere
        renderCocktails();
        renderOrders();
        checkRegistration(); // Mostra il popup nome oppure carica gli ordini dell'utente dal cloud
        startNewsBanner(); // Avvia il banner novità
        initDanny();       // Attiva il barista virtuale

        // Prima il token, poi il cloud. Con le regole nuove una lettura senza
        // token viene rifiutata: partire subito lascerebbe i pannelli vuoti
        // fino al giro di polling successivo, e su una connessione lenta si
        // vedrebbe. Il ruolo, poi, dipende dall'uid: showGreeting va rifatta
        // dopo l'accesso, altrimenti Daniel vedrebbe per un istante
        // l'interfaccia di un cliente.
        (async () => {
            await initAuth();
            if (customerName) showGreeting();

            startPaymentPolling();
            startPricingPolling(); // Tiene il listino allineato con quello dell'admin
            loadChoresFromCloud(); // Carica i lavoretti assegnati
            loadPartyBookingsFromCloud(); // Carica le prenotazioni feste
            loadMyLibraryFromCloud(); // Carica gli acquisti digitali (es. il libro PDF)
            loadStudyChecklistFromCloud(); // Carica/azzera la checklist studio del giorno
            loadDonationsFromCloud(); // Carica il totale donazioni (solo per chi supervisiona)
            renderLowStockPanel(); // Avvisi scorte per l'admin
            syncPendingOrders(); // Invia gli ordini rimasti in coda da sessioni offline
        })();

        // =============================================
        // CHIUSURA MODALI: tocco fuori + tasto Esc
        // Il modale di benvenuto è escluso: il nome è obbligatorio.
        // =============================================
        const MODAL_CLOSERS = {
            orderModal: closeModal,
            reviewModal: closeReviewModal,
            reviewsModal: closeReviewsPage,
            adminAuthModal: closeAdminAuth,
            priceListModal: closePriceList,
            rejectModal: closeRejectModal,
            guideModal: closeGuide,
            userGuideModal: closeUserGuide,
            choreModal: closeChoreModal,
            topupModal: closeTopupModal,
            walletChoiceModal: closeWalletChoiceModal,
            partyModal: closePartyModal,
            photoLightboxModal: closePhotoLightbox,
            donateModal: closeDonateModal,
            myAreaModal: closeMyArea
        };

        Object.keys(MODAL_CLOSERS).forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('click', function (e) {
                // Solo se il tocco è sullo sfondo, non sul contenuto
                if (e.target === this) MODAL_CLOSERS[id]();
            });
        });

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            const open = Object.keys(MODAL_CLOSERS)
                .find(id => document.getElementById(id)?.classList.contains('active'));
            if (open) MODAL_CLOSERS[open]();
        });
    
