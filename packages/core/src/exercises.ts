import type { Equipment } from './types';

export type Pattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'push_horizontal'
  | 'push_vertical'
  | 'pull_horizontal'
  | 'pull_vertical'
  | 'biceps'
  | 'triceps'
  | 'calves'
  | 'core'
  | 'conditioning'
  | 'mobility';

export type Stat = 'STR' | 'END' | 'AGI' | 'VIT';

export interface Exercise {
  id: string;
  name: string;
  pattern: Pattern;
  /** Every item listed is required. Empty = bodyweight. */
  requires: Equipment[];
  /** 1 = beginner-friendly, 2 = intermediate, 3 = advanced. */
  level: 1 | 2 | 3;
  /** Counted in seconds instead of reps (planks, holds, cardio). */
  timed?: boolean;
  /** Each side counted separately. */
  unilateral?: boolean;
  /** Short form cues shown in the workout player. */
  cues: string[];
  /** Low-impact, joint-friendly: preferred when the user reported bone/joint problems. */
  jointFriendly?: boolean;
  stat: Stat;
}

/*
 * Cues are condensed from standard coaching resources (NSCA Exercise Technique Manual, ACE exercise library).
 * They are reminders, not a substitute for learning the movement; the app links each exercise to a video search.
 */
export const EXERCISES: Exercise[] = [
  // ── Squat ───────────────────────────────────────────────
  { id: 'box_squat', name: 'Chair / Box Squat', pattern: 'squat', requires: [], level: 1, jointFriendly: true, stat: 'STR',
    cues: ['Feet shoulder-width, toes slightly out', 'Sit back until you lightly touch the chair', 'Knees track over toes', 'Stand up by pushing the floor away'] },
  { id: 'bw_squat', name: 'Bodyweight Squat', pattern: 'squat', requires: [], level: 1, stat: 'STR',
    cues: ['Chest up, brace your core', 'Hips back and down to a comfortable depth', 'Keep heels flat', 'Knees follow toes'] },
  { id: 'goblet_squat', name: 'Goblet Squat', pattern: 'squat', requires: ['dumbbells'], level: 1, stat: 'STR',
    cues: ['Hold one dumbbell at your chest', 'Elbows inside knees at the bottom', 'Upright torso', 'Drive up through mid-foot'] },
  { id: 'pause_squat', name: 'Pause Squat (3-sec hold)', pattern: 'squat', requires: [], level: 2, stat: 'STR',
    cues: ['Squat down under control', 'Hold 3 seconds at the bottom', 'Stay braced, do not bounce', 'Stand up strongly'] },
  { id: 'leg_press', name: 'Leg Press', pattern: 'squat', requires: ['machines'], level: 1, jointFriendly: true, stat: 'STR',
    cues: ['Lower back stays on the pad', 'Lower until knees reach ~90°', 'Do not lock knees at the top', 'Push through whole foot'] },
  { id: 'back_squat', name: 'Barbell Back Squat', pattern: 'squat', requires: ['barbell'], level: 2, stat: 'STR',
    cues: ['Bar on upper back, grip tight', 'Big breath and brace before each rep', 'Hips and knees bend together', 'Use safety pins or a spotter'] },
  { id: 'pistol_box', name: 'Single-leg Box Squat', pattern: 'squat', requires: [], level: 3, unilateral: true, stat: 'STR',
    cues: ['Stand on one leg in front of a chair', 'Sit back slowly onto the chair', 'Stand back up without using the other leg', 'Arms forward for balance'] },

  // ── Hinge ───────────────────────────────────────────────
  { id: 'glute_bridge', name: 'Glute Bridge', pattern: 'hinge', requires: [], level: 1, jointFriendly: true, stat: 'STR',
    cues: ['Lie on back, knees bent, feet flat', 'Squeeze glutes and lift hips', 'Ribs down, no lower-back arch', 'Pause 1 second at the top'] },
  { id: 'single_leg_bridge', name: 'Single-leg Glute Bridge', pattern: 'hinge', requires: [], level: 2, unilateral: true, stat: 'STR',
    cues: ['One foot planted, other leg extended', 'Drive through the planted heel', 'Keep hips level', 'Lower slowly'] },
  { id: 'hip_hinge_bw', name: 'Good Morning (bodyweight)', pattern: 'hinge', requires: [], level: 1, stat: 'STR',
    cues: ['Hands on hips, soft knees', 'Push hips back, flat back', 'Stop when you feel hamstrings stretch', 'Squeeze glutes to stand'] },
  { id: 'db_rdl', name: 'Dumbbell Romanian Deadlift', pattern: 'hinge', requires: ['dumbbells'], level: 1, stat: 'STR',
    cues: ['Dumbbells close to thighs', 'Hips back, back flat, soft knees', 'Lower to mid-shin or until hamstrings stretch', 'Stand tall by squeezing glutes'] },
  { id: 'band_pull_through', name: 'Band Pull-through', pattern: 'hinge', requires: ['resistance_bands'], level: 1, jointFriendly: true, stat: 'STR',
    cues: ['Band anchored low behind you', 'Hinge at the hips, arms long', 'Snap hips forward to stand', 'Do not lean back at the top'] },
  { id: 'bb_rdl', name: 'Barbell Romanian Deadlift', pattern: 'hinge', requires: ['barbell'], level: 2, stat: 'STR',
    cues: ['Start standing with the bar', 'Slide bar down thighs, hips back', 'Neutral spine throughout', 'Drive hips forward to finish'] },
  { id: 'deadlift', name: 'Barbell Deadlift', pattern: 'hinge', requires: ['barbell'], level: 3, stat: 'STR',
    cues: ['Bar over mid-foot', 'Grip, pull slack out of the bar', 'Push the floor away, bar stays close', 'Lock out with glutes, not lower back'] },

  // ── Lunge ───────────────────────────────────────────────
  { id: 'reverse_lunge', name: 'Reverse Lunge', pattern: 'lunge', requires: [], level: 1, unilateral: true, stat: 'STR',
    cues: ['Step back, lower back knee toward floor', 'Front shin stays fairly vertical', 'Torso upright', 'Push through front heel to return'] },
  { id: 'step_up', name: 'Step-up', pattern: 'lunge', requires: [], level: 1, unilateral: true, jointFriendly: true, stat: 'STR',
    cues: ['Use a sturdy step or stair', 'Whole foot on the step', 'Drive through the top leg', 'Control the way down'] },
  { id: 'split_squat', name: 'Split Squat', pattern: 'lunge', requires: [], level: 1, unilateral: true, stat: 'STR',
    cues: ['Staggered stance, feet hip-width', 'Drop straight down', 'Back knee hovers just above floor', 'Keep weight on front foot'] },
  { id: 'db_lunge', name: 'Dumbbell Walking Lunge', pattern: 'lunge', requires: ['dumbbells'], level: 2, unilateral: true, stat: 'STR',
    cues: ['Dumbbells at your sides', 'Long controlled steps', 'Back knee near the floor', 'Stay tall'] },
  { id: 'bulgarian_split_squat', name: 'Bulgarian Split Squat', pattern: 'lunge', requires: ['bench'], level: 2, unilateral: true, stat: 'STR',
    cues: ['Rear foot on a bench', 'Front foot far enough forward', 'Lower until front thigh is near parallel', 'Drive up through front heel'] },

  // ── Horizontal push ─────────────────────────────────────
  { id: 'wall_pushup', name: 'Wall Push-up', pattern: 'push_horizontal', requires: [], level: 1, jointFriendly: true, stat: 'STR',
    cues: ['Hands on wall at chest height', 'Body in one straight line', 'Lower chest to the wall', 'Push back to start'] },
  { id: 'incline_pushup', name: 'Incline Push-up', pattern: 'push_horizontal', requires: [], level: 1, stat: 'STR',
    cues: ['Hands on a table, bed edge or step', 'Straight line from head to heels', 'Elbows ~45° from body', 'Chest to the edge, then press'] },
  { id: 'pushup', name: 'Push-up', pattern: 'push_horizontal', requires: [], level: 2, stat: 'STR',
    cues: ['Hands just wider than shoulders', 'Squeeze glutes, brace core', 'Chest close to the floor', 'Elbows ~45°, not flared'] },
  { id: 'decline_pushup', name: 'Decline Push-up', pattern: 'push_horizontal', requires: [], level: 3, stat: 'STR',
    cues: ['Feet on a step or bed', 'Body stays rigid', 'Lower under control', 'Full lockout at the top'] },
  { id: 'db_floor_press', name: 'Dumbbell Floor Press', pattern: 'push_horizontal', requires: ['dumbbells'], level: 1, jointFriendly: true, stat: 'STR',
    cues: ['Lie on floor, knees bent', 'Lower until upper arms touch floor', 'Pause, then press up', 'Wrists stacked over elbows'] },
  { id: 'db_bench', name: 'Dumbbell Bench Press', pattern: 'push_horizontal', requires: ['dumbbells', 'bench'], level: 1, stat: 'STR',
    cues: ['Shoulder blades pulled back and down', 'Lower to chest level', 'Press up and slightly in', 'Feet planted'] },
  { id: 'bench_press', name: 'Barbell Bench Press', pattern: 'push_horizontal', requires: ['barbell', 'bench'], level: 2, stat: 'STR',
    cues: ['Eyes under the bar, shoulder blades set', 'Lower bar to mid-chest', 'Press up and back', 'Use a spotter or safety arms'] },
  { id: 'chest_press_machine', name: 'Machine Chest Press', pattern: 'push_horizontal', requires: ['machines'], level: 1, jointFriendly: true, stat: 'STR',
    cues: ['Handles at mid-chest height', 'Back flat on the pad', 'Press without locking elbows hard', 'Slow return'] },

  // ── Vertical push ───────────────────────────────────────
  { id: 'pike_pushup', name: 'Pike Push-up', pattern: 'push_vertical', requires: [], level: 2, stat: 'STR',
    cues: ['Hips high, body in an upside-down V', 'Lower head toward the floor between hands', 'Elbows track back, not out', 'Press back up'] },
  { id: 'wall_slide', name: 'Wall Slide', pattern: 'push_vertical', requires: [], level: 1, jointFriendly: true, stat: 'AGI',
    cues: ['Back and forearms against a wall', 'Slide arms up overhead', 'Keep ribs down', 'Slide back down slowly'] },
  { id: 'band_overhead_press', name: 'Band Overhead Press', pattern: 'push_vertical', requires: ['resistance_bands'], level: 1, stat: 'STR',
    cues: ['Stand on the band', 'Handles at shoulders', 'Press straight overhead', 'Squeeze glutes so the back does not arch'] },
  { id: 'db_shoulder_press', name: 'Dumbbell Shoulder Press', pattern: 'push_vertical', requires: ['dumbbells'], level: 1, stat: 'STR',
    cues: ['Dumbbells at shoulder height', 'Brace core, glutes tight', 'Press overhead to full reach', 'Lower to chin level'] },
  { id: 'ohp', name: 'Barbell Overhead Press', pattern: 'push_vertical', requires: ['barbell'], level: 2, stat: 'STR',
    cues: ['Bar on front of shoulders', 'Move head back, press bar straight up', 'Head through at the top', 'No lower-back lean'] },

  // ── Horizontal pull ─────────────────────────────────────
  { id: 'prone_ytw', name: 'Prone Y-T-W Raise', pattern: 'pull_horizontal', requires: [], level: 1, jointFriendly: true, stat: 'STR',
    cues: ['Lie face down, forehead on a towel', 'Lift arms into a Y, then T, then W', 'Squeeze shoulder blades', 'Small, controlled range'] },
  { id: 'table_row', name: 'Inverted Row under a sturdy table', pattern: 'pull_horizontal', requires: [], level: 2, stat: 'STR',
    cues: ['Only use a heavy, stable table — test it first', 'Grip the edge, body straight', 'Pull chest to the edge', 'Lower under control'] },
  { id: 'band_row', name: 'Band Row', pattern: 'pull_horizontal', requires: ['resistance_bands'], level: 1, jointFriendly: true, stat: 'STR',
    cues: ['Band anchored at chest height', 'Pull elbows back past your ribs', 'Squeeze shoulder blades', 'Slow return'] },
  { id: 'db_row', name: 'One-arm Dumbbell Row', pattern: 'pull_horizontal', requires: ['dumbbells'], level: 1, unilateral: true, stat: 'STR',
    cues: ['Hand and knee on a bench or chair', 'Flat back', 'Pull dumbbell to your hip', 'Lower until arm is straight'] },
  { id: 'seated_cable_row', name: 'Seated Cable Row', pattern: 'pull_horizontal', requires: ['cable_machine'], level: 1, stat: 'STR',
    cues: ['Sit tall, slight knee bend', 'Pull handle to lower ribs', 'Shoulders down, not shrugged', 'Let arms straighten fully'] },
  { id: 'bb_row', name: 'Barbell Row', pattern: 'pull_horizontal', requires: ['barbell'], level: 2, stat: 'STR',
    cues: ['Hinge to ~45°, back flat', 'Pull bar to lower chest', 'Elbows drive back', 'No torso swinging'] },

  // ── Vertical pull ───────────────────────────────────────
  { id: 'band_pulldown', name: 'Band Lat Pulldown', pattern: 'pull_vertical', requires: ['resistance_bands'], level: 1, jointFriendly: true, stat: 'STR',
    cues: ['Band anchored high (door anchor)', 'Pull elbows down toward ribs', 'Chest up', 'Control the return'] },
  { id: 'dead_hang', name: 'Dead Hang', pattern: 'pull_vertical', requires: ['pullup_bar'], level: 1, timed: true, stat: 'END',
    cues: ['Grip shoulder-width', 'Hang with shoulders slightly engaged', 'Breathe steadily', 'Step down when grip fails'] },
  { id: 'negative_pullup', name: 'Negative Pull-up', pattern: 'pull_vertical', requires: ['pullup_bar'], level: 2, stat: 'STR',
    cues: ['Jump or step to chin over the bar', 'Lower yourself over 3–5 seconds', 'Full hang at the bottom', 'Reset and repeat'] },
  { id: 'pullup', name: 'Pull-up', pattern: 'pull_vertical', requires: ['pullup_bar'], level: 3, stat: 'STR',
    cues: ['Start from a full hang', 'Pull elbows down to your sides', 'Chin over the bar', 'Lower all the way'] },
  { id: 'lat_pulldown', name: 'Lat Pulldown', pattern: 'pull_vertical', requires: ['cable_machine'], level: 1, stat: 'STR',
    cues: ['Thighs locked under pads', 'Pull bar to upper chest', 'Lean back only slightly', 'Arms fully straight at the top'] },

  // ── Arms ────────────────────────────────────────────────
  { id: 'db_curl', name: 'Dumbbell Curl', pattern: 'biceps', requires: ['dumbbells'], level: 1, stat: 'STR',
    cues: ['Elbows pinned to sides', 'Curl without swinging', 'Squeeze at the top', 'Lower slowly'] },
  { id: 'band_curl', name: 'Band Curl', pattern: 'biceps', requires: ['resistance_bands'], level: 1, stat: 'STR',
    cues: ['Stand on the band', 'Elbows by your sides', 'Curl to shoulder height', 'Control down'] },
  { id: 'chinup_negative', name: 'Chin-up Negative', pattern: 'biceps', requires: ['pullup_bar'], level: 2, stat: 'STR',
    cues: ['Palms facing you', 'Start with chin over the bar', 'Lower over 3–5 seconds', 'Full hang at the bottom'] },
  { id: 'bench_dip', name: 'Bench / Chair Dip', pattern: 'triceps', requires: [], level: 2, stat: 'STR',
    cues: ['Hands on a stable chair edge', 'Bend elbows to ~90° only', 'Shoulders away from ears', 'Stop if shoulders hurt'] },
  { id: 'diamond_pushup_incline', name: 'Close-grip Incline Push-up', pattern: 'triceps', requires: [], level: 1, stat: 'STR',
    cues: ['Hands close together on a raised surface', 'Elbows stay tight to body', 'Lower chest to hands', 'Press to lockout'] },
  { id: 'db_overhead_ext', name: 'Dumbbell Overhead Triceps Extension', pattern: 'triceps', requires: ['dumbbells'], level: 1, stat: 'STR',
    cues: ['Hold one dumbbell overhead with both hands', 'Lower behind head, elbows forward', 'Extend to full lockout', 'Ribs down'] },
  { id: 'cable_pushdown', name: 'Cable Triceps Pushdown', pattern: 'triceps', requires: ['cable_machine'], level: 1, stat: 'STR',
    cues: ['Elbows pinned to sides', 'Push down to full extension', 'Slow return to ~90°', 'No shoulder rocking'] },

  // ── Calves ──────────────────────────────────────────────
  { id: 'calf_raise', name: 'Standing Calf Raise', pattern: 'calves', requires: [], level: 1, jointFriendly: true, stat: 'STR',
    cues: ['Balls of feet on a step edge', 'Lower heels for a stretch', 'Rise as high as possible', 'Pause at the top'] },

  // ── Core ────────────────────────────────────────────────
  { id: 'dead_bug', name: 'Dead Bug', pattern: 'core', requires: [], level: 1, jointFriendly: true, stat: 'VIT',
    cues: ['Lower back pressed into the floor', 'Extend opposite arm and leg slowly', 'Exhale as you extend', 'Return and switch sides'] },
  { id: 'plank', name: 'Front Plank', pattern: 'core', requires: [], level: 1, timed: true, stat: 'VIT',
    cues: ['Elbows under shoulders', 'Straight line head to heels', 'Squeeze glutes, ribs down', 'Breathe — do not hold your breath'] },
  { id: 'side_plank', name: 'Side Plank', pattern: 'core', requires: [], level: 2, timed: true, unilateral: true, stat: 'VIT',
    cues: ['Elbow under shoulder', 'Hips lifted in a straight line', 'Knees down to make it easier', 'Switch sides'] },
  { id: 'hollow_hold', name: 'Hollow Body Hold', pattern: 'core', requires: [], level: 3, timed: true, stat: 'VIT',
    cues: ['Lower back flat on the floor', 'Arms and legs extended, slightly raised', 'Bend knees to make it easier', 'Hold without arching'] },
  { id: 'hanging_knee_raise', name: 'Hanging Knee Raise', pattern: 'core', requires: ['pullup_bar'], level: 2, stat: 'VIT',
    cues: ['Hang from the bar', 'Curl knees toward chest', 'Avoid swinging', 'Lower slowly'] },

  // ── Conditioning ────────────────────────────────────────
  { id: 'brisk_walk', name: 'Brisk Walk', pattern: 'conditioning', requires: [], level: 1, timed: true, jointFriendly: true, stat: 'END',
    cues: ['Pace where you can talk but not sing', 'Swing your arms', 'Stand tall', 'Hills make it harder'] },
  { id: 'march_in_place', name: 'High-knee March', pattern: 'conditioning', requires: [], level: 1, timed: true, jointFriendly: true, stat: 'END',
    cues: ['Lift knees to hip height', 'Pump arms', 'Stay light on your feet', 'Steady breathing'] },
  { id: 'jumping_jacks', name: 'Jumping Jacks', pattern: 'conditioning', requires: [], level: 1, timed: true, stat: 'END',
    cues: ['Land softly', 'Arms overhead each rep', 'Step-jacks for low impact', 'Keep a steady rhythm'] },
  { id: 'burpee', name: 'Burpee (step-back allowed)', pattern: 'conditioning', requires: [], level: 2, timed: true, stat: 'END',
    cues: ['Hands down, step or jump back to a plank', 'Step or jump feet in', 'Stand and reach up', 'Pace yourself'] },
  { id: 'cardio_machine', name: 'Cardio Machine (bike / treadmill / rower)', pattern: 'conditioning', requires: ['cardio_machine'], level: 1, timed: true, jointFriendly: true, stat: 'END',
    cues: ['Warm up 2–3 minutes easy', 'Work at a pace you can sustain', 'Breathe steadily', 'Cool down 2 minutes'] },

  // ── Mobility (rest / recovery days) ─────────────────────
  { id: 'cat_cow', name: 'Cat–Cow', pattern: 'mobility', requires: [], level: 1, timed: true, jointFriendly: true, stat: 'AGI',
    cues: ['On hands and knees', 'Round your back, then arch gently', 'Move with your breath', 'Slow and smooth'] },
  { id: 'hip_flexor_stretch', name: 'Half-kneeling Hip Flexor Stretch', pattern: 'mobility', requires: [], level: 1, timed: true, unilateral: true, jointFriendly: true, stat: 'AGI',
    cues: ['One knee down, other foot forward', 'Tuck pelvis, squeeze glute', 'Shift forward gently', 'No pain, only stretch'] },
  { id: 'worlds_greatest', name: "World's Greatest Stretch", pattern: 'mobility', requires: [], level: 1, timed: true, unilateral: true, jointFriendly: true, stat: 'AGI',
    cues: ['Lunge forward, hand inside front foot', 'Rotate and reach to the ceiling', 'Return and switch sides', 'Breathe deeply'] },
  { id: 'thoracic_open_book', name: 'Open Book Rotation', pattern: 'mobility', requires: [], level: 1, timed: true, unilateral: true, jointFriendly: true, stat: 'AGI',
    cues: ['Lie on your side, knees bent', 'Open top arm across to the other side', 'Follow your hand with your eyes', 'Return slowly'] },
];

export function exerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export function isAvailable(ex: Exercise, owned: Equipment[]): boolean {
  return ex.requires.every((r) => owned.includes(r));
}
