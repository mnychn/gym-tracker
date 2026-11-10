// Bump VERSION whenever you change any app file so devices pick up the update.
const VERSION = 'gymlog-v6';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './seed.js', './guides.js', './anim.js', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './icons/maskable-512.png', './icons/apple-touch-icon.png',
  // exercise photos (free-exercise-db)
  './photos/Ab_Roller/0.jpg',
  './photos/Ab_Roller/1.jpg',
  './photos/Barbell_Hip_Thrust/0.jpg',
  './photos/Barbell_Hip_Thrust/1.jpg',
  './photos/Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench/0.jpg',
  './photos/Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench/1.jpg',
  './photos/Bent_Over_Two-Dumbbell_Row/0.jpg',
  './photos/Bent_Over_Two-Dumbbell_Row/1.jpg',
  './photos/Butterfly/0.jpg',
  './photos/Butterfly/1.jpg',
  './photos/Dumbbell_Bicep_Curl/0.jpg',
  './photos/Dumbbell_Bicep_Curl/1.jpg',
  './photos/Dumbbell_Shoulder_Press/0.jpg',
  './photos/Dumbbell_Shoulder_Press/1.jpg',
  './photos/Dumbbell_Squat/0.jpg',
  './photos/Dumbbell_Squat/1.jpg',
  './photos/Goblet_Squat/0.jpg',
  './photos/Goblet_Squat/1.jpg',
  './photos/Incline_Push-Up/0.jpg',
  './photos/Incline_Push-Up/1.jpg',
  './photos/Kettlebell_One-Legged_Deadlift/0.jpg',
  './photos/Kettlebell_One-Legged_Deadlift/1.jpg',
  './photos/Lying_Dumbbell_Tricep_Extension/0.jpg',
  './photos/Lying_Dumbbell_Tricep_Extension/1.jpg',
  './photos/One-Arm_Dumbbell_Row/0.jpg',
  './photos/One-Arm_Dumbbell_Row/1.jpg',
  './photos/One-Arm_Side_Laterals/0.jpg',
  './photos/One-Arm_Side_Laterals/1.jpg',
  './photos/Plank/1.jpg',
  './photos/Pushups/0.jpg',
  './photos/Pushups/1.jpg',
  './photos/Seated_Cable_Rows/0.jpg',
  './photos/Seated_Cable_Rows/1.jpg',
  './photos/Split_Squat_with_Dumbbells/0.jpg',
  './photos/Split_Squat_with_Dumbbells/1.jpg',
  './photos/Standing_Dumbbell_Triceps_Extension/0.jpg',
  './photos/Standing_Dumbbell_Triceps_Extension/1.jpg',
  './photos/Stiff-Legged_Dumbbell_Deadlift/0.jpg',
  './photos/Stiff-Legged_Dumbbell_Deadlift/1.jpg',
  './photos/Straight-Arm_Dumbbell_Pullover/0.jpg',
  './photos/Straight-Arm_Dumbbell_Pullover/1.jpg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
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
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
