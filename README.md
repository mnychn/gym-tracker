# Gym Log

A no-build progressive web app for tracking workouts: routine editing, weight/sets/reps logging, a workout clock, rest timers and progress charts. Data stays in each device's browser storage; use Settings → Export/Import to move it between devices.

Exercise how-to guides live in `guides.js`; exercise illustrations in `exercise-img/` are from the RepDB free tier; exercises without photos use the stick-figure animations in `anim.js`.

Run locally: `python3 -m http.server 8765`, then open http://127.0.0.1:8765.
After changing any file, bump `VERSION` in `sw.js` so installed copies update.

## Training plan & goals

- **Plan (v2):** 2 PT days on machines (shoulders/chest/back, lower body), 1–2 days on your own (arms & upper, glutes & legs or a class), and a Jog day with a timer. Existing devices switch to it once; the old routine can be swapped back in Settings.
- **Train tab:** weekly targets for gym sessions and jogging minutes, the last 6 weeks, and quick “Log a jog / Log a class”.
- **Progress → Body:** body-scan log (weight, skeletal muscle, fat %, lean mass, arm/leg lean mass) with a muscle-gain goal line.
- **Apple Watch:** a free Apple Shortcuts automation copies each finished watch workout; “Paste from Watch” imports it (runs → jogging target, classes → gym sessions, strength → calories/HR on that day’s session). Setup guide: Settings → Apple Watch.
- Body scans and workouts stay on each device (and in your exported backups) — never in this repo.

## Credits

Exercise data by [RepDB](https://repdb.co) — illustrations used under the [RepDB free-tier licence](https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md).
