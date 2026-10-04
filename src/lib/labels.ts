import type {
  AccountType,
  ActivityKind,
  Difficulty,
  Equipment,
  EquipmentItem,
  Muscle,
  SetKind,
  Tracking,
} from "@/schemas/common";

export const muscleLabels: Record<Muscle, string> = {
  chest: "Chest",
  lats: "Lats",
  upper_back: "Upper back",
  lower_back: "Lower back",
  traps: "Traps",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abs",
  quadriceps: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  full_body: "Full body",
  cardio: "Cardio",
};

export const equipmentLabels: Record<Equipment, string> = {
  none: "Bodyweight",
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  kettlebell: "Kettlebell",
  machine: "Machine",
  cable: "Cable",
  band: "Band",
  plate: "Plate",
  other: "Other",
};

export const equipmentItemLabels: Record<EquipmentItem, string> = {
  barbell: "Barbell",
  ez_bar: "EZ bar",
  trap_bar: "Trap bar",
  dumbbells: "Dumbbells",
  kettlebells: "Kettlebells",
  weight_plates: "Weight plates",
  flat_bench: "Flat bench",
  adjustable_bench: "Adjustable bench",
  preacher_bench: "Preacher bench",
  back_extension_bench: "Back extension bench",
  squat_rack: "Squat rack",
  pull_up_bar: "Pull-up bar",
  dip_station: "Dip station",
  leg_press: "Leg press",
  leg_extension: "Leg extension",
  leg_curl: "Leg curl",
  calf_raise_machine: "Calf raise machine",
  smith_machine: "Smith machine",
  chest_press_machine: "Chest press machine",
  pec_deck: "Pec deck",
  shoulder_press_machine: "Shoulder press machine",
  assisted_pull_up_machine: "Assisted pull-up machine",
  strength_machines: "Other strength machines",
  cable_station: "Cable station",
  lat_pulldown: "Lat pulldown",
  seated_row: "Seated row",
  treadmill: "Treadmill",
  rowing_machine: "Rowing machine",
  stationary_bike: "Stationary bike",
  cardio_machines: "Other cardio machines",
  resistance_band: "Resistance band",
  suspension_trainer: "Suspension trainer or rings",
  stability_ball: "Stability ball",
  bosu_ball: "Bosu ball",
  medicine_ball: "Medicine ball",
  foam_roller: "Foam roller",
  plyo_box: "Plyo box or step",
  ab_wheel: "Ab wheel",
  jump_rope: "Jump rope",
  battle_ropes: "Battle ropes",
  climbing_rope: "Climbing rope",
  sledgehammer_tire: "Tire and sledgehammer",
};

export const equipmentItemGroups: { label: string; items: readonly EquipmentItem[] }[] = [
  { label: "Free weights", items: ["barbell", "ez_bar", "trap_bar", "dumbbells", "kettlebells", "weight_plates"] },
  { label: "Benches and racks", items: ["flat_bench", "adjustable_bench", "preacher_bench", "back_extension_bench", "squat_rack", "pull_up_bar", "dip_station"] },
  {
    label: "Machines",
    items: ["leg_press", "leg_extension", "leg_curl", "calf_raise_machine", "smith_machine", "chest_press_machine", "pec_deck", "shoulder_press_machine", "assisted_pull_up_machine", "strength_machines"],
  },
  { label: "Cable", items: ["cable_station", "lat_pulldown", "seated_row"] },
  { label: "Cardio", items: ["treadmill", "rowing_machine", "stationary_bike", "cardio_machines"] },
  {
    label: "Accessories",
    items: ["resistance_band", "suspension_trainer", "stability_ball", "bosu_ball", "medicine_ball", "foam_roller", "plyo_box", "ab_wheel", "jump_rope", "battle_ropes", "climbing_rope", "sledgehammer_tire"],
  },
];

export const difficultyLabels: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const trackingLabels: Record<Tracking, string> = {
  weight_reps: "Weight & reps",
  reps: "Reps only",
  duration: "Duration",
  distance_duration: "Distance & time",
};

export const setKindLabels: Record<SetKind, { label: string; short: string }> = {
  warmup: { label: "Warm-up", short: "W" },
  normal: { label: "Working set", short: "" },
  drop: { label: "Drop set", short: "D" },
  failure: { label: "To failure", short: "F" },
};

export const activityLabels: Record<ActivityKind, string> = {
  run: "Run",
  ride: "Ride",
  walk: "Walk",
  hike: "Hike",
  swim: "Swim",
  row: "Row",
  other: "Other",
};

export const accountTypeLabels: Record<AccountType, string> = {
  gym_enthusiast: "Gym enthusiast",
  professional_trainer: "Professional trainer",
  nutritionist: "Nutritionist",
  psychologist: "Psychologist",
  physical_therapist: "Physical therapist",
};
