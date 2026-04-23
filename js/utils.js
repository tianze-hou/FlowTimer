// ==================== Utils ====================
const Utils = {
  uid() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);
  },
  clampInt(n, min, max) {
    const x = Number.parseInt(n, 10);
    if (Number.isNaN(x)) return min;
    return Math.min(max, Math.max(min, x));
  },
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },
  formatTime(date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  },
  safeTrim(s) {
    return String(s ?? "").trim();
  }
};

// ==================== State ====================
const State = {
  tasks: [],
  presets: [],
  currentPresetId: null,

  currentTaskIndex: 0,
  timeLeft: 0,
  isRunning: false,
  isPaused: false,
  isOvertime: false,
  overtimeSeconds: 0,

  logs: [],
  logMode: "table",

  taskStats: {
    pauses: 0,
    pauseDuration: 0,
    pauseStart: null,
    startTime: null
  },

  routineStartTime: null,

  flashes: [],
  chimeMins: 0,
  routineActiveSeconds: 0,
  lastActiveUpdate: null,
  nextChimeAtActiveSeconds: null
};

export { Utils, State };