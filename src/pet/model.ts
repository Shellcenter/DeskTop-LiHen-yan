import { Assets, Container, Sprite, Texture } from 'pixi.js';

export type ModelPartMotion =
  | 'body'
  | 'head'
  | 'hair'
  | 'ribbon'
  | 'umbrella'
  | 'eye'
  | 'arm'
  | 'static';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Size2 {
  width: number;
  height: number;
}

export interface PetModelPartSpec {
  id: string;
  image: string;
  anchor: Vec2;
  position: Vec2;
  scale?: number;
  rotation?: number;
  zIndex?: number;
  motion?: ModelPartMotion;
}

export interface PetModelSpec {
  name: string;
  version: number;
  size: Size2;
  parts: PetModelPartSpec[];
}

export interface LoadedModelPart {
  spec: PetModelPartSpec;
  texture: Texture;
  sprite: Sprite;
}

export interface LoadedPetModel {
  spec: PetModelSpec;
  baseUrl: string;
  container: Container;
  parts: LoadedModelPart[];
}

export async function loadPetModel(modelUrl: string): Promise<LoadedPetModel> {
  const spec = await loadModelSpec(modelUrl);
  const baseUrl = modelUrl.slice(0, modelUrl.lastIndexOf('/') + 1);
  const container = new Container();
  const parts: LoadedModelPart[] = [];

  const sortedParts = [...spec.parts].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  for (const partSpec of sortedParts) {
    const texture = await Assets.load<Texture>(`${baseUrl}${partSpec.image}`);
    const sprite = new Sprite(texture);
    sprite.label = partSpec.id;
    sprite.anchor.set(partSpec.anchor.x, partSpec.anchor.y);
    sprite.position.set(partSpec.position.x, partSpec.position.y);
    sprite.scale.set(partSpec.scale ?? 1);
    sprite.rotation = partSpec.rotation ?? 0;
    container.addChild(sprite);
    parts.push({ spec: partSpec, texture, sprite });
  }

  return {
    spec,
    baseUrl,
    container,
    parts,
  };
}

async function loadModelSpec(modelUrl: string): Promise<PetModelSpec> {
  const response = await fetch(modelUrl);
  if (!response.ok) {
    throw new Error(`无法加载模型文件：${modelUrl}`);
  }
  const raw = (await response.json()) as PetModelSpec;
  validateModelSpec(raw, modelUrl);
  return raw;
}

function validateModelSpec(spec: PetModelSpec, modelUrl: string) {
  if (!spec || typeof spec !== 'object') {
    throw new Error(`模型文件格式错误：${modelUrl}`);
  }
  if (!Array.isArray(spec.parts) || spec.parts.length === 0) {
    throw new Error(`模型至少需要一个 part：${modelUrl}`);
  }
  for (const part of spec.parts) {
    if (!part.id || !part.image) {
      throw new Error(`模型部件缺少 id 或 image：${modelUrl}`);
    }
    if (!part.anchor || !part.position) {
      throw new Error(`模型部件 ${part.id} 缺少 anchor 或 position`);
    }
  }
}
