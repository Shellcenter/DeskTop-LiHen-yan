import type { PetBrainDecision, PetMood } from './types';

export class PetBrain {
  private mood: PetMood = 'idle';
  private nextIdleActionAt = performance.now() + 5000;
  private lastInteractionAt = performance.now();
  private claudeRunning = false;

  setClaudeRunning(running: boolean): PetBrainDecision | null {
    if (this.claudeRunning === running) return null;
    this.claudeRunning = running;
    this.mood = running ? 'working' : 'idle';
    return {
      mood: this.mood,
      action: running ? 'working' : 'idle',
      message: running ? 'Claude Code 正在工作中~' : undefined,
    };
  }

  interact(action: 'tap' | 'wave' | 'think' = 'tap'): PetBrainDecision {
    this.lastInteractionAt = performance.now();
    this.nextIdleActionAt = this.lastInteractionAt + 5000 + Math.random() * 4000;
    this.mood = action === 'think' ? 'think' : 'happy';
    return {
      mood: this.mood,
      action,
    };
  }

  tick(now = performance.now()): PetBrainDecision | null {
    if (this.claudeRunning) {
      this.mood = 'working';
      return null;
    }

    const idleMs = now - this.lastInteractionAt;
    if (idleMs > 1000 * 60 * 6 && this.mood !== 'sleep') {
      this.mood = 'sleep';
      this.nextIdleActionAt = now + 20000;
      return {
        mood: 'sleep',
        action: 'sleep',
        message: '有点困了...',
      };
    }

    if (now < this.nextIdleActionAt) return null;

    const actions: Array<'wave' | 'think' | 'idle'> = ['wave', 'think', 'idle'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    this.mood = action === 'think' ? 'think' : 'idle';
    this.nextIdleActionAt = now + 7000 + Math.random() * 9000;

    return {
      mood: this.mood,
      action,
    };
  }
}
