// Bump VERSION whenever you change any app file so devices pick up the update.
const VERSION = 'gymlog-v15';
const VENDOR = 'gymlog-vendor-1';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './seed.js', './guides.js', './anim.js', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './icons/maskable-512.png', './icons/apple-touch-icon.png',
  // exercise illustrations (RepDB free tier)
  './exercise-img/ab-wheel-rollout-peak.webp',
  './exercise-img/ab-wheel-rollout-start.webp',
  './exercise-img/banded-clamshell-peak.webp',
  './exercise-img/banded-clamshell-start.webp',
  './exercise-img/bent-over-db-row-peak.webp',
  './exercise-img/bent-over-db-row-start.webp',
  './exercise-img/bicep-curl-peak.webp',
  './exercise-img/bicep-curl-start.webp',
  './exercise-img/bulgarian-split-squat-peak.webp',
  './exercise-img/bulgarian-split-squat-start.webp',
  './exercise-img/cable-lateral-raise-peak.webp',
  './exercise-img/cable-lateral-raise-start.webp',
  './exercise-img/chest-press-machine-peak.webp',
  './exercise-img/chest-press-machine-start.webp',
  './exercise-img/db-goblet-squat-peak.webp',
  './exercise-img/db-goblet-squat-start.webp',
  './exercise-img/db-pullover-peak.webp',
  './exercise-img/db-pullover-start.webp',
  './exercise-img/db-skull-crusher-peak.webp',
  './exercise-img/db-skull-crusher-start.webp',
  './exercise-img/db-squat-peak.webp',
  './exercise-img/db-squat-start.webp',
  './exercise-img/dumbbell-hip-thrust-peak.webp',
  './exercise-img/dumbbell-hip-thrust-start.webp',
  './exercise-img/dumbbell-reverse-fly-peak.webp',
  './exercise-img/dumbbell-reverse-fly-start.webp',
  './exercise-img/dumbbell-romanian-deadlift-peak.webp',
  './exercise-img/dumbbell-romanian-deadlift-start.webp',
  './exercise-img/hammer-curl-peak.webp',
  './exercise-img/hammer-curl-start.webp',
  './exercise-img/hip-abduction-peak.webp',
  './exercise-img/hip-abduction-start.webp',
  './exercise-img/incline-db-press-peak.webp',
  './exercise-img/incline-db-press-start.webp',
  './exercise-img/incline-push-ups-peak.webp',
  './exercise-img/incline-push-ups-start.webp',
  './exercise-img/jumping-jacks-peak.webp',
  './exercise-img/jumping-jacks-start.webp',
  './exercise-img/lat-pulldown-peak.webp',
  './exercise-img/lat-pulldown-start.webp',
  './exercise-img/lateral-raise-peak.webp',
  './exercise-img/lateral-raise-start.webp',
  './exercise-img/leg-extension-peak.webp',
  './exercise-img/leg-extension-start.webp',
  './exercise-img/leg-press-peak.webp',
  './exercise-img/leg-press-start.webp',
  './exercise-img/machine-calf-raise-peak.webp',
  './exercise-img/machine-calf-raise-start.webp',
  './exercise-img/machine-reverse-fly-peak.webp',
  './exercise-img/machine-reverse-fly-start.webp',
  './exercise-img/machine-shoulder-press-peak.webp',
  './exercise-img/machine-shoulder-press-start.webp',
  './exercise-img/overhead-tricep-extension-peak.webp',
  './exercise-img/overhead-tricep-extension-start.webp',
  './exercise-img/pec-deck-peak.webp',
  './exercise-img/pec-deck-start.webp',
  './exercise-img/plank-main.webp',
  './exercise-img/plate-loaded-glute-drive-peak.webp',
  './exercise-img/plate-loaded-glute-drive-start.webp',
  './exercise-img/push-up-peak.webp',
  './exercise-img/push-up-start.webp',
  './exercise-img/running-main.webp',
  './exercise-img/seated-cable-row-peak.webp',
  './exercise-img/seated-cable-row-start.webp',
  './exercise-img/seated-db-press-peak.webp',
  './exercise-img/seated-db-press-start.webp',
  './exercise-img/seated-leg-curl-peak.webp',
  './exercise-img/seated-leg-curl-start.webp',
  './exercise-img/single-arm-db-row-peak.webp',
  './exercise-img/single-arm-db-row-start.webp',
  './exercise-img/single-leg-romanian-deadlift-peak.webp',
  './exercise-img/single-leg-romanian-deadlift-start.webp',
  './exercise-img/tricep-pushdown-peak.webp',
  './exercise-img/tricep-pushdown-start.webp',
  './exercise-img/walking-main.webp',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== VENDOR).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for the page itself (so updates show up), cache-first for everything else.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // the scan reader (vendor/) is big and only fetched on first use — keep it in its own cache across app updates
  if (new URL(req.url).pathname.includes('/vendor/')) {
    e.respondWith(caches.open(VENDOR).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
