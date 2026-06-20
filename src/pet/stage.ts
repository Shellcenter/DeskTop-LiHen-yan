import { Application, Container, Graphics } from 'pixi.js';
import type { PetAction, PetMood } from './types';
import { PetAnimator } from './animator';
import { PetEffects } from './effects';
import { loadPetModel, type LoadedPetModel } from './model';

const MODEL_URL = '/models/lihenyan/model.json';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export class PetStage {
  private app?: Application;
  private root = new Container();
  private character = new Container();
  private shadow = new Graphics();
  private effects = new PetEffects();
  private animator = new PetAnimator();
  private initialized = false;
  private lastNow = performance.now();
  private model?: LoadedPetModel;
  private currentMood: PetMood = 'idle';

  constructor(private readonly host: HTMLElement) {}

  async init() {
    if (this.initialized) return;
    const app = new Application();
    await app.init({
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      resizeTo: this.host,
    });

    app.canvas.className = 'pet-canvas';
    app.canvas.setAttribute('aria-label', '离恨烟桌宠模型舞台');
    this.host.appendChild(app.canvas);

    this.app = app;
    this.model = await loadPetModel(MODEL_URL);
    this.buildScene();
    app.ticker.add(() => this.update());
    this.initialized = true;
  }

  destroy() {
    this.app?.destroy(true, { children: true, texture: false });
    this.app = undefined;
    this.initialized = false;
  }

  setOpacity(opacity: number) {
    this.root.alpha = clamp(opacity, 0.2, 1);
  }

  setMood(mood: PetMood) {
    this.currentMood = mood;
    this.animator.setMood(mood);
  }

  play(action: PetAction) {
    this.animator.play(action);
    if (action === 'tap') this.effects.emit('petal', 16);
    if (action === 'wave') this.effects.emit('petal', 8);
    if (action === 'think') this.effects.emit('smoke', 8);
    if (action === 'working') this.effects.emit('spark', 10);
  }

  lookAt(clientX: number, clientY: number) {
    const rect = this.host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = clamp((clientX - rect.left) / rect.width * 2 - 1, -1, 1);
    const y = clamp((clientY - rect.top) / rect.height * 2 - 1, -1, 1);
    this.animator.lookAt(x, y);
  }

  resetLook() {
    this.animator.lookAt(0, 0);
  }

  private buildScene() {
    if (!this.app || !this.model) return;
    this.root = new Container();
    this.character = new Container();

    this.shadow = new Graphics()
      .ellipse(0, 0, 62, 9)
      .fill({ color: 0x193d3c, alpha: 0.16 });

    this.character.addChild(this.model.container);
    this.root.addChild(this.effects.back);
    this.root.addChild(this.shadow);
    this.root.addChild(this.character);
    this.root.addChild(this.effects.front);
    this.app.stage.addChild(this.root);
    this.layout();
  }

  private update() {
    if (!this.app || !this.model) return;
    const now = performance.now();
    const deltaSeconds = Math.min(0.05, (now - this.lastNow) / 1000);
    this.lastNow = now;

    const t = now / 1000;
    const pose = this.animator.pose;
    const working = this.currentMood === 'working';
    const sleeping = this.currentMood === 'sleep';
    const breath = Math.sin(t * (sleeping ? 1.2 : working ? 1.8 : 1.55)) * pose.breathe;
    const drift = Math.sin(t * 0.82) * pose.sway;
    const lookTilt = pose.lookX * 0.045 + pose.lookY * 0.018;

    this.layout();
    this.character.y = pose.floatY + breath * 2.6 + drift * 2.2;
    this.character.rotation = pose.tilt + lookTilt + drift * 0.008;
    this.character.scale.set(
      pose.scale * (1 + breath * 0.012),
      pose.scale * (1 - breath * 0.006),
    );
    this.character.alpha = sleeping ? 0.82 : 1;

    this.shadow.scale.set(1 + Math.abs(breath) * 0.05, 1);
    this.shadow.alpha = sleeping ? 0.1 : 0.16;
    this.effects.update(deltaSeconds, working);
  }

  private layout() {
    if (!this.app || !this.model) return;
    const width = this.app.renderer.width / this.app.renderer.resolution;
    const height = this.app.renderer.height / this.app.renderer.resolution;
    const textureWidth = this.model.spec.size.width || 1024;
    const textureHeight = this.model.spec.size.height || 1024;
    const available = Math.min(width, height);
    const target = available * 1.18;
    const scale = Math.min(target / textureWidth, target / textureHeight);

    this.root.x = width / 2;
    this.root.y = height * 0.72;
    this.model.container.scale.set(scale);
    this.shadow.y = 72;
  }
}
