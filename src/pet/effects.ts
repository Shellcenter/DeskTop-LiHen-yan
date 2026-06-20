import { Container, Graphics } from 'pixi.js';

type EffectKind = 'smoke' | 'petal' | 'ripple' | 'spark';

interface EffectParticle {
  kind: EffectKind;
  node: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  spin: number;
  spinSpeed: number;
}

const TAU = Math.PI * 2;

function random(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export class PetEffects {
  readonly back = new Container();
  readonly front = new Container();
  private particles: EffectParticle[] = [];

  emit(kind: EffectKind, count = 1) {
    for (let i = 0; i < count; i += 1) {
      if (this.particles.length > 90) return;
      this.particles.push(this.createParticle(kind));
    }
  }

  update(deltaSeconds: number, working: boolean) {
    if (Math.random() < deltaSeconds * (working ? 4 : 1.1)) this.emit(working ? 'spark' : 'smoke');
    if (!working && Math.random() < deltaSeconds * 0.8) this.emit('petal');
    if (Math.random() < deltaSeconds * 0.3) this.emit('ripple');

    for (const particle of this.particles) {
      particle.age += deltaSeconds;
      particle.x += particle.vx * deltaSeconds;
      particle.y += particle.vy * deltaSeconds;
      particle.spin += particle.spinSpeed * deltaSeconds;
      const progress = Math.min(1, particle.age / particle.life);
      particle.node.alpha = 1 - progress;
      particle.node.x = particle.x;
      particle.node.y = particle.y;
      particle.node.rotation = particle.spin;

      if (particle.kind === 'ripple') {
        particle.node.scale.set(0.8 + progress * 1.8, 0.8 + progress * 1.8);
      }
    }

    const alive: EffectParticle[] = [];
    for (const particle of this.particles) {
      if (particle.age < particle.life) {
        alive.push(particle);
        continue;
      }
      particle.node.parent?.removeChild(particle.node);
      particle.node.destroy();
    }
    this.particles = alive;
  }

  private createParticle(kind: EffectKind): EffectParticle {
    const node = new Graphics();
    const size = random(3, 8);
    const particle: EffectParticle = {
      kind,
      node,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
      life: random(1.2, 2.8),
      size,
      spin: random(0, TAU),
      spinSpeed: random(-1.2, 1.2),
    };

    if (kind === 'petal') {
      particle.x = random(-110, 90);
      particle.y = random(-175, -105);
      particle.vx = random(16, 36);
      particle.vy = random(15, 32);
      node.ellipse(0, 0, size * 1.5, size * 0.7).fill({ color: 0xe896ab, alpha: 0.9 });
      this.front.addChild(node);
    } else if (kind === 'spark') {
      particle.x = random(-42, 42);
      particle.y = random(-110, -48);
      particle.vx = random(-8, 8);
      particle.vy = random(-35, -18);
      particle.life = random(0.8, 1.4);
      node.circle(0, 0, random(1.5, 3.2)).fill({ color: 0x74ded2, alpha: 0.95 });
      this.front.addChild(node);
    } else if (kind === 'ripple') {
      particle.x = random(-35, 35);
      particle.y = random(-2, 8);
      particle.life = random(0.9, 1.4);
      node.ellipse(0, 0, random(24, 42), random(4, 9)).stroke({
        color: 0x8acfc9,
        alpha: 0.45,
        width: 1.2,
      });
      this.back.addChild(node);
    } else {
      particle.x = random(-85, 75);
      particle.y = random(-85, -18);
      particle.vx = random(-6, 8);
      particle.vy = random(-28, -12);
      node.moveTo(-size * 1.8, 0)
        .bezierCurveTo(-size, -size * 1.6, size, size * 0.9, size * 2.1, -size * 0.5)
        .stroke({ color: 0xcfd8d5, alpha: 0.5, width: random(1.4, 2.6) });
      this.back.addChild(node);
    }

    node.x = particle.x;
    node.y = particle.y;
    node.rotation = particle.spin;
    return particle;
  }
}
