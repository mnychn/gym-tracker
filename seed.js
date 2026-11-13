// Training plan (v2): 2 PT days on machines, 1–2 self days, and jogging toward 3 h/week.
// Goal: +2–3 kg muscle (arms and legs are furthest below range) while staying active.
// Past workouts and body scans are NOT stored here — they live on each device (Settings → Import).
// Days aren't split by PT: when you finish a workout you tick whether your PT was there. 'cardio' days count toward jogging.
(function () {
  const x = (id, name, sets, reps, weight, rest, notes = '', timed = false) => ({ id, name, sets, reps, weight, rest, timed, notes });
  window.SEED = {
    plan: 2,
    routine: [
      {
        id: 'pt1', name: 'Shoulders, Chest & Back',
        exercises: [
          x('pt1a', 'Machine Chest Press', 3, '10', '', 90, '8–12 reps · PT sets the weight'),
          x('pt1b', 'Lat Pulldown', 3, '10', '', 90, '8–12 reps'),
          x('pt1c', 'Machine Shoulder Press', 3, '10', '', 90, '8–12 reps'),
          x('pt1d', 'Seated Cable Row', 3, '12', '', 75, '10–12 reps'),
          x('pt1e', 'Cable Lateral Raise', 3, '12', '', 45, '12–15 reps per side'),
          x('pt1f', 'Reverse Pec Deck', 3, '15', '', 60, '12–15 reps'),
        ],
      },
      {
        id: 'pt2', name: 'Lower Body',
        exercises: [
          x('pt2a', 'Leg Press', 4, '10', '', 120, '8–12 reps · PT sets the weight'),
          x('pt2b', 'Machine Hip Thrust', 4, '10', '', 90, '8–12 reps'),
          x('pt2c', 'Seated Leg Curl', 3, '12', '', 75, '10–12 reps'),
          x('pt2d', 'Leg Extension', 3, '12', '', 75, '10–12 reps'),
          x('pt2e', 'Hip Abduction Machine', 3, '15', '', 60, '15–20 reps'),
          x('pt2f', 'Machine Calf Raise', 3, '15', '', 60, '12–15 reps, pause at the bottom'),
        ],
      },
      {
        id: 's1', name: 'Arms & Upper',
        exercises: [
          x('s1a', 'Incline DB Press', 3, '10', '5', 90, '8–12 reps'),
          x('s1b', 'Single-Arm DB Row', 3, '10', '8', 60, 'Reps per side'),
          x('s1c', 'Bicep Curl', 3, '10', '4', 60, '8–12 reps'),
          x('s1d', 'Tricep Pushdown', 3, '12', '', 60, 'Cable · 10–15 reps'),
          x('s1e', 'Hammer Curl', 3, '12', '4', 60, '10–12 reps'),
          x('s1f', 'Overhead', 3, '12', '4.5', 60, 'Overhead triceps extension · 10–12 reps'),
          x('s1g', 'Plank', 3, '45', 'BW', 45, 'Forearm plank, hold for time', true),
        ],
      },
      {
        id: 's2', name: 'Glutes & Legs (or a class)',
        exercises: [
          x('s2a', 'Goblet Squat', 3, '10', '18', 90, 'Was 16 kg × 15 — go heavier for 8–12'),
          x('s2b', 'DB Romanian Deadlift', 3, '10', '12', 90, '8–12 reps'),
          x('s2c', 'Bulgarian Split Squat', 3, '10', '10', 75, 'Rear foot on bench · reps per side'),
          x('s2d', 'Hip Thrust', 3, '10', '20', 75, '8–12 reps'),
          x('s2e', 'Clam Shell', 2, '15', 'pink', 45, 'Weight = band colour'),
        ],
      },
      {
        id: 'jog', kind: 'cardio', name: 'Jog',
        exercises: [
          x('joga', 'Jog', 1, '2700', 'BW', 0, 'Easy pace — you can talk in full sentences', true),
        ],
      },
    ],
    sessions: [],
  };
})();
