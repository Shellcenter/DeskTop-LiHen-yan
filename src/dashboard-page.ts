import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { PetConfig } from './state';
import { DEFAULT_CONFIG } from './state';

let config: PetConfig = { ...DEFAULT_CONFIG };

const scaleSlider = document.getElementById('scale-slider') as HTMLInputElement;
const opacitySlider = document.getElementById('opacity-slider') as HTMLInputElement;
const alwaysOnTop = document.getElementById('always-on-top') as HTMLInputElement;
const autoStart = document.getElementById('auto-start') as HTMLInputElement;
const scaleValue = document.getElementById('scale-value');
const opacityValue = document.getElementById('opacity-value');

function render(next: PetConfig) {
  config = { ...DEFAULT_CONFIG, ...next };
  scaleSlider.value = String(config.scale);
  opacitySlider.value = String(config.opacity);
  alwaysOnTop.checked = config.always_on_top;
  autoStart.checked = config.auto_start;
  if (scaleValue) scaleValue.textContent = config.scale.toFixed(2);
  if (opacityValue) opacityValue.textContent = config.opacity.toFixed(2);
}

async function save(patch: Partial<PetConfig>) {
  const next = { ...config, ...patch };
  render(next);
  await invoke('set_config', { config: next });
}

function bindControls() {
  scaleSlider.addEventListener('input', () => {
    const scale = Number(scaleSlider.value);
    if (scaleValue) scaleValue.textContent = scale.toFixed(2);
    save({ scale }).catch(console.error);
  });

  opacitySlider.addEventListener('input', () => {
    const opacity = Number(opacitySlider.value);
    if (opacityValue) opacityValue.textContent = opacity.toFixed(2);
    save({ opacity }).catch(console.error);
  });

  alwaysOnTop.addEventListener('change', () => {
    save({ always_on_top: alwaysOnTop.checked }).catch(console.error);
  });

  autoStart.addEventListener('change', () => {
    save({ auto_start: autoStart.checked }).catch(console.error);
  });

  document.getElementById('btn-start-claude')?.addEventListener('click', () => {
    invoke('start_claude_process').catch(console.error);
  });
}

function updateClaudeStatus(found: boolean) {
  const dot = document.getElementById('cc-status-dot');
  const text = document.getElementById('cc-status-text');
  const indicator = document.getElementById('cc-indicator');
  if (!dot || !text || !indicator) return;

  dot.className = found ? 'status-dot online' : 'status-dot offline';
  indicator.className = found ? 'cc-indicator online' : 'cc-indicator offline';
  text.textContent = found ? '运行中' : '未运行';
}

async function boot() {
  const loaded = await invoke<PetConfig>('get_config');
  render(loaded);
  bindControls();

  invoke<boolean>('is_claude_running_cmd').then(updateClaudeStatus).catch(() => {});
  listen<boolean>('claude-code-status', (event) => updateClaudeStatus(event.payload));
  listen<PetConfig>('config-updated', (event) => render(event.payload));
}

boot().catch(console.error);
