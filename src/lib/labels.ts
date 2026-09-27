import type {
  AccountType,
  ActivityKind,
  Difficulty,
  Equipment,
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
