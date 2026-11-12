# Gym Log

A no-build progressive web app for tracking workouts: routine editing, weight/sets/reps logging, a workout clock, rest timers and progress charts. Data stays in each device's browser storage; use Settings → Export/Import to move it between devices.

Exercise how-to guides live in `guides.js`; exercise illustrations in `exercise-img/` are from the RepDB free tier; exercises without photos use the stick-figure animations in `anim.js`.

Run locally: `python3 -m http.server 8765`, then open http://127.0.0.1:8765.
After changing any file, bump `VERSION` in `sw.js` so installed copies update.

## Credits

Exercise data by [RepDB](https://repdb.co) — illustrations used under the [RepDB free-tier licence](https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md).
