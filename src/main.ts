// ─── 离恨烟 Q版 Claude Code 桌宠 - 主逻辑 ───

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { PetState, PetConfig } from './state';
import {
  ALL_STATES,
  DEFAULT_CONFIG,
  STATE_MESSAGES,
  STATE_LABELS,
  StateManager,
  InteractionLog,
} from './state';

const BASE_PET_WIDTH = 240;
const WINDOW_PADDING = 16;
const PET_STAGE_TOP = 36;
const DRAG_THRESHOLD_PX = 8;
const appWindow = getCurrentWindow();

const petWrap = document.getElementById('pet-wrap')!;
const petImage = document.getElementById('pet-image') as HTMLImageElement;
const bubble = document.getElementById('bubble')!;
const bubbleText = document.getElementById('bubble-text')!;
const menu = document.getElementById('menu')!;
const menuBackdrop = document.getElementById('menu-backdrop')!;
const appRoot = document.getElementById('app-root')!;

const stateManager = new StateManager();
const interactionLog = new InteractionLog();
let config: PetConfig = { ...DEFAULT_CONFIG };
let characterAssets = new Map<PetState, string>();
let cycleIndex = 0;
let menuBusy = false;
let layoutReady = false;
let menuSlotHeight = 260;
let dragPointerId: number | null = null;
let dragStart: { x: number; y: number } | null = null;
let dragStarted = false;

async function boot() {
  try {
    const savedConfig = await invoke<PetConfig>('get_config');
    config = { ...DEFAULT_CONFIG, ...savedConfig };
  } catch {
    config = { ...DEFAULT_CONFIG };
  }

  characterAssets = await probeCharacterAssets();
  bindInteractions();

  try {
    await appWindow.setBackgroundColor({ red: 0, green: 0, blue: 0, alpha: 0 });
  } catch {
    /* ignore */
  }

  listen<boolean>('claude-code-status', (event) => {
    config.claude_code_detected = event.payload;
    if (event.payload) {
      stateManager.setState('working');
      showBubble('Claude Code 正在工作中~');
    } else {
      stateManager.setState('idle');
      interactionLog.add('Claude Code 已停止');
    }
  });

  stateManager.onChange((newState) => {
    updatePetImage(newState);
  });

  listen<PetConfig>('config-updated', (event) => {
    config = { ...DEFAULT_CONFIG, ...event.payload };
    applyOpacity(config.opacity);
    void applyScale(config.scale);
  });

  applyOpacity(config.opacity);
  applyScale(config.scale);
  updatePetImage('idle');

  await waitForPetImage();
  await measureMenuSlot();
  await syncWindowSize();
  layoutReady = true;

  startIdleLoop();

  setTimeout(() => {
    stateManager.setState('wave');
    const loaded = characterAssets.size;
    showBubble(
      loaded >= ALL_STATES.length
        ? '离恨烟来啦~'
        : `离恨烟来啦~（已识别 ${loaded}/7 种形态）`,
    );
  }, 400);

  try {
    const found = await invoke<boolean>('is_claude_running_cmd');
    if (found) {
      stateManager.setState('working');
      showBubble('Claude Code 正在工作中~');
    }
  } catch {
    /* ignore */
  }
}

function waitForPetImage(): Promise<void> {
  if (petImage.complete && petImage.naturalWidth > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    petImage.addEventListener('load', () => resolve(), { once: true });
    petImage.addEventListener('error', () => resolve(), { once: true });
  });
}

async function measureMenuSlot() {
  const wasHidden = menu.classList.contains('hidden');
  menu.classList.remove('hidden');
  menu.style.visibility = 'hidden';
  menu.style.pointerEvents = 'none';
  await new Promise((r) => requestAnimationFrame(r));
  menuSlotHeight = Math.max(240, menu.offsetHeight + 16);
  menu.style.visibility = '';
  menu.style.pointerEvents = '';
  if (wasHidden) {
    menu.classList.add('hidden');
  }
  document.documentElement.style.setProperty(
    '--menu-slot-height',
    `${menuSlotHeight}px`,
  );
}

function assetExists(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function probeCharacterAssets(): Promise<Map<PetState, string>> {
  const map = new Map<PetState, string>();
  for (const state of ALL_STATES) {
    const candidates = [
      `/character/${state}.png`,
      `/character/${state}.webp`,
      `/character/${state}.gif`,
    ];
    for (const url of candidates) {
      if (await assetExists(url)) {
        map.set(state, url);
        break;
      }
    }
  }
  return map;
}

function startIdleLoop() {
  const scheduleNext = () => {
    const delay = 12000 + Math.random() * 8000;
    window.setTimeout(() => {
      if (stateManager.currentState === 'idle' && characterAssets.size > 1) {
        const idleStates = ALL_STATES.filter(
          (s) => s !== 'idle' && characterAssets.has(s),
        );
        if (idleStates.length > 0) {
          const pick = idleStates[Math.floor(Math.random() * idleStates.length)];
          stateManager.setState(pick);
          showBubble(randomMessage(pick));
        }
      }
      scheduleNext();
    }, delay);
  };
  scheduleNext();
}

function updatePetImage(state: PetState) {
  const src =
    characterAssets.get(state) ??
    characterAssets.get('idle') ??
    '/character/idle.png';
  petImage.className = `pet-asset state-${state}`;
  const normalized = src.startsWith('/') ? src : `/${src}`;
  if (petImage.getAttribute('src') !== normalized) {
    petImage.setAttribute('src', normalized);
  }
}

let bubbleTimer: number | null = null;

function showBubble(text: string, autoHide = true) {
  bubbleText.textContent = text;
  bubble.classList.remove('hidden');
  if (bubbleTimer !== null) window.clearTimeout(bubbleTimer);
  if (autoHide) {
    bubbleTimer = window.setTimeout(() => {
      bubble.classList.add('hidden');
    }, 3500);
  }
}

function randomMessage(state: PetState): string {
  const messages = STATE_MESSAGES[state] || STATE_MESSAGES.idle;
  return messages[Math.floor(Math.random() * messages.length)];
}

function isMenuVisible() {
  return !menu.classList.contains('hidden');
}

function getPetWidthPx() {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--pet-width')
    .trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : BASE_PET_WIDTH;
}

function computeWindowDimensions(petW: number) {
  const width = Math.ceil(petW + WINDOW_PADDING * 2);
  const height = Math.ceil(
    PET_STAGE_TOP + petW + menuSlotHeight + WINDOW_PADDING,
  );
  return { width, height };
}

async function syncWindowSize() {
  await new Promise((r) => requestAnimationFrame(r));
  const { width, height } = computeWindowDimensions(getPetWidthPx());
  try {
    await invoke('fit_pet_window', { width, height });
  } catch {
    /* ignore */
  }
}

function resetDragState() {
  dragPointerId = null;
  dragStart = null;
  dragStarted = false;
}

function bindInteractions() {
  menu.addEventListener('mousedown', (e) => e.stopPropagation());
  menu.addEventListener('pointerdown', (e) => e.stopPropagation());
  menu.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  menuBackdrop.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    hideMenu();
  });

  petImage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragPointerId = e.pointerId;
    dragStart = { x: e.clientX, y: e.clientY };
    dragStarted = false;
  });

  petImage.addEventListener('pointermove', (e) => {
    if (dragPointerId !== e.pointerId || !dragStart || dragStarted) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      dragStarted = true;
      void appWindow.startDragging();
    }
  });

  petImage.addEventListener('pointerup', (e) => {
    if (dragPointerId !== e.pointerId) return;
    const wasClick = !dragStarted;
    resetDragState();
    if (!wasClick || !layoutReady) return;

    if (isMenuVisible()) {
      hideMenu();
      return;
    }
    cycleState();
    interactionLog.add('点击了离恨烟');
  });

  petImage.addEventListener('pointercancel', resetDragState);

  petImage.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    resetDragState();
    hideMenu();
    stateManager.setState('wave');
    showBubble('嘿嘿~ 别戳我啦！');
  });

  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    hideMenu();
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length === 0) return;
    stateManager.setState('think', { force: true });
    showBubble('文件投喂还没接入 Claude Code~');
    interactionLog.add(`尝试投喂 ${files.length} 个文件`);
  });

  const openContextMenu = (e: Event) => {
    e.preventDefault();
    if (!layoutReady) return;
    if (isMenuVisible()) {
      hideMenu();
      return;
    }
    void showMenu();
  };

  petImage.addEventListener('contextmenu', (e) => {
    e.stopPropagation();
    openContextMenu(e);
  });
  appRoot.addEventListener('contextmenu', openContextMenu);

  menu.addEventListener('pointerup', (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>(
      '.menu-item',
    );
    if (!button || menuBusy || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    void runMenuAction(button.dataset.action);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isMenuVisible()) { hideMenu(); e.preventDefault(); return; }
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      void invoke('open_dashboard').catch(console.error);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !layoutReady) {
      layoutReady = true;
    }
  });
}

function cycleState() {
  const available = ALL_STATES.filter((s) => characterAssets.has(s));
  if (available.length === 0) {
    showBubble('未找到形态图片，请检查 public/character/ 目录');
    return;
  }
  cycleIndex = (cycleIndex + 1) % available.length;
  const next = available[cycleIndex];
  stateManager.setState(next, { holdMs: 12000, force: true });
  showBubble(STATE_LABELS[next] ?? next);
  interactionLog.add(`切换形态: ${next}`);
}

async function runMenuAction(action: string | undefined) {
  if (menuBusy) return;
  menuBusy = true;
  try {
    if (action === 'close-menu') {
      hideMenu();
      return;
    }
    await handleMenuAction(action);
  } finally {
    menuBusy = false;
  }
}

async function showMenu() {
  if (isMenuVisible() || menuBusy || !layoutReady) return;
  if (!menuSlotHeight) {
    await measureMenuSlot();
  }
  menu.classList.remove('hidden');
  menuBackdrop.classList.remove('hidden');
  menuBackdrop.setAttribute('aria-hidden', 'false');
  await new Promise((r) => requestAnimationFrame(r));
}

function hideMenu() {
  if (!isMenuVisible()) return;
  menu.classList.add('hidden');
  menuBackdrop.classList.add('hidden');
  menuBackdrop.setAttribute('aria-hidden', 'true');
  // 菜单关闭时不再自动关闭聊天/形态面板，让它们独立
}

async function handleMenuAction(action: string | undefined) {
  hideMenu();
  try {
    switch (action) {
      case 'dashboard':
        await invoke('open_dashboard');
        break;
      case 'cycle-state':
        cycleState();
        break;
      case 'say-hi':
        stateManager.setState('wave', { force: true });
        showBubble(randomMessage('wave'));
        break;
      case 'start-claude': {
        const found = await invoke<boolean>('is_claude_running_cmd');
        if (found) {
          showBubble('Claude Code 已经在运行啦~');
          break;
        }
        await invoke('start_claude_process');
        showBubble('正在启动 Claude Code~');
        break;
      }
      case 'check-status': {
        const running = await invoke<boolean>('is_claude_running_cmd');
        showBubble(running ? 'Claude Code 正在工作中！' : 'Claude Code 未运行~');
        break;
      }
      case 'quit':
        stateManager.setState('sleep');
        showBubble('再见啦~', false);
        setTimeout(() => window.close(), 1200);
        break;
    }
  } catch (err) {
    console.error(err);
    showBubble('操作失败，请重试');
  }
}

function applyOpacity(opacity: number) {
  document.documentElement.style.setProperty('--pet-opacity', String(opacity));
}

async function applyScale(scale: number) {
  const safeScale = Math.min(1.8, Math.max(0.4, scale));
  const width = Math.round(BASE_PET_WIDTH * safeScale);
  document.documentElement.style.setProperty('--pet-width', `${width}px`);
  await waitForPetImage();
  await measureMenuSlot();
  await syncWindowSize();
}

void boot();
