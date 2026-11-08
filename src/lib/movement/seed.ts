import { ISOMETRIC_SECTION, type Category, type NoteEntry, type Practice, type Region, type Subcategory, type TimerPreset } from "@/lib/movement/types";

const media = { media: [] as Practice["media"], linkUrl: null, linkLabel: null, origin: "seed" as const, entries: [] as NoteEntry[] };

function withEntries<T extends object>(items: T[]): (T & { entries: NoteEntry[] })[] {
  return items.map((item) => ({ ...item, entries: [] }));
}

export function seedCategories(): Category[] {
  return withEntries([
    {
      id: "cat-internal",
      name: "Internal Training",
      blurb: "CARs, PAILs, RAILs, and end-range holds.",
      summary:
        "Articular work done against your own tissues. Attention stays inside the joint. The force is a slow circle or an isometric, in the Functional Range Systems tradition.",
      note: "CARs are controlled articular rotations. PAILs are progressive angular isometric loading — trying to move deeper into a stretch. RAILs are regressive angular isometric loading — contracting back out of that same end range.",
      origin: "seed",
    },
  ]);
}

export function seedSubcategories(): Subcategory[] {
  return withEntries([
    { id: "sub-cars", categoryId: "cat-internal", name: "CARs", summary: "Slow active circles at the outer edge of current range.", origin: "seed" },
    {
      id: ISOMETRIC_SECTION,
      categoryId: "cat-internal",
      name: "PAILs / RAILs",
      summary: "End-range isometrics. PAILs press deeper into the stretch. RAILs contract back out along the same path.",
      origin: "seed",
    },
    { id: "sub-holds", categoryId: "cat-internal", name: "End-range holds", summary: "Supported stays. Gravity or a prop supplies the force.", origin: "seed" },
  ]);
}

export function seedRegions(): Region[] {
  return withEntries([
    { id: "reg-spine", name: "Spine", summary: "Segmental flexion, extension, rotation, and side bend — neck, thorax, and lumbar as separate regions.", origin: "seed" },
    { id: "reg-scapula", name: "Scapula", summary: "Elevation, depression, protraction, retraction, and upward or downward rotation. Distinct from the ball-and-socket shoulder.", origin: "seed" },
    { id: "reg-shoulder", name: "Shoulder", summary: "Glenohumeral flexion, abduction, and rotation, with the ribcage kept quiet.", origin: "seed" },
    { id: "reg-elbow", name: "Elbow", summary: "Hinge flexion and extension, and the forearm’s rotation where it meets the wrist.", origin: "seed" },
    { id: "reg-wrist", name: "Wrist", summary: "Flexion, extension, and radial and ulnar deviation. The hand draws the circle.", origin: "seed" },
    { id: "reg-hand", name: "Hand", summary: "Fingers and palm: flexion, extension, and spreading the hand. Distinct from the wrist that aims it.", origin: "seed" },
    { id: "reg-hip", name: "Hip", summary: "Flexion, extension, rotation, and abduction in both open and closed chain.", origin: "seed" },
    { id: "reg-knee", name: "Knee", summary: "Flexion, terminal extension, and whatever rotation the joint currently allows — never past a smooth stop.", origin: "seed" },
    { id: "reg-ankle", name: "Ankle", summary: "Dorsiflexion, plantarflexion, inversion, and eversion, with the knee steady.", origin: "seed" },
    { id: "reg-foot", name: "Foot", summary: "Arches, toe extension, and the tripod of heel, big-toe mound, and little-toe mound.", origin: "seed" },
  ]);
}

function practice(
  id: string,
  categoryId: string,
  subcategoryId: string,
  name: string,
  summary: string,
  regionIds: string[],
): Practice {
  return { id, categoryId, subcategoryId, name, summary, regionIds, irradiation: null, ...media };
}

export function seedPractices(): Practice[] {
  return [
    practice(
      "prac-all-cars",
      "cat-internal",
      "sub-cars",
      "All",
      "Record this when every region’s CAR was performed in the same round.",
      ["reg-spine", "reg-scapula", "reg-shoulder", "reg-elbow", "reg-wrist", "reg-hand", "reg-hip", "reg-knee", "reg-ankle", "reg-foot"],
    ),
    practice("prac-hip-car", "cat-internal", "sub-cars", "Hip CAR", "Slow active circles at the outer edge of hip range. Tension on, momentum off. One circle is the rep.", ["reg-hip"]),
    practice("prac-shoulder-car", "cat-internal", "sub-cars", "Shoulder CAR", "Glenohumeral circles with the ribcage quiet. The scapula may rotate only as the shoulder needs.", ["reg-shoulder", "reg-scapula"]),
    practice("prac-scap-car", "cat-internal", "sub-cars", "Scapular CAR", "A slow loop of elevation, protraction, depression, and retraction. The arm stays quiet.", ["reg-scapula"]),
    practice("prac-spine-car", "cat-internal", "sub-cars", "Spinal segmentation", "Flexion, extension, and rotation moving one region at a time — neck, thorax, then lumbar.", ["reg-spine"]),
    practice("prac-ankle-car", "cat-internal", "sub-cars", "Ankle CAR", "Circles that visit dorsiflexion, plantarflexion, inversion, and eversion.", ["reg-ankle", "reg-foot"]),
    practice("prac-wrist-car", "cat-internal", "sub-cars", "Wrist CAR", "The hand draws a slow circle. Notice how much the forearm wants to help.", ["reg-wrist", "reg-elbow"]),
    practice("prac-knee-car", "cat-internal", "sub-cars", "Knee CAR", "A small tour of flexion and the knee’s available rotation. Stop where the motion stays smooth.", ["reg-knee"]),
    practice("prac-elbow-car", "cat-internal", "sub-cars", "Elbow CAR", "Flexion and extension with the shoulder quiet. Find where the hinge loses tension.", ["reg-elbow"]),
    practice("prac-hip-pail", "cat-internal", ISOMETRIC_SECTION, "Hip extension", "End-range hip extension. Press deeper into the stretch, or contract back out along the same path.", ["reg-hip"]),
    practice("prac-sh-pail", "cat-internal", ISOMETRIC_SECTION, "Shoulder flexion", "End-range flexion overhead. Reach further into the position, or pull the arm a few degrees back down.", ["reg-shoulder", "reg-scapula"]),
    practice("prac-ank-pail", "cat-internal", ISOMETRIC_SECTION, "Ankle dorsiflexion", "Knee forward over the foot, heel down. Draw the shin toward the toes, or press back out of that angle.", ["reg-ankle", "reg-foot", "reg-knee"]),
    practice("prac-squat-hold", "cat-internal", "sub-holds", "Deep squat hold", "Supported residence in the bottom of a squat. Attention maps hips, ankles, and feet. Do not bounce.", ["reg-hip", "reg-knee", "reg-ankle", "reg-foot", "reg-spine"]),
    practice("prac-couch", "cat-internal", "sub-holds", "Hip extension hold", "Rear foot up, pelvis square, a passive stay in hip extension. Breathe without leaving the position.", ["reg-hip"]),
  ];
}

export function seedPresets(): TimerPreset[] {
  return [
    { id: "pre-stop", name: "Stopwatch", mode: "stopwatch", seconds: 0, prepareSec: 0, rounds: 1, blocks: [], origin: "seed" },
    { id: "pre-hold-2", name: "2:00 hold", mode: "countdown", seconds: 120, prepareSec: 0, rounds: 1, blocks: [], origin: "seed" },
    { id: "pre-flow-5", name: "5:00 flow", mode: "countdown", seconds: 300, prepareSec: 0, rounds: 1, blocks: [], origin: "seed" },
    {
      id: "pre-tabata",
      name: "Tabata 20/10",
      mode: "intervals",
      seconds: 0,
      prepareSec: 10,
      rounds: 8,
      blocks: [
        { label: "Work", seconds: 20 },
        { label: "Rest", seconds: 10 },
      ],
      origin: "seed",
    },
    {
      id: "pre-4020",
      name: "40/20 × 10",
      mode: "intervals",
      seconds: 0,
      prepareSec: 5,
      rounds: 10,
      blocks: [
        { label: "Work", seconds: 40 },
        { label: "Rest", seconds: 20 },
      ],
      origin: "seed",
    },
  ];
}

export function seedData() {
  return {
    categories: seedCategories(),
    subcategories: seedSubcategories(),
    practices: seedPractices(),
    regions: seedRegions(),
    presets: seedPresets(),
    sessions: [],
  };
}
