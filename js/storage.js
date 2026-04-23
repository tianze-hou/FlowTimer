import { Utils } from './utils.js';

const Storage = {
  keys: {
    tasks: "flow_v1_tasks",
    presets: "flow_v1_presets",
    currentPreset: "flow_v1_current_preset",
    chimeMins: "flow_v1_chime_mins"
  },

  defaultTasks() {
    return [
      { id: Utils.uid(), emoji: "☀️", name: "晨间伸展", mins: 5 },
      { id: Utils.uid(), emoji: "🍵", name: "喝一杯热水", mins: 2 },
      { id: Utils.uid(), emoji: "📝", name: "检查日程", mins: 5 }
    ];
  },

  defaultPresets() {
    return [
      {
        id: "morning",
        name: "晨间流程",
        tasks: [
          { id: Utils.uid(), emoji: "☀️", name: "晨间伸展", mins: 5 },
          { id: Utils.uid(), emoji: "🍵", name: "喝一杯热水", mins: 2 },
          { id: Utils.uid(), emoji: "📝", name: "检查日程", mins: 5 }
        ],
        createdAt: Date.now(),
        source: "builtin"
      },
      {
        id: "work",
        name: "工作启动",
        tasks: [
          { id: Utils.uid(), emoji: "🎯", name: "确定今日目标", mins: 3 },
          { id: Utils.uid(), emoji: "📧", name: "处理紧急邮件", mins: 10 },
          { id: Utils.uid(), emoji: "💻", name: "开始深度工作", mins: 45 }
        ],
        createdAt: Date.now(),
        source: "builtin"
      }
    ];
  },

  ensureTaskIds(tasks) {
    for (const t of tasks) {
      if (!t.id) t.id = Utils.uid();
      if (typeof t.emoji !== "string") t.emoji = "✨";
      if (typeof t.name !== "string") t.name = "新环节";
      t.mins = Utils.clampInt(t.mins, 1, 999);
    }
    return tasks;
  },

  load(State) {
    try {
      const tasksRaw = JSON.parse(localStorage.getItem(this.keys.tasks));
      const presetsRaw = JSON.parse(localStorage.getItem(this.keys.presets));
      State.tasks = Array.isArray(tasksRaw) ? this.ensureTaskIds(tasksRaw) : this.defaultTasks();
      State.presets = Array.isArray(presetsRaw) ? presetsRaw : this.defaultPresets();

      State.presets.forEach(p => {
        if (Array.isArray(p.tasks)) this.ensureTaskIds(p.tasks);
      });

      State.currentPresetId = localStorage.getItem(this.keys.currentPreset) || null;

      const chimeRaw = localStorage.getItem(this.keys.chimeMins);
      State.chimeMins = Utils.clampInt(chimeRaw ?? "0", 0, 60);
      if (![0, 15, 30, 60].includes(State.chimeMins)) State.chimeMins = 0;
    } catch (e) {
      console.warn("Storage load failed:", e);
      State.tasks = this.defaultTasks();
      State.presets = this.defaultPresets();
      State.currentPresetId = null;
      State.chimeMins = 0;
    }
  },

  saveTasks(State) {
    localStorage.setItem(this.keys.tasks, JSON.stringify(State.tasks));
  },
  savePresets(State) {
    localStorage.setItem(this.keys.presets, JSON.stringify(State.presets));
  },
  saveCurrentPreset(State) {
    if (State.currentPresetId) localStorage.setItem(this.keys.currentPreset, State.currentPresetId);
    else localStorage.removeItem(this.keys.currentPreset);
  },
  saveChime(State) {
    localStorage.setItem(this.keys.chimeMins, String(State.chimeMins));
  }
};

export { Storage };