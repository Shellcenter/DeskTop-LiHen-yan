export type PetMood = 'idle' | 'happy' | 'think' | 'working' | 'sleep';

export type PetAction = 'tap' | 'wave' | 'think' | 'working' | 'sleep' | 'idle';

export interface PetPose {
  floatY: number;
  breathe: number;
  sway: number;
  lookX: number;
  lookY: number;
  tilt: number;
  scale: number;
  calm: number;
  sleepy: number;
}

export interface PetInput {
  pointerX: number;
  pointerY: number;
  pointerActive: boolean;
  claudeRunning: boolean;
  lastInteractionAt: number;
}

export interface PetBrainDecision {
  mood: PetMood;
  action?: PetAction;
  message?: string;
}
