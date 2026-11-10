# Gym Log

A no-build progressive web app for tracking workouts: routine editing, weight/sets/reps logging, a workout clock, rest timers and progress charts. Data stays in each device's browser storage; use Settings → Export/Import to move it between devices.

Exercise how-to guides live in `guides.js`; exercise photos in `photos/` come from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense); exercises without photos use the stick-figure animations in `anim.js`.

Run locally: `python3 -m http.server 8765`, then open http://127.0.0.1:8765.
After changing any file, bump `VERSION` in `sw.js` so installed copies update.
