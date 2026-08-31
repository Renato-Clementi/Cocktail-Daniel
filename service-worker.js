// ==================================================
// COCKTAIL DANIEL SRL - Service Worker
// Permette all'app di funzionare anche senza connessione.
// ==================================================
// VERSIONAMENTO AUTOMATICO:
// Non serve incrementare alcun numero a mano. Il service worker
// controlla il contenuto di index.html: se e' cambiato, svuota la
// cache e serve la versione nuova da solo.
// ==================================================

const CACHE_NAME = 'cocktail-daniel';
const META_CACHE = 'cocktail-daniel-meta';
const VERSION_KEY = './__app_version__';

// File che compongono il "guscio" dell'app.
const APP_SHELL = [
  './',
  './index.html',
  './background.jpg',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Impronta della versione: se index.html cambia, cambia l'impronta.
//
// Prima si prova a ricavarla dagli HEADER, con una richiesta HEAD: ETag e
// Last-Modified cambiano quando il file cambia, e non si scarica il
// contenuto. Conta perche' index.html pesa oltre mezzo megabyte e il
// controllo parte a ogni ritorno sull'app: chi passa avanti e indietro
// fra applicazioni pagava quel mezzo megabyte ogni volta, in mobilita'.
//
// Se il server non fornisce ne' l'uno ne' l'altro si ricade sull'hash del
// contenuto, come prima. Cosi' il versionamento resta AUTOMATICO in ogni
// caso: nessun numero di versione da incrementare a mano.
async function computeVersion() {
  try {
    const head = await fetch('./index.html', { method: 'HEAD', cache: 'no-store' });
    if (head.ok) {
      // ETag prima: dipende dal contenuto. Last-Modified puo' cambiare a
      // ogni pubblicazione anche se il file e' identico, e nel peggiore dei
      // casi costa un controllo aggiornamenti in piu', non un errore.
      const marca = head.headers.get('ETag') || head.headers.get('Last-Modified');
      if (marca) return 'h:' + marca;
    }
  } catch (error) {
    // Nessuna rete, o HEAD non supportato: si prova col contenuto
  }
  return 'c:' + await hashIndexHtml();
}

async function hashIndexHtml() {
  const res = await fetch('./index.html', { cache: 'no-store' });
  const text = await res.text();
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buffer))
    .slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getStoredVersion() {
  const cache = await caches.open(META_CACHE);
  const res = await cache.match(VERSION_KEY);
  return res ? await res.text() : null;
}

async function setStoredVersion(version) {
  const cache = await caches.open(META_CACHE);
  await cache.put(VERSION_KEY, new Response(version));
}

// Riscarica i file del guscio e li rimette in cache
async function refreshCache() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    APP_SHELL.map(url =>
      fetch(url, { cache: 'no-store' })
        .then(res => (res.ok ? cache.put(url, res) : null))
        .catch(() => null)
    )
  );
}

// Confronta la versione attuale con quella salvata e, se serve, aggiorna
async function checkForUpdate() {
  try {
    const current = await computeVersion();
    const stored = await getStoredVersion();
    if (current !== stored) {
      await refreshCache();
      await setStoredVersion(current);
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(c => c.postMessage({ type: 'APP_UPDATED' }));
      return true;
    }
  } catch (error) {
    // Offline: si continua con quello che c'e' in cache
  }
  return false;
}

// INSTALLAZIONE
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      await refreshCache();
      try {
        await setStoredVersion(await computeVersion());
      } catch (e) { /* offline durante l'installazione */ }
      await self.skipWaiting();
    })()
  );
});

// ATTIVAZIONE: rimuove cache di schemi precedenti
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(n => n !== CACHE_NAME && n !== META_CACHE)
          .map(n => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

// L'app puo' chiedere un controllo aggiornamenti
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    event.waitUntil(checkForUpdate());
  }
});

// RICHIESTE DI RETE
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isExternal = url.origin !== self.location.origin;

  // Servizi esterni (Firebase, font): prima la rete, cache come riserva
  if (isExternal) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (url.hostname.includes('fonts.g')) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // File dell'app: cache immediata, aggiornamento in background
  event.respondWith(
    caches.match(req).then(cached => {
      const fromNetwork = fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);

      return cached || fromNetwork;
    })
  );
});
