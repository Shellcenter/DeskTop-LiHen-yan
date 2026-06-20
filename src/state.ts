// ─── 角色状态定义 ───

export type PetState = 'idle' | 'wave' | 'happy' | 'think' | 'working' | 'sleep' | 'typing';

export const ALL_STATES: PetState[] = [
  'idle',
  'wave',
  'happy',
  'think',
  'working',
  'sleep',
  'typing',
];

export const STATE_LABELS: Record<PetState, string> = {
  idle: '待机',
  wave: '打招呼',
  happy: '开心',
  think: '思考',
  working: '工作中',
  sleep: '睡觉',
  typing: '打字',
};

export interface PetConfig {
  scale: number;
  opacity: number;
  always_on_top: boolean;
  auto_hide: boolean;
  current_state: string;
  voice_enabled: boolean;
  claude_code_detected: boolean;
  auto_start: boolean;
}

export const DEFAULT_CONFIG: PetConfig = {
  scale: 1,
  opacity: 1,
  always_on_top: true,
  auto_hide: false,
  current_state: 'idle',
  voice_enabled: false,
  claude_code_detected: false,
  auto_start: false,
};

// ─── 状态对应的气泡文案 ───

export const STATE_MESSAGES: Record<PetState, string[]> = {
  idle: ['嗯… 在等你呢~', '代码写完了吗？', '我在这里哦~', '今天想做什么？'],
  wave: ['嗨~！', '你好呀~', '来一起写代码吧！'],
  happy: ['太棒啦！', '好厉害！', '真不错~！'],
  think: ['嗯… 让我想想…', '这个问题有点意思', '唔… 思路整理中…'],
  working: ['正在努力中…', '不要打扰我哦~', '代码快要写好了！'],
  sleep: ['zzZ… 在偷懒吗？', '好困… 你还没写代码吗？', '再不工作我就要睡着了…'],
  typing: ['嗒嗒嗒嗒… 在写代码~', '马上好！', '这段代码好优雅~'],
};

// ─── 状态机会话优先级 ───

// 高优先级状态不会被低优先级打断
export const STATE_PRIORITY: Record<PetState, number> = {
  idle: 0,
  wave: 1,
  happy: 2,
  think: 2,
  typing: 3,
  working: 3,
  sleep: 0,
};

// ─── 互动日志 ───

export interface Interaction {
  time: string;
  text: string;
}

export class InteractionLog {
  private logs: Interaction[] = [];
  private maxLogs = 50;

  add(text: string) {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    this.logs.unshift({ time, text });
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  getAll(): Interaction[] {
    return this.logs;
  }
}

// ─── 状态管理器 ───

export class StateManager {
  private _currentState: PetState = 'idle';
  private listeners: Array<(state: PetState) => void> = [];
  private autoStateTimer: number | null = null;

  get currentState(): PetState {
    return this._currentState;
  }

  setState(state: PetState, options?: { holdMs?: number; force?: boolean }) {
    // 空闲状态可随时切换，其他状态按优先级
    // 用户主动操作（force=true）强制覆盖任何状态
    if (
      !options?.force &&
      this._currentState !== 'idle' &&
      STATE_PRIORITY[state] < STATE_PRIORITY[this._currentState]
    ) {
      return; // 低优先级不能打断高优先级（除非 force）
    }

    this._currentState = state;
    this.notify(this._currentState);

    if (this.autoStateTimer !== null) {
      window.clearTimeout(this.autoStateTimer);
      this.autoStateTimer = null;
    }

    if (state !== 'idle' && state !== 'working') {
      const hold = options?.holdMs ?? 4000 + Math.random() * 2000;
      this.autoStateTimer = window.setTimeout(() => {
        if (this._currentState === state) {
          this.setState('idle');
        }
      }, hold);
    }
  }

  private notify(_state: PetState) {
    for (const listener of this.listeners) {
      listener(this._currentState);
    }
  }

  onChange(callback: (state: PetState) => void) {
    this.listeners.push(callback);
  }

  destroy() {
    if (this.autoStateTimer !== null) {
      window.clearTimeout(this.autoStateTimer);
    }
  }
}
