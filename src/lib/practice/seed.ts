import type { Domain, Practice } from "@/lib/practice/types";

export function seedDomains(): Domain[] {
  return [
    { id: "dom-loco", name: "Locomotion", blurb: "Carry the body across the floor." },
    { id: "dom-ground", name: "Ground", blurb: "Floor patterns and the way down and up." },
    { id: "dom-hang", name: "Hanging", blurb: "Grip, scapula, and swing." },
    { id: "dom-level", name: "Level", blurb: "Squat, hinge, and the places you can stay." },
    { id: "dom-upper", name: "Upper body", blurb: "Scapula, shoulder, wrist, and support." },
    { id: "dom-flow", name: "Flow", blurb: "Waves, circles, and the quality of the transition." },
  ];
}

function unit(id: string, domainId: string, name: string, summary: string): Practice {
  return { id, domainId, name, summary, origin: "seed" };
}

export function seedPractices(): Practice[] {
  return [
    unit("prac-beast", "dom-loco", "Beast crawl", "Hands and knees, knees hovering. Opposite hand and foot. Shoulders push the floor away."),
    unit("prac-lizard", "dom-loco", "Lizard crawl", "Stay low. The knee tracks behind the elbow. Thoracic turn, scapula, and a fine weight shift."),
    unit("prac-gait", "dom-loco", "Variable gait", "Walk, then change one thing — stride, pace, arm swing, or foot strike."),
    unit("prac-dragon", "dom-loco", "Dragon step", "A low step that threads the leg through, hips quiet, hands ready to take weight."),
    unit("prac-low", "dom-loco", "Low gait", "Travel in a deep squat. The hips stay low while the feet replace each other."),
    unit("prac-frog", "dom-loco", "Frogger", "From a deep squat, the hands reach and the feet gather. A rock, not a jump you survive."),
    unit("prac-role", "dom-ground", "Rolê", "A capoeira role: sit, turn through the shoulder, and come back to the feet."),
    unit("prac-qdr", "dom-ground", "Queda de rins", "Weight on one arm, the ribs rest toward the elbow. A support, not a fall."),
    unit("prac-squat-sit", "dom-ground", "Squat to sit", "From the squat, rotate and give weight to one hand until you are sitting, then return."),
    unit("prac-getup", "dom-ground", "Floor get-up", "From lying to standing and back down by a different path. The transition is the work."),
    unit("prac-capim", "dom-ground", "Corta capim", "A low cutting turn of the leg through the squat. The free foot draws the circle."),
    unit("prac-macaco", "dom-ground", "Macaco", "A monkey flip: one hand, the hips rise, the feet exchange places overhead."),
    unit("prac-phang", "dom-hang", "Passive hang", "Hands on a bar, feet off, shoulders toward the ears. Grip is the force."),
    unit("prac-ahang", "dom-hang", "Active scapular hang", "From a hang, depress the shoulder blades without bending the elbows."),
    unit("prac-one-arm", "dom-hang", "One-arm hang", "One hand. Passive first, then a quiet active shoulder. The free arm stays easy."),
    unit("prac-swing", "dom-hang", "Front stationary swing", "A small swing in front of the bar. Hollow and arch, shoulders stable, no travel yet."),
    unit("prac-ape", "dom-hang", "Ape swing", "A figure-eight on a short bar. An advanced swing, only after the stationary swing is quiet."),
    unit("prac-squat", "dom-level", "Squat residency", "Stay in a deep squat and shift or breathe. A level you can live in."),
    unit("prac-cossack", "dom-level", "Cossack squat", "Shift side to side in a deep lateral squat. One leg straightens, the other accepts the weight."),
    unit("prac-fold", "dom-level", "Folding squat", "Hips back with straight legs, then the knees travel forward and the heels may lift."),
    unit("prac-hinge", "dom-level", "Hinge reach", "Hinge on one leg, spine neutral, the free leg a tail. Same-side reach, then opposite."),
    unit("prac-cc", "dom-level", "CC squat", "A wide squat and a split-leg squat. Heels may lift. The pelvis stays in front of you."),
    unit("prac-scap", "dom-upper", "Scapula mobilization", "Circles, shrugs, protraction, retraction, and a straight-arm pull. The arm is quiet; the blade moves."),
    unit("prac-shoulder", "dom-upper", "Shoulder range", "Flexion, abduction, and rotation with the ribs kept still."),
    unit("prac-wrist", "dom-upper", "Wrist conditioning", "Lean into the hands, fingers forward and back, only as far as the wrist stays smooth."),
    unit("prac-crow", "dom-upper", "Crow", "Knees on the arms, feet light. A balance on the hands, not a push-up."),
    unit("prac-wave", "dom-flow", "Standing spinal wave", "Flexion and extension travel from the head through the pelvis, then reverse."),
    unit("prac-floor-wave", "dom-flow", "Floor wave", "On all fours or side-lying, send a slow wave along the spine and out one limb."),
    unit("prac-circles", "dom-flow", "Spinal circles", "A circle through the torso, separate from the wave. Change direction before it goes numb."),
    unit("prac-shift", "dom-flow", "Weight shift", "Shift so slowly that the moment balance changes is obvious."),
  ];
}
