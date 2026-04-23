import { Utils, State } from './utils.js';
import { Storage } from './storage.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { Timer, Chime } from './timer.js';

const App = {
  startRoutine() {
    if (!State.tasks.length) {
      UI.toast("请先添加至少一个步骤", "error");
      return;
    }

    State.currentTaskIndex = 0;
    State.logs = [];
    State.flashes = [];
    State.routineStartTime = new Date();
    State.isRunning = true;

    Chime.initForRoutineStart();

    UI.showPage("running");
    this.runTask();
  },

  runTask() {
    if (State.currentTaskIndex >= State.tasks.length) {
      this.finishRoutine();
      return;
    }

    const task = State.tasks[State.currentTaskIndex];

    State.timeLeft = (task.mins || 1) * 60;
    State.isPaused = false;
    State.isOvertime = false;
    State.overtimeSeconds = 0;

    State.taskStats = {
      pauses: 0,
      pauseDuration: 0,
      pauseStart: null,
      startTime: Date.now()
    };

    DOM.statusMessage.textContent = "";
    DOM.displayTime.classList.remove("distracted");
    DOM.flowIndicator.innerHTML = "<span>🌊</span><span>心流模式 - 继续专注吧！</span>";
    DOM.pauseBtn.textContent = "暂停";

    State.logs.push({
      emoji: task.emoji,
      name: task.name,
      planned: task.mins,
      start: Utils.formatTime(new Date(State.taskStats.startTime))
    });

    UI.renderRunning();
    Timer.start();
  },

  togglePause() {
    Chime.syncActiveOnPauseToggle(!State.isPaused);

    State.isPaused = !State.isPaused;

    if (State.isPaused) {
      State.taskStats.pauseStart = Date.now();
      State.taskStats.pauses++;
      DOM.pauseBtn.textContent = "继续";
      DOM.statusMessage.textContent = "⏸ 计时暂停中";
    } else {
      if (State.taskStats.pauseStart) {
        State.taskStats.pauseDuration += Math.round((Date.now() - State.taskStats.pauseStart) / 1000);
        State.taskStats.pauseStart = null;
      }
      DOM.pauseBtn.textContent = "暂停";
      DOM.statusMessage.textContent = "";
      Timer.tick();
    }

    UI.updateMobilePauseBtn();
  },

  completeTask() {
    const log = State.logs[State.currentTaskIndex];
    const now = Date.now();

    log.end = Utils.formatTime(new Date(now));
    log.pauses = State.taskStats.pauses;
    log.overtime = State.isOvertime;
    log.overtimeMins = Math.round(State.overtimeSeconds / 60);

    const actualSecs = Math.round((now - State.taskStats.startTime) / 1000) - (State.taskStats.pauseDuration || 0);
    log.actual = Math.round((actualSecs / 60) * 10) / 10;

    State.currentTaskIndex++;
    Audio.play();
    this.runTask();
  },

  applyDistraction(mins) {
    const log = State.logs[State.currentTaskIndex];
    log.distracted = true;
    log.distractedMins = mins;

    DOM.displayTime.classList.add("distracted");
    DOM.flowIndicator.innerHTML = "<span>😅</span><span>已记录分心时间</span>";

    UI.toast(`已记录：分心了约 ${mins} 分钟`);
    window.setTimeout(() => this.completeTask(), 300);
  },

  stopRoutine() {
    if (State.logs.length > 0) {
      const log = State.logs[State.currentTaskIndex];
      if (log && !log.end) {
        const now = Date.now();
        log.end = Utils.formatTime(new Date(now));
        log.aborted = true;
        log.pauses = State.taskStats.pauses;

        const actualSecs = Math.round((now - State.taskStats.startTime) / 1000) - (State.taskStats.pauseDuration || 0);
        log.actual = Math.round((actualSecs / 60) * 10) / 10;
      }
    }
    this.finishRoutine();
  },

  finishRoutine() {
    Timer.stop();
    Chime.endRoutine();
    State.isRunning = false;
    UI.showPage("log");
    UI.renderLog();
  },

  togglePanel() {
    const isOpen = DOM.sidePanel.classList.toggle("open");
    DOM.panelTrigger.classList.toggle("hidden");

    if (DOM.panelOverlay) {
      DOM.panelOverlay.classList.toggle("show", isOpen);
    }

    UI.renderSidePanel();
    UI.updatePanelTools();
  },

  closePanel() {
    DOM.sidePanel.classList.remove("open");
    DOM.panelTrigger.classList.remove("hidden");
    if (DOM.panelOverlay) {
      DOM.panelOverlay.classList.remove("show");
    }
  },

  editTask(index) {
    const task = State.tasks[index];
    if (!task) return;

    const name = prompt("修改环节名称:", task.name);
    const minsStr = prompt("修改计划时长(分钟):", String(task.mins));

    if (name !== null && name.trim() !== "") task.name = name.trim();
    if (minsStr !== null && minsStr.trim() !== "") task.mins = Utils.clampInt(minsStr, 1, 999);

    Storage.saveTasks(State);

    if (State.isRunning && index === State.currentTaskIndex) {
      DOM.displayName.textContent = task.name;
      Timer.tick();
    }

    UI.renderTasks();
    UI.renderSidePanel();
    UI.renderProgress();
    UI.updateETA();
  },

  updateTaskById(taskId, field, value) {
    const t = State.tasks.find(x => x.id === taskId);
    if (!t) return;

    if (field === "mins") {
      t.mins = Utils.clampInt(value, 1, 999);
    } else if (field === "emoji") {
      t.emoji = String(value);
    } else if (field === "name") {
      t.name = String(value);
    }

    Storage.saveTasks(State);
  },

  addTask() {
    State.tasks.push({ id: Utils.uid(), emoji: "✨", name: "新环节", mins: 5 });
    Storage.saveTasks(State);
    UI.renderTasks();
  },

  removeTaskById(id) {
    State.tasks = State.tasks.filter(t => t.id !== id);
    Storage.saveTasks(State);
    UI.renderTasks();
  },

  exportConfig() {
    const preset = State.presets.find(p => p.id === State.currentPresetId);
    const config = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      name: preset?.name || "未命名流程",
      tasks: Utils.deepClone(State.tasks)
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flow-routine-${new Date().toLocaleDateString().replace(/\//g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);

    UI.toast("配置已导出！");
  },

  importConfig(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        if (!config.tasks || !Array.isArray(config.tasks)) throw new Error("无效的配置文件");

        Storage.ensureTaskIds(config.tasks);

        let name = config.name || file.name.replace(/\.json$/i, "");
        let counter = 1;
        while (State.presets.some(p => p.name === name)) {
          name = `${config.name || "导入的流程"} (${counter++})`;
        }

        const newPreset = {
          id: "imported_" + Date.now(),
          name,
          tasks: Utils.deepClone(config.tasks),
          createdAt: Date.now(),
          source: "imported"
        };

        State.presets.push(newPreset);
        State.tasks = Utils.deepClone(config.tasks);
        State.currentPresetId = newPreset.id;

        Storage.savePresets(State);
        Storage.saveTasks(State);
        Storage.saveCurrentPreset(State);

        UI.renderPresets();
        UI.renderTasks();
        UI.toast(`已导入「${name}」`);
      } catch (err) {
        UI.toast("导入失败：" + err.message, "error");
      }
    };
    reader.readAsText(file);
  },

  async importFromClipboard() {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        UI.toast("浏览器不支持读取剪贴板", "error");
        return;
      }

      const text = await navigator.clipboard.readText();

      if (!text || !text.trim()) {
        UI.toast("剪贴板为空", "error");
        return;
      }

      let config;
      try {
        config = JSON.parse(text);
      } catch (parseErr) {
        UI.toast("剪贴板内容不是有效的 JSON", "error");
        return;
      }

      if (!config.tasks || !Array.isArray(config.tasks)) {
        UI.toast("JSON 格式无效：缺少 tasks 数组", "error");
        return;
      }

      if (config.tasks.length === 0) {
        UI.toast("JSON 中没有任务步骤", "error");
        return;
      }

      Storage.ensureTaskIds(config.tasks);

      let name = config.name || "剪贴板导入";
      let counter = 1;
      while (State.presets.some(p => p.name === name)) {
        name = `${config.name || "剪贴板导入"} (${counter++})`;
      }

      const newPreset = {
        id: "clipboard_" + Date.now(),
        name,
        tasks: Utils.deepClone(config.tasks),
        createdAt: Date.now(),
        source: "imported"
      };

      State.presets.push(newPreset);
      State.tasks = Utils.deepClone(config.tasks);
      State.currentPresetId = newPreset.id;

      Storage.savePresets(State);
      Storage.saveTasks(State);
      Storage.saveCurrentPreset(State);

      UI.renderPresets();
      UI.renderTasks();
      UI.toast(`已从剪贴板导入「${name}」（${config.tasks.length} 步骤）`);

    } catch (err) {
      if (err.name === "NotAllowedError") {
        UI.toast("请允许读取剪贴板权限", "error");
      } else {
        UI.toast("导入失败：" + err.message, "error");
      }
    }
  },

  savePreset(name) {
    const newPreset = {
      id: "preset_" + Date.now(),
      name,
      tasks: Utils.deepClone(State.tasks),
      createdAt: Date.now(),
      source: "user"
    };

    State.presets.push(newPreset);
    State.currentPresetId = newPreset.id;

    Storage.savePresets(State);
    Storage.saveCurrentPreset(State);
    UI.renderPresets();
    UI.toast(`预设「${name}」已保存！`);
  },

  loadPreset(id) {
    const preset = State.presets.find(p => p.id === id);
    if (!preset) return;

    const tasks = Utils.deepClone(preset.tasks || []);
    Storage.ensureTaskIds(tasks);

    State.tasks = tasks;
    State.currentPresetId = id;

    Storage.saveTasks(State);
    Storage.saveCurrentPreset(State);

    UI.renderTasks();
    UI.renderPresets();
    UI.toast(`已加载「${preset.name}」`);
  },

  deletePreset(id) {
    const preset = State.presets.find(p => p.id === id);
    if (!preset) return;
    if (!confirm(`确定要删除「${preset.name}」吗？`)) return;

    State.presets = State.presets.filter(p => p.id !== id);
    if (State.currentPresetId === id) State.currentPresetId = null;

    Storage.savePresets(State);
    Storage.saveCurrentPreset(State);
    UI.renderPresets();
    UI.toast("预设已删除", "error");
  },

  openFlash() {
    if (!State.isRunning) {
      UI.toast("请先开始执行再记录闪念", "error");
      return;
    }
    DOM.flashModal.classList.add("show");
    DOM.flashInput.value = "";
    DOM.flashInput.focus();
  },

  saveFlash() {
    const text = Utils.safeTrim(DOM.flashInput.value);
    if (!text) {
      UI.toast("请输入内容", "error");
      return;
    }

    const task = State.tasks[State.currentTaskIndex];
    const taskLabel = task ? `${task.emoji} ${task.name}` : "";

    State.flashes.push({
      time: Utils.formatTime(new Date()),
      task: taskLabel,
      text
    });

    DOM.flashModal.classList.remove("show");
    UI.updatePanelTools();
    UI.toast("闪念已记录 ✅");
  }
};

export { App };