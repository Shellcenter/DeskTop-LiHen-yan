import gsap from 'gsap';
import type { PetAction, PetMood, PetPose } from './types';

export class PetAnimator {
  readonly pose: PetPose = {
    floatY: 0,
    breathe: 1,
    sway: 1,
    lookX: 0,
    lookY: 0,
    tilt: 0,
    scale: 1,
    calm: 0,
    sleepy: 0,
  };

  private mood: PetMood = 'idle';
  private actionTimeline?: gsap.core.Timeline;

  setMood(mood: PetMood) {
    if (this.mood === mood) return;
    this.mood = mood;

    gsap.to(this.pose, {
      breathe: mood === 'working' ? 0.35 : mood === 'sleep' ? 0.25 : 1,
      sway: mood === 'working' ? 0.22 : mood === 'sleep' ? 0.12 : 1,
      calm: mood === 'working' ? 1 : 0,
      sleepy: mood === 'sleep' ? 1 : 0,
      duration: 0.7,
      ease: 'sine.out',
    });
  }

  lookAt(x: number, y: number) {
    gsap.to(this.pose, {
      lookX: x,
      lookY: y,
      duration: 0.35,
      ease: 'sine.out',
      overwrite: 'auto',
    });
  }

  play(action: PetAction) {
    this.actionTimeline?.kill();
    this.actionTimeline = gsap.timeline();

    if (action === 'tap') {
      this.actionTimeline
        .to(this.pose, { scale: 1.06, floatY: -10, tilt: -0.08, duration: 0.12, ease: 'sine.out' })
        .to(this.pose, { scale: 1, floatY: 0, tilt: 0, duration: 0.42, ease: 'back.out(2)' });
      return;
    }

    if (action === 'wave') {
      this.actionTimeline
        .to(this.pose, { tilt: 0.1, floatY: -5, duration: 0.18, ease: 'sine.out' })
        .to(this.pose, { tilt: -0.1, duration: 0.24, repeat: 3, yoyo: true, ease: 'sine.inOut' })
        .to(this.pose, { tilt: 0, floatY: 0, duration: 0.28, ease: 'sine.out' });
      return;
    }

    if (action === 'think') {
      this.actionTimeline
        .to(this.pose, { tilt: -0.07, lookY: 0.35, duration: 0.4, ease: 'sine.out' })
        .to(this.pose, { tilt: 0, lookY: 0, duration: 0.5, delay: 1.2, ease: 'sine.out' });
      return;
    }

    if (action === 'sleep') {
      this.actionTimeline.to(this.pose, { floatY: 8, tilt: -0.04, duration: 0.7, ease: 'sine.out' });
      return;
    }

    if (action === 'working') {
      this.actionTimeline.to(this.pose, { tilt: 0, floatY: 0, duration: 0.45, ease: 'sine.out' });
      return;
    }

    this.actionTimeline.to(this.pose, { tilt: 0, floatY: 0, scale: 1, duration: 0.45, ease: 'sine.out' });
  }
}
