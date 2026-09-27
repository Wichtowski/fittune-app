import type { Muscle } from "@/schemas/common";

export type MuscleRegion = {
  name: string;
  muscle: Exclude<Muscle, "full_body" | "cardio"> | null;
  d: string;
  fibres?: string;
};

// Original bilateral SVG artwork; each half is mirrored around x=80
// Unmapped muscles remain neutral rather than implying unsupported exercise targets
export const bodyOutline = "M80 59 72 59 Q71 65 64 68 L46 74 Q31 74 26 88 L22 110 Q18 123 20 139 L17 149 Q9 167 10 187 L8 199 5 208 Q4 213 7 213 L11 207 9 219 Q10 222 13 219 L16 211 15 222 Q17 225 19 222 L21 212 21 222 Q24 224 26 219 L29 207 26 193 Q33 174 35 155 L35 145 Q41 133 43 116 L47 110 Q52 133 51 151 L46 174 Q42 198 45 226 L48 253 51 277 Q50 288 51 298 Q47 317 51 339 L53 362 51 371 45 378 Q41 384 47 385 L64 385 Q69 383 66 376 L64 366 68 335 Q72 316 66 298 L67 280 Q73 263 74 245 L77 218 80 208Z";

export const anatomy: Record<"front" | "back", readonly MuscleRegion[]> = {
  front: [
    { name: "Upper trapezius", muscle: "traps", d: "M71 61 68 69 50 75 66 76 78 69Z" },
    { name: "Sternocleidomastoid", muscle: null, d: "M74 56 79 69 78 76 70 65Z" },
    { name: "Anterior deltoid", muscle: "shoulders", d: "M44 76 Q32 76 28 88 L26 102 Q32 100 38 94 L48 80Z", fibres: "M42 79 Q32 87 29 97 M45 80 33 97" },
    { name: "Lateral deltoid", muscle: "shoulders", d: "M28 89 Q24 99 24 112 L30 108 38 97 26 104Z" },
    { name: "Pectoralis major, clavicular portion", muscle: "chest", d: "M48 79 Q62 74 78 80 L78 89 Q59 90 42 86Z", fibres: "M49 81 75 84 M47 84 75 87" },
    { name: "Pectoralis major, sternocostal portion", muscle: "chest", d: "M42 88 Q59 93 78 91 L78 108 Q66 116 53 111 L46 103 39 95Z", fibres: "M43 91 Q57 103 75 96 M45 95 Q60 109 75 102 M49 101 Q61 114 74 107" },
    { name: "Biceps brachii, long head", muscle: "biceps", d: "M33 107 40 100 Q43 118 36 132 L30 140 Q26 123 33 107Z", fibres: "M37 106 Q39 121 31 135" },
    { name: "Biceps brachii, short head", muscle: "biceps", d: "M41 104 44 113 Q45 127 37 138 L32 141 Q40 123 41 104Z" },
    { name: "Brachialis", muscle: null, d: "M25 113 29 110 Q25 129 29 140 L24 144 Q21 131 25 113Z" },
    { name: "Serratus anterior", muscle: null, d: "M48 108 54 114 51 119 47 114Z M49 118 56 123 52 129 48 124Z M50 128 56 133 52 138 49 133Z" },
    { name: "Rectus abdominis, upper", muscle: "abs", d: "M65 116 Q71 114 78 114 L78 125 65 125Z" },
    { name: "Rectus abdominis, middle", muscle: "abs", d: "M65 128 78 128 78 139 64 138Z" },
    { name: "Rectus abdominis, lower", muscle: "abs", d: "M64 141 78 142 78 154 64 152Z" },
    { name: "Rectus abdominis, pelvic portion", muscle: "abs", d: "M65 156 78 158 78 181 Q70 177 65 165Z" },
    { name: "External oblique", muscle: "abs", d: "M56 116 62 118 61 148 64 170 74 184 Q59 178 51 166 L54 148 53 135Z", fibres: "M55 137 61 142 M54 145 61 151 M54 153 63 160 M53 161 65 171" },
    { name: "Brachioradialis", muscle: "forearms", d: "M23 146 28 144 Q29 162 18 183 L13 191 Q12 168 23 146Z", fibres: "M24 151 Q20 174 15 182" },
    { name: "Forearm flexors", muscle: "forearms", d: "M30 145 34 150 Q35 166 25 191 L18 195 20 180Z", fibres: "M30 151 22 185 M32 157 25 183 M28 153 18 188" },
    { name: "Tensor fasciae latae", muscle: null, d: "M48 177 53 178 53 205 46 216 Q44 195 48 177Z" },
    { name: "Sartorius", muscle: null, d: "M55 180 Q67 207 73 232 L67 269 64 273 69 233 Q63 207 52 187Z" },
    { name: "Adductor longus", muscle: null, d: "M61 183 78 192 77 213 73 230 Q69 203 61 183Z", fibres: "M67 190 74 216 M70 193 75 208" },
    { name: "Gracilis", muscle: null, d: "M78 216 76 244 70 270 69 258 73 235Z" },
    { name: "Rectus femoris", muscle: "quadriceps", d: "M55 198 Q65 211 66 233 L62 262 58 276 Q52 264 52 243Z", fibres: "M57 211 57 264 M60 216 60 258" },
    { name: "Vastus lateralis", muscle: "quadriceps", d: "M49 212 52 205 49 244 55 271 Q48 266 48 251 L45 231Z", fibres: "M48 226 49 250 M48 254 52 265" },
    { name: "Vastus medialis", muscle: "quadriceps", d: "M68 242 68 266 Q68 281 62 280 L60 276Z", fibres: "M66 257 63 273" },
    { name: "Tibialis anterior", muscle: null, d: "M55 296 59 300 59 328 56 357 53 354 51 322Z", fibres: "M55 305 55 345" },
    { name: "Fibularis longus", muscle: null, d: "M51 294 53 298 49 322 51 341 Q45 322 49 308Z" },
    { name: "Soleus", muscle: "calves", d: "M63 299 Q71 316 66 333 L61 351 61 324Z", fibres: "M64 309 64 334" },
  ],
  back: [
    { name: "Upper trapezius", muscle: "traps", d: "M74 58 78 61 78 84 65 79 47 77 Q63 70 68 68Z", fibres: "M73 65 71 75 M72 70 61 74" },
    { name: "Middle trapezius", muscle: "traps", d: "M65 82 78 88 78 111 Q69 101 61 92 L47 82Z", fibres: "M64 86 76 94 M65 91 76 100" },
    { name: "Lower trapezius", muscle: "traps", d: "M64 103 78 117 78 143 Q67 126 64 103Z" },
    { name: "Posterior deltoid", muscle: "shoulders", d: "M44 78 Q31 77 27 90 L25 103 Q37 99 47 86Z", fibres: "M41 81 Q32 88 29 98 M43 84 34 94" },
    { name: "Lateral deltoid", muscle: "shoulders", d: "M25 106 37 101 33 111 24 115Z" },
    { name: "Infraspinatus", muscle: "upper_back", d: "M48 86 59 95 64 108 Q54 110 42 98Z", fibres: "M47 91 58 101 M46 96 58 105" },
    { name: "Teres major", muscle: "upper_back", d: "M44 102 62 113 60 120 45 111Z" },
    { name: "Triceps brachii, long head", muscle: "triceps", d: "M36 105 42 104 Q44 122 36 140 L31 143 31 124Z", fibres: "M38 111 Q39 125 34 137" },
    { name: "Triceps brachii, lateral head", muscle: "triceps", d: "M25 117 31 110 28 130 29 142 24 137 Q21 127 25 117Z" },
    { name: "Triceps brachii, medial head", muscle: "triceps", d: "M36 141 42 129 38 146 31 149Z" },
    { name: "Latissimus dorsi", muscle: "lats", d: "M46 115 61 122 67 139 73 155 68 171 Q54 156 53 141Z", fibres: "M49 123 65 152 M53 127 68 157 M56 130 68 152 M55 144 64 160" },
    { name: "Erector spinae", muscle: "lower_back", d: "M74 136 78 146 78 181 71 174 70 159Z", fibres: "M75 148 75 173" },
    { name: "External oblique", muscle: "abs", d: "M52 151 60 162 65 173 52 169 49 177Z" },
    { name: "Forearm extensors", muscle: "forearms", d: "M23 148 30 151 24 176 17 194 12 189 Q12 164 23 148Z", fibres: "M23 154 15 184 M25 158 18 183 M27 157 22 177" },
    { name: "Brachioradialis", muscle: "forearms", d: "M32 151 35 153 Q34 171 26 191 L21 195Z" },
    { name: "Gluteus medius", muscle: "glutes", d: "M50 174 Q64 174 73 183 L58 187 46 194Z", fibres: "M52 178 61 181 M50 184 59 184" },
    { name: "Gluteus maximus", muscle: "glutes", d: "M58 189 Q71 181 78 187 L78 207 Q68 224 47 212 L46 199Z", fibres: "M51 198 Q61 202 74 191 M50 204 Q65 210 75 198 M54 211 Q65 215 73 206" },
    { name: "Adductor magnus", muscle: null, d: "M75 216 77 212 74 242 70 257 70 233Z" },
    { name: "Biceps femoris", muscle: "hamstrings", d: "M48 217 59 220 56 244 54 263 51 277 Q50 263 48 249Z", fibres: "M51 222 51 254 M54 223 53 250" },
    { name: "Semitendinosus", muscle: "hamstrings", d: "M62 220 68 219 65 249 60 273 58 278 58 258Z", fibres: "M64 224 61 251" },
    { name: "Semimembranosus", muscle: "hamstrings", d: "M70 220 73 218 71 249 66 272 63 278 63 265 68 244Z" },
    { name: "Gastrocnemius, lateral head", muscle: "calves", d: "M54 295 58 297 57 317 Q56 330 50 329 L49 314Z", fibres: "M54 302 52 322" },
    { name: "Gastrocnemius, medial head", muscle: "calves", d: "M61 295 Q68 301 68 314 L66 329 Q62 339 59 327 L59 310Z", fibres: "M63 302 64 328 M61 310 61 323" },
    { name: "Soleus", muscle: "calves", d: "M50 333 56 337 57 351 55 360Z M64 338 66 333 62 359 60 359 61 347Z" },
  ],
};
