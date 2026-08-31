// ==================================================
// COCKTAIL DANIEL SRL — Catalogo
// ==================================================
// Nessuna build: questo file viene caricato da index.html con un
// normale <script>. L'ordine conta — va caricato PRIMA di app.js, che usa questi dati.
// ==================================================
        // Lista cocktail predefiniti con varianti
        const cocktails = [
            { 
                name: "Mojito", 
                icon: "🍹", 
                description: "Rum, menta, lime, zucchero, soda",
                variants: ["Classico", "Dolce", "Fruttato"]
            },
            { 
                name: "Margarita", 
                icon: "🍸", 
                description: "Tequila, triple sec, succo di lime",
                variants: ["Classica", "Frozen", "Piccante"]
            },
            { 
                name: "Negroni", 
                icon: "🥃", 
                description: "Gin, Campari, vermouth rosso",
                variants: ["Classico", "Sbagliato", "Bianco"]
            },
            { 
                name: "Aperol Spritz", 
                icon: "🍊", 
                description: "Aperol, prosecco, soda",
                variants: ["Classico", "Strong", "Fruttato"]
            },
            { 
                name: "Gin Tonic", 
                icon: "🍸", 
                description: "Gin, tonica, lime",
                variants: ["Secco", "Dolce", "Profumato"]
            },
            { 
                name: "Gin Lemon", 
                icon: "🍋", 
                description: "Gin, limone, soda",
                variants: ["Classico", "Dolce", "Speziato"]
            },
            { 
                name: "Hugo Spritz", 
                icon: "🌿", 
                description: "Prosecco, sambuco, menta, soda",
                variants: ["Classico", "Dolce", "Fresco"]
            },
            { 
                name: "Piña Colada", 
                icon: "🥥", 
                description: "Rum, cocco, ananas",
                variants: ["Classica", "Frozen", "Tropicale"]
            },
            { 
                name: "Caipirinha", 
                icon: "🍋", 
                description: "Cachaça, lime, zucchero",
                variants: ["Classica", "Dolce", "Fruttata"]
            },
            { 
                name: "Sangria", 
                icon: "🍷", 
                description: "Vino rosso, frutta, spezie",
                variants: ["Classica", "Bianca", "Analcolica"]
            }
        ];

        // =============================================
        // SNACK
        // Stessa struttura dei cocktail, ma senza versione Premium.
        // =============================================
        const snacks = [
            {
                name: "Barretta di Cioccolato",
                icon: "🍫",
                description: "Croccante fuori, morbida dentro",
                variants: ["Fondente", "Al latte", "Bianco"]
            },
            {
                name: "Patatine",
                icon: "🍟",
                description: "Croccanti, servite calde",
                variants: ["Classiche", "Paprika", "Sale marino"]
            },
            {
                name: "Olive",
                icon: "🫒",
                description: "Olive marinate",
                variants: ["Verdi", "Nere", "Miste"]
            },
            {
                name: "Tagliere Formaggi",
                icon: "🧀",
                description: "Selezione di formaggi locali",
                variants: ["Piccolo", "Medio", "Grande"]
            },
            {
                name: "Bruschette",
                icon: "🥖",
                description: "Pane tostato e condimenti",
                variants: ["Pomodoro", "Olive", "Miste"]
            },
            {
                name: "Pizzette",
                icon: "🍕",
                description: "Mini pizze appena sfornate",
                variants: ["Margherita", "Wurstel", "Miste"]
            },
            {
                name: "Popcorn",
                icon: "🍿",
                description: "Popcorn appena fatti",
                variants: ["Salati", "Dolci", "Al burro"]
            },
            {
                name: "Nachos",
                icon: "🌮",
                description: "Tortilla chips e salsa",
                variants: ["Classici", "Con formaggio", "Piccanti"]
            },
            {
                name: "Frutta Fresca",
                icon: "🍉",
                description: "Frutta di stagione tagliata",
                variants: ["Anguria", "Mista tropicale", "Ananas"]
            }
        ];

        // =============================================
        // SOFT DRINK (analcolici)
        // Come gli snack: nessuna versione Premium.
        // =============================================
        const softdrinks = [
            {
                name: "Coca Cola",
                icon: "🥤",
                description: "Servita fredda",
                variants: ["Classica", "Zero", "Lattina"]
            },
            {
                name: "Aranciata",
                icon: "🍊",
                description: "Agrumi italiani",
                variants: ["Classica", "Amara", "San Pellegrino"]
            },
            {
                name: "Limonata",
                icon: "🍋",
                description: "Limoni spremuti",
                variants: ["Classica", "Frizzante"]
            },
            {
                name: "Acqua",
                icon: "💧",
                description: "Acqua di sorgente",
                variants: ["Naturale", "Frizzante", "Da 1L"]
            },
            {
                name: "Succo di Frutta",
                icon: "🧃",
                description: "Frutta al 100%",
                variants: ["Pesca", "Ananas", "ACE"]
            },
            {
                name: "Tè Freddo",
                icon: "🫖",
                description: "Infuso e servito con ghiaccio",
                variants: ["Limone", "Pesca", "Verde"]
            },
            {
                name: "Acqua alla Menta",
                icon: "🌿",
                description: "Rinfrescante, con foglie di menta",
                variants: ["Piccola", "Media", "Grande"]
            },
            {
                name: "Energy Drink",
                icon: "⚡",
                description: "Carica immediata",
                variants: ["Classico", "Sugar free"]
            }
        ];

        // =============================================
        // DOLCI
        // La torta della Nonna Giovanna apre la lista: è la specialità
        // della casa, fatta in casa.
        // =============================================
        const desserts = [
            {
                name: "Torta della Nonna Giovanna",
                icon: "🥧",
                description: "La ricetta di famiglia, fatta in casa",
                variants: ["Fetta", "Con panna", "Torta intera"]
            },
            {
                name: "Gelato",
                icon: "🍨",
                description: "Gelato artigianale",
                variants: ["1 gusto", "2 gusti", "Coppa grande"]
            },
            {
                name: "Tiramisù",
                icon: "🍰",
                description: "Mascarpone, caffè, cacao",
                variants: ["Classico", "Al pistacchio", "Alle fragole", "Classico con gocce di cioccolato", "Scatola"]
            },
            {
                name: "Panna Cotta",
                icon: "🍮",
                description: "Cremosa, con topping",
                variants: ["Frutti di bosco", "Caramello", "Cioccolato"]
            },
            {
                name: "Brownie",
                icon: "🍫",
                description: "Cioccolato fondente",
                variants: ["Classico", "Con gelato", "Con nocciole"]
            },
            {
                name: "Macedonia",
                icon: "🍉",
                description: "Frutta fresca di stagione",
                variants: ["Classica", "Con gelato", "Tropicale"]
            },
            {
                name: "Bomboloni",
                icon: "🍩",
                description: "Soffici e appena fritti",
                variants: ["Crema", "Cioccolato", "Nutella"]
            },
            {
                name: "Granita",
                icon: "🍧",
                description: "Ghiaccio tritato e sciroppo",
                variants: ["Limone", "Caffè", "Menta"]
            }
        ];

        // Catalogo completo: serve alle funzioni che devono ritrovare
        // un prodotto per nome, senza sapere a quale categoria appartiene.
        // =============================================
        // MERCHANDISING
        // Prodotti da ritirare al banco: niente posizione né orario di
        // consegna, non ha senso chiedere "dove sei" per una maglietta.
        // =============================================
        const merch = [
            { name: "Libro dei Cocktail di Daniel", icon: "📖", description: "Le 10 ricette originali, in PDF - invio immediato dopo il pagamento", variants: ["PDF"], digital: true, fileUrl: "il-libro-dei-cocktail-di-daniel.pdf" },
            { name: "Cappellino", icon: "🧢", description: "Ricamato, taglia unica", variants: ["Nero", "Corallo", "Turchese"] },
            { name: "Maglietta", icon: "👕", description: "100% cotone, stampa esclusiva", variants: ["S", "M", "L", "XL"] },
            { name: "Bicchiere Firmato", icon: "🥃", description: "Lo stesso dei nostri cocktail", variants: ["Mojito", "Margarita"] },
            { name: "Adesivi", icon: "🎨", description: "Il logo di Cocktail Daniel", variants: ["Set da 3", "Set da 6"] },
            { name: "Borsa Tote", icon: "🛍️", description: "Tela resistente, fatta con amore", variants: ["Standard"] }
        ];

        function isMerch(name) {
            const base = baseNameOf(name);
            return merch.some(m => m.name === base);
        }

        // Un prodotto digitale (es. il libro in PDF) non ha scorte fisiche
        // né bisogno di ritiro: appena il pagamento si chiude, il file va
        // consegnato subito, non "dato in mano" da Daniel.
        function getDigitalProduct(name) {
            const base = baseNameOf(name);
            return merch.find(m => m.name === base && m.digital) || null;
        }

        // =============================================
        // PACCHETTI FESTA
        // A differenza di tutto il resto del catalogo, qui non si ordina
        // per il ritiro immediato: si prenota per una data futura e
        // Daniel deve confermare la disponibilità prima che sia definitivo.
        // =============================================
        const partyPackages = [
            {
                id: 'summer', name: 'Summer Party', icon: '☀️',
                drinks: ['Mojito', 'Piña Colada', 'Caipirinha'],
                food: ['Patatine', 'Nachos'],
                dessert: ['Macedonia'],
                decor: 'Decorazioni tropicali (ombrellini, luci)'
            },
            {
                id: 'halloween', name: 'Halloween Party', icon: '🎃',
                drinks: ['Negroni', 'Sangria'],
                food: ['Popcorn', 'Tagliere Formaggi'],
                dessert: ['Brownie'],
                decor: 'Decorazioni a tema (zucche, ragnatele)'
            },
            {
                id: 'xmas', name: 'Xmas Party', icon: '🎄',
                drinks: ['Sangria', 'Hugo Spritz', 'Aperol Spritz'],
                food: ['Bruschette', 'Tagliere Formaggi'],
                dessert: ['Torta della Nonna Giovanna'],
                decor: 'Decorazioni natalizie'
            },
            {
                id: 'capodanno', name: 'Capodanno Party', icon: '🎆',
                drinks: ['Aperol Spritz', 'Negroni', 'Margarita'],
                food: ['Tagliere Formaggi', 'Bruschette'],
                dessert: ['Tiramisù'],
                decor: 'Decorazioni scintillanti, brindisi di mezzanotte'
            },
            {
                id: 'compleanno', name: 'Compleanno Party', icon: '🎂',
                drinks: ['Mojito', 'Aperol Spritz', 'Gin Tonic'],
                food: ['Patatine', 'Nachos'],
                dessert: ['Torta della Nonna Giovanna', 'Gelato'],
                decor: 'Palloncini e decorazioni personalizzabili'
            },
            {
                id: 'bbq', name: 'BBQ Festival', icon: '🍖',
                drinks: ['Birra alla spina', 'Soft drink a volontà'],
                food: ['Carne mista alla griglia', 'Salsicce', 'Crauti', 'Patate arrosto', 'Insalate fresche'],
                dessert: [],
                decor: 'Postazione barbecue, tavoli conviviali, luci da giardino'
            }
        ];

        // Prezzi predefiniti per fascia di invitati (10 / 20 / 30 persone).
        // L'admin può cambiarli dal listino.
        function buildDefaultPartyPricing() {
            // Prezzi ricalcolati per le fasce 5/10/15 (prima erano 10/20/30):
            // stesso costo a persona di prima, leggermente decrescente
            // all'aumentare degli invitati.
            const defaults = {
                summer: [45, 80, 110],
                halloween: [48, 85, 115],
                xmas: [50, 90, 120],
                capodanno: [55, 95, 130],
                compleanno: [40, 75, 100],
                bbq: [35, 70, 105] // 7€ a persona su tutte le fasce (5/10/15 invitati)
            };
            const items = {};
            partyPackages.forEach(p => {
                items[p.id] = { tiers: defaults[p.id] || [80, 150, 210], paused: false };
            });
            return items;
        }

        const PARTY_GUEST_TIERS = [5, 10, 15];

        function partyById(id) {
            return partyPackages.find(p => p.id === id);
        }

        function getPartyTierPrice(id, tierIndex) {
            const item = pricing.partyItems && pricing.partyItems[id];
            const tiers = (item && item.tiers) || [80, 150, 210];
            return tiers[tierIndex] ?? tiers[0];
        }

        function isPartyPaused(id) {
            const item = pricing.partyItems && pricing.partyItems[id];
            return !!(item && item.paused);
        }

        // =============================================
        // LAVORETTI DOMESTICI
        // Sistema separato dai prodotti da bar: qui è la famiglia
        // ad "ordinare" qualcosa a Daniel, e il compenso (mancia) lo
        // deve Daniel a chi ha assegnato il lavoretto — è un debito
        // inverso rispetto al conto dei cocktail.
        // =============================================
        const chores = [
            { id: 'aspirapolvere',  name: 'Aspirapolvere',            icon: '🧹', category: 'Casa' },
            { id: 'spolverare',     name: 'Spolverare',               icon: '🪶', category: 'Casa' },
            { id: 'pavimenti',      name: 'Lavare i pavimenti',       icon: '🧽', category: 'Casa' },
            { id: 'letto',          name: 'Rifare il letto',          icon: '🛏️', category: 'Casa' },
            { id: 'sparecchiare',   name: 'Sparecchiare',             icon: '🍽️', category: 'Cucina' },
            { id: 'lavastoviglie',  name: 'Lavastoviglie',            icon: '🍴', category: 'Cucina' },
            { id: 'spazzatura',     name: 'Buttare la spazzatura',    icon: '🗑️', category: 'Cucina' },
            { id: 'cane',          name: 'Portare a spasso il cane',  icon: '🐕', category: 'Animali' },
            { id: 'lavare_cane',   name: 'Lavare il cane',            icon: '🛁', category: 'Animali' },
            { id: 'mangiare_pet',  name: 'Dare da mangiare',          icon: '🐾', category: 'Animali' },
            { id: 'piante',        name: 'Innaffiare le piante',      icon: '🌱', category: 'Esterno' },
            { id: 'erba',          name: "Tagliare l'erba",           icon: '🌿', category: 'Esterno' },
            { id: 'cameretta',     name: 'Riordinare la cameretta',   icon: '📦', category: 'Ordine' },
            { id: 'bucato',        name: 'Piegare il bucato',         icon: '👕', category: 'Ordine' },
            { id: 'auto',          name: 'Lavare la macchina',        icon: '🚗', category: 'Altro' },
            { id: 'compiti',       name: 'Completare i compiti del giorno', icon: '🎓', category: 'Studio' },
            { id: 'ripasso',       name: 'Ripassare per una verifica', icon: '📖', category: 'Studio' },
            { id: 'lettura',       name: 'Leggere almeno 30 minuti',   icon: '📚', category: 'Studio' },
            { id: 'progetto',      name: 'Consegnare un progetto scolastico', icon: '🗂️', category: 'Studio' },
            { id: 'pulizia_bar',   name: 'Pulire bancone bar, pulire il lavandino bar, svuotare immondizia', icon: '🧽', category: 'Bar' }
        ];

        // Mance predefinite (l'admin può cambiarle dal listino)
        function buildDefaultChorePricing() {
            const defaults = {
                aspirapolvere: 2.00, spolverare: 1.50, pavimenti: 3.00, letto: 0.50,
                sparecchiare: 1.00, lavastoviglie: 1.50, spazzatura: 1.00,
                cane: 2.00, lavare_cane: 3.00, mangiare_pet: 0.50,
                piante: 1.00, erba: 4.00,
                cameretta: 2.00, bucato: 1.50,
                auto: 3.00,
                compiti: 2.00, ripasso: 3.00, lettura: 1.50, progetto: 4.00,
                pulizia_bar: 4.00
            };
            const items = {};
            chores.forEach(c => { items[c.id] = { tip: defaults[c.id] ?? 1.00, paused: false }; });
            return items;
        }

        function getChoreTip(id) {
            const item = pricing.choreItems && pricing.choreItems[id];
            return (item && typeof item.tip === 'number') ? item.tip : 1.00;
        }

        function isChorePaused(id) {
            const item = pricing.choreItems && pricing.choreItems[id];
            return !!(item && item.paused);
        }

        function choreById(id) {
            return chores.find(c => c.id === id);
        }

        // =============================================
        // MAGAZZINO INGREDIENTI (solo cocktail)
        // I cocktail sono composizioni: se finisce il rum cadono
        // Mojito, Piña Colada e Caipirinha insieme. Snack, bibite e
        // dolci invece "sono" l'ingrediente, quindi usano un contatore
        // per prodotto (vedi stock più sotto).
        // =============================================
        const ingredients = [
            { id: 'rum',        name: 'Rum',            icon: '🥃', unit: 'cl' },
            { id: 'gin',        name: 'Gin',            icon: '🍸', unit: 'cl' },
            { id: 'tequila',    name: 'Tequila',        icon: '🌵', unit: 'cl' },
            { id: 'cachaca',    name: 'Cachaça',        icon: '🇧🇷', unit: 'cl' },
            { id: 'vino_rosso', name: 'Vino rosso',     icon: '🍷', unit: 'cl' },
            { id: 'campari',    name: 'Campari',        icon: '🔴', unit: 'cl' },
            { id: 'aperol',     name: 'Aperol',         icon: '🟠', unit: 'cl' },
            { id: 'vermouth',   name: 'Vermouth rosso', icon: '🍾', unit: 'cl' },
            { id: 'prosecco',   name: 'Prosecco',       icon: '🥂', unit: 'cl' },
            { id: 'triple_sec', name: 'Triple sec',     icon: '🍊', unit: 'cl' },
            { id: 'sambuco',    name: 'Sciroppo sambuco', icon: '🌼', unit: 'cl' },
            { id: 'cocco',      name: 'Crema di cocco', icon: '🥥', unit: 'cl' },
            { id: 'tonica',     name: 'Acqua tonica',   icon: '💧', unit: 'cl' },
            { id: 'soda',       name: 'Soda',           icon: '🫧', unit: 'cl' },
            { id: 'lime',       name: 'Lime',           icon: '🟢', unit: 'pz' },
            { id: 'limone',     name: 'Limone',         icon: '🍋', unit: 'pz' },
            { id: 'ananas',     name: 'Succo ananas',   icon: '🍍', unit: 'cl' },
            { id: 'menta',      name: 'Menta',          icon: '🌿', unit: 'pz' },
            { id: 'zucchero',   name: 'Zucchero',       icon: '🧂', unit: 'g' }
        ];

        // Quanto usa ogni cocktail, in unità reali: cl per i liquidi,
        // g per lo zucchero, pz per frutta/foglie (lime, limone, menta).
        // Sono le quantità di una ricetta da bar standard, non un conteggio
        // simbolico: consumano il magazzino in proporzione al vero utilizzo.
        const recipes = {
            'Mojito':        { rum: 4,  menta: 8,  lime: 0.5, zucchero: 10, soda: 6 },
            'Margarita':     { tequila: 4, triple_sec: 2, lime: 1 },
            'Negroni':       { gin: 3, campari: 3, vermouth: 3 },
            'Aperol Spritz': { aperol: 6, prosecco: 9, soda: 3 },
            'Gin Tonic':     { gin: 4, tonica: 12, lime: 0.3 },
            'Gin Lemon':     { gin: 4, limone: 0.5, soda: 10 },
            'Hugo Spritz':   { prosecco: 9, sambuco: 2, menta: 6, soda: 3 },
            'Piña Colada':   { rum: 4, cocco: 3, ananas: 9 },
            'Caipirinha':    { cachaca: 5, lime: 1, zucchero: 8 },
            'Sangria':       { vino_rosso: 15, triple_sec: 2, limone: 0.5, zucchero: 8 }
        };

        function ingredientById(id) {
            return ingredients.find(i => i.id === id);
        }

        function formatQty(qty, unit) {
            const n = (qty % 1 === 0) ? qty : qty.toFixed(1);
            return `${n}${unit}`;
        }

        function findProduct(name) {
            return allProducts.find(p => p.name === baseNameOf(name));
        }

        // Solo i cocktail possono avere la versione Premium
        function isCocktail(name) {
            const base = baseNameOf(name);
            return cocktails.some(c => c.name === base);
        }

        // Categoria attualmente visualizzata nel catalogo
