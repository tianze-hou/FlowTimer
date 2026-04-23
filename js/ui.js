import { Utils, State } from './utils.js';
import { Storage } from './storage.js';
import { Audio } from './audio.js';

// ==================== DOM Cache ====================
const DOM = {};

function cacheDOM() {
  DOM.setupArea = document.getElementById("setup-area");
  DOM.runningArea = document.getElementById("running-area");
  DOM.logArea = document.getElementById("log-area");

  DOM.taskList = document.getElementById("task-list");
  DOM.presetList = document.getElementById("preset-list");

  DOM.saveModal = document.getElementById("save-modal");
  DOM.distractionModal = document.getElementById("distraction-modal");
  DOM.flashModal = document.getElementById("flash-modal");
  DOM.presetNameInput = document.getElementById("preset-name-input");
  DOM.customDistractionInput = document.getElementById("custom-distraction-input");
  DOM.distractionGrid = document.getElementById("distraction-grid");
  DOM.fileInput = document.getElementById("file-input");

  DOM.flashInput = document.getElementById("flash-input");
  DOM.flashChip = document.getElementById("flash-chip");
  DOM.chimeBtn = document.getElementById("chime-btn");
  DOM.chimeChip = document.getElementById("chime-chip");

  DOM.displayEmoji = document.getElementById("display-emoji");
  DOM.displayName = document.getElementById("display-name");
  DOM.displayTime = document.getElementById("display-time");
  DOM.statusMessage = document.getElementById("status-message");
  DOM.flowIndicator = document.getElementById("flow-indicator");
  DOM.overtimeLabel = document.getElementById("overtime-label");
  DOM.pauseBtn = document.getElementById("pause-btn");
  DOM.forgotBtn = document.getElementById("forgot-btn");

  DOM.etaProgress = document.getElementById("eta-progress");
  DOM.etaRemaining = document.getElementById("eta-remaining");
  DOM.etaFinish = document.getElementById("eta-finish");

  DOM.progressTrack = document.getElementById("progress-track");
  DOM.progressPercent = document.getElementById("progress-percent");

  DOM.panelTrigger = document.getElementById("panel-trigger");
  DOM.sidePanel = document.getElementById("side-panel");
  DOM.activeTaskSlot = document.getElementById("active-task-slot");
  DOM.futureTaskList = document.getElementById("future-task-list");

  DOM.logContent = document.getElementById("log-content");
  DOM.toast = document.getElementById("toast");

  DOM.emojiMeasure = document.getElementById("emoji-measure");

  DOM.mobileActionBar = document.getElementById("mobile-action-bar");
  DOM.mobilePauseBtn = document.getElementById("mobile-pause-btn");
  DOM.mobilePauseIcon = document.getElementById("mobile-pause-icon");
  DOM.mobilePauseLabel = document.getElementById("mobile-pause-label");
  DOM.mobileForgotBtn = document.getElementById("mobile-forgot-btn");
  DOM.panelOverlay = document.getElementById("panel-overlay");
}

// ==================== Emoji Sizer ====================
const EmojiSizer = {
  fit(inputEl) {
    if (!inputEl) return;
    const text = inputEl.value || "";
    DOM.emojiMeasure.textContent = text;

    const measured = DOM.emojiMeasure.getBoundingClientRect().width;
    const padding = 22;
    const min = 52;
    const max = 180;
    const w = Math.max(min, Math.min(max, Math.ceil(measured + padding)));
    inputEl.style.width = w + "px";
  },
  fitAll() {
    DOM.taskList.querySelectorAll("input.task-input-emoji").forEach(el => this.fit(el));
  }
};

// ==================== UI ====================
const UI = {
  toast(message, type = "success") {
    DOM.toast.textContent = message;
    DOM.toast.classList.remove("success", "error", "show");
    DOM.toast.classList.add(type === "error" ? "error" : "success", "show");
    window.setTimeout(() => DOM.toast.classList.remove("show"), 2500);
  },

  showPage(page) {
    DOM.setupArea.style.display = page === "setup" ? "block" : "none";
    DOM.runningArea.style.display = page === "running" ? "block" : "none";
    DOM.logArea.style.display = page === "log" ? "block" : "none";
  },

  updatePanelTools() {
    const count = State.flashes.length;
    if (DOM.flashChip) DOM.flashChip.textContent = `${count} 条`;

    const map = { 0: "关闭", 15: "15m", 30: "30m", 60: "60m" };
    const label = map[State.chimeMins] ?? "关闭";
    if (DOM.chimeChip) DOM.chimeChip.textContent = label;
    if (DOM.chimeBtn) DOM.chimeBtn.classList.toggle("active", State.chimeMins > 0);
  },

  renderPresets() {
    DOM.presetList.replaceChildren();

    for (const p of State.presets) {
      const item = document.createElement("div");
      item.className = "preset-item" + (State.currentPresetId === p.id ? " active" : "");
      item.dataset.presetId = p.id;

      const info = document.createElement("div");
      info.className = "preset-info";

      const name = document.createElement("span");
      name.className = "preset-name";
      name.textContent = p.name;

      if (p.source === "imported") {
        const badge = document.createElement("span");
        badge.className = "preset-badge";
        badge.textContent = "导入";
        name.appendChild(badge);
      }

      const meta = document.createElement("span");
      meta.className = "preset-meta";
      const total = (p.tasks || []).reduce((a, t) => a + (Number(t.mins) || 0), 0);
      meta.textContent = `${(p.tasks || []).length} 步骤 · ${total} 分钟`;

      info.appendChild(name);
      info.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "preset-actions";

      const loadBtn = document.createElement("button");
      loadBtn.className = "btn-icon";
      loadBtn.dataset.action = "load-preset";
      loadBtn.dataset.id = p.id;
      loadBtn.title = "加载";
      loadBtn.innerHTML = `<svg class="icon" style="color:var(--accent-success)"><use href="#icon-upload"></use></svg>`;

      const delBtn = document.createElement("button");
      delBtn.className = "btn-icon";
      delBtn.dataset.action = "delete-preset";
      delBtn.dataset.id = p.id;
      delBtn.title = "删除";
      delBtn.innerHTML = `<svg class="icon" style="color:var(--accent-danger)"><use href="#icon-delete"></use></svg>`;

      actions.appendChild(loadBtn);
      actions.appendChild(delBtn);

      item.appendChild(info);
      item.appendChild(actions);

      DOM.presetList.appendChild(item);
    }
  },

  renderTasks() {
    DOM.taskList.replaceChildren();

    for (const t of State.tasks) {
      const row = document.createElement("div");
      row.className = "task-item";
      row.dataset.taskId = t.id;

      const handle = document.createElement("div");
      handle.className = "task-handle";
      handle.innerHTML = `<svg class="icon"><use href="#icon-drag"></use></svg>`;

      const emojiInput = document.createElement("input");
      emojiInput.className = "input task-input-emoji";
      emojiInput.type = "text";
      emojiInput.inputMode = "text";
      emojiInput.autocomplete = "off";
      emojiInput.spellcheck = false;
      emojiInput.value = t.emoji;
      emojiInput.dataset.field = "emoji";

      const nameInput = document.createElement("input");
      nameInput.className = "input";
      nameInput.type = "text";
      nameInput.value = t.name;
      nameInput.dataset.field = "name";

      const minsInput = document.createElement("input");
      minsInput.className = "input task-input-mins";
      minsInput.type = "number";
      minsInput.min = "1";
      minsInput.value = String(t.mins);
      minsInput.dataset.field = "mins";

      const removeBtn = document.createElement("button");
      removeBtn.className = "btn-icon";
      removeBtn.dataset.action = "remove-task";
      removeBtn.dataset.id = t.id;
      removeBtn.innerHTML = `<svg class="icon" style="color:var(--accent-danger)"><use href="#icon-close"></use></svg>`;

      row.appendChild(handle);
      row.appendChild(emojiInput);
      row.appendChild(nameInput);
      row.appendChild(minsInput);
      row.appendChild(removeBtn);

      DOM.taskList.appendChild(row);
    }

    if (DOM.taskList._sortable) DOM.taskList._sortable.destroy();
    DOM.taskList._sortable = new Sortable(DOM.taskList, {
      handle: ".task-handle",
      animation: 200,
      ghostClass: "sortable-ghost",
      onEnd: () => {
        const byId = new Map(State.tasks.map(t => [t.id, t]));
        const newOrder = Array.from(DOM.taskList.children)
          .map(el => byId.get(el.dataset.taskId))
          .filter(Boolean);
        State.tasks = newOrder;
        Storage.saveTasks(State);
        UI.renderTasks();
      }
    });

    EmojiSizer.fitAll();
  },

  renderRunning() {
    const task = State.tasks[State.currentTaskIndex];
    if (!task) return;

    DOM.displayEmoji.textContent = task.emoji;
    DOM.displayName.textContent = task.name;

    this.updateTimer();
    this.updateETA();
    this.renderProgress();
    this.renderSidePanel();
    this.updatePanelTools();
  },

  updateTimer() {
    const isOT = State.isOvertime;
    const secs = isOT ? State.overtimeSeconds : State.timeLeft;

    const m = Math.floor(secs / 60);
    const s = secs % 60;
    const prefix = isOT ? "+" : "";

    DOM.displayTime.textContent = `${prefix}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    DOM.displayTime.classList.toggle("overtime", isOT);
    DOM.overtimeLabel.classList.toggle("show", isOT);
    DOM.flowIndicator.classList.toggle("show", isOT);
    DOM.forgotBtn.classList.toggle("show", isOT);

    if (DOM.mobileForgotBtn) {
      DOM.mobileForgotBtn.style.display = isOT ? "flex" : "none";
    }
  },

  updateMobilePauseBtn() {
    if (!DOM.mobilePauseIcon || !DOM.mobilePauseLabel) return;

    if (State.isPaused) {
      DOM.mobilePauseIcon.innerHTML = '<use href="#icon-play"></use>';
      DOM.mobilePauseLabel.textContent = "继续";
      DOM.mobilePauseBtn.classList.add("active");
    } else {
      DOM.mobilePauseIcon.innerHTML = '<use href="#icon-pause"></use>';
      DOM.mobilePauseLabel.textContent = "暂停";
      DOM.mobilePauseBtn.classList.remove("active");
    }
  },

  updateETA() {
    DOM.etaProgress.textContent = `${State.currentTaskIndex + 1}/${State.tasks.length}`;

    let remainingSecs = State.isOvertime ? 0 : State.timeLeft;
    for (let i = State.currentTaskIndex + 1; i < State.tasks.length; i++) {
      remainingSecs += (State.tasks[i].mins || 0) * 60;
    }

    const mins = Math.ceil(remainingSecs / 60);
    DOM.etaRemaining.textContent = mins > 0 ? `${mins}分钟` : "即将完成";

    const finishTime = new Date(Date.now() + remainingSecs * 1000);
    DOM.etaFinish.textContent = finishTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  },

  renderProgress() {
    DOM.progressTrack.replaceChildren();

    const totalMins = State.tasks.reduce((a, t) => a + (t.mins || 0), 0) || 1;

    State.tasks.forEach((t, i) => {
      const flex = (t.mins || 1) / totalMins;

      let status = "future";
      let badge = "待完成";
      if (i < State.currentTaskIndex) { status = "completed"; badge = "已完成"; }
      else if (i === State.currentTaskIndex) {
        status = State.isOvertime ? "current overtime" : "current";
        badge = State.isOvertime ? "心流中" : "进行中";
      }

      const seg = document.createElement("div");
      seg.className = `progress-segment ${status}`;
      seg.style.setProperty("--segment-flex", String(flex));
      seg.dataset.index = String(i);

      const emoji = document.createElement("span");
      emoji.className = "segment-emoji";
      emoji.textContent = t.emoji;

      seg.appendChild(emoji);

      if (i === State.currentTaskIndex) {
        const fill = document.createElement("div");
        fill.className = "segment-fill";
        fill.id = "segment-fill";
        seg.appendChild(fill);
      }

      const tooltip = document.createElement("div");
      tooltip.className = "segment-tooltip";

      const title = document.createElement("div");
      title.className = "tooltip-title";
      title.textContent = `${t.emoji} ${t.name}`;

      const time = document.createElement("div");
      time.className = "tooltip-time";
      time.textContent = `计划 ${t.mins} 分钟`;

      const badgeEl = document.createElement("div");
      badgeEl.className = `tooltip-badge ${status.split(" ")[0]}`;
      badgeEl.textContent = badge;

      tooltip.appendChild(title);
      tooltip.appendChild(time);
      tooltip.appendChild(badgeEl);

      seg.appendChild(tooltip);

      DOM.progressTrack.appendChild(seg);
    });

    this.updateProgress();
  },

  updateProgress() {
    const fill = document.getElementById("segment-fill");

    if (fill && !State.isOvertime) {
      const task = State.tasks[State.currentTaskIndex];
      const total = (task?.mins || 1) * 60;
      const elapsed = Math.max(0, total - State.timeLeft);
      fill.style.width = `${Math.min((elapsed / total) * 100, 100)}%`;
    } else if (fill) {
      fill.style.width = "100%";
    }

    const totalMins = State.tasks.reduce((a, t) => a + (t.mins || 0), 0) || 1;
    let completed = 0;

    for (let i = 0; i < State.currentTaskIndex; i++) completed += (State.tasks[i].mins || 0);

    const current = State.tasks[State.currentTaskIndex]?.mins || 0;
    const elapsedMins = State.isOvertime ? current : (current - State.timeLeft / 60);
    completed += Math.max(0, elapsedMins);

    DOM.progressPercent.textContent = `${Math.round((completed / totalMins) * 100)}%`;
  },

  renderSidePanel() {
    const active = State.tasks[State.currentTaskIndex];
    DOM.activeTaskSlot.replaceChildren();
    DOM.futureTaskList.replaceChildren();

    if (!active) return;

    const activeRow = document.createElement("div");
    activeRow.className = "side-task active";

    const aEmoji = document.createElement("span");
    aEmoji.className = "side-task-emoji";
    aEmoji.textContent = active.emoji;

    const aName = document.createElement("span");
    aName.className = "side-task-name";
    aName.textContent = active.name;

    const aEdit = document.createElement("button");
    aEdit.className = "btn-icon";
    aEdit.dataset.action = "edit-task";
    aEdit.dataset.index = String(State.currentTaskIndex);
    aEdit.innerHTML = `<svg class="icon"><use href="#icon-edit"></use></svg>`;

    activeRow.appendChild(aEmoji);
    activeRow.appendChild(aName);
    activeRow.appendChild(aEdit);
    DOM.activeTaskSlot.appendChild(activeRow);

    const futures = State.tasks.slice(State.currentTaskIndex + 1);
    if (futures.length === 0) {
      const last = document.createElement("div");
      last.style.cssText = "color:var(--text-muted);padding:var(--space-md);font-size:0.9rem;";
      last.textContent = "最后一个步骤了 🎉";
      DOM.futureTaskList.appendChild(last);
      return;
    }

    for (let i = 0; i < futures.length; i++) {
      const t = futures[i];
      const realIdx = State.currentTaskIndex + 1 + i;

      const row = document.createElement("div");
      row.className = "side-task";
      row.dataset.taskId = t.id;
      row.dataset.realIndex = String(realIdx);

      const handle = document.createElement("div");
      handle.className = "side-task-handle";
      handle.innerHTML = `<svg class="icon"><use href="#icon-drag"></use></svg>`;

      const e = document.createElement("span");
      e.className = "side-task-emoji";
      e.textContent = t.emoji;

      const n = document.createElement("span");
      n.className = "side-task-name";
      n.textContent = t.name;

      const edit = document.createElement("button");
      edit.className = "btn-icon";
      edit.dataset.action = "edit-task";
      edit.dataset.index = String(realIdx);
      edit.innerHTML = `<svg class="icon"><use href="#icon-edit"></use></svg>`;

      row.appendChild(handle);
      row.appendChild(e);
      row.appendChild(n);
      row.appendChild(edit);

      DOM.futureTaskList.appendChild(row);
    }

    if (DOM.futureTaskList._sortable) DOM.futureTaskList._sortable.destroy();
    DOM.futureTaskList._sortable = new Sortable(DOM.futureTaskList, {
      handle: ".side-task-handle",
      animation: 200,
      ghostClass: "sortable-ghost",
      onEnd: () => {
        const completed = State.tasks.slice(0, State.currentTaskIndex + 1);
        const byId = new Map(State.tasks.map(t => [t.id, t]));
        const newFutures = Array.from(DOM.futureTaskList.querySelectorAll(".side-task"))
          .map(el => byId.get(el.dataset.taskId))
          .filter(Boolean);

        State.tasks = [...completed, ...newFutures];
        Storage.saveTasks(State);

        UI.renderProgress();
        UI.renderSidePanel();
        UI.updateETA();
      }
    });
  },

  renderLog() {
    let md = `### 📅 Routine 执行日志 (${new Date().toLocaleDateString()})\n\n`;

    if (State.logMode === "table") {
      md += `| 状态 | 环节 | 开始 | 结束 | 计划 | 实际 | 超时 | 暂停 | 分心 |\n`;
      md += `| :--: | :-- | :--: | :--: | :--: | :--: | :--: | :--: | :--: |\n`;

      State.logs.forEach(l => {
        let status = "✅";
        if (l.aborted) status = "⏹️";
        else if (l.distracted) status = "😅";
        else if (l.overtime) status = "🌊";

        md += `| ${status} | ${l.emoji} ${l.name} | ${l.start} | ${l.end || "-"} | ${l.planned}m | ${l.actual ?? "-"}m | ${l.overtimeMins > 0 ? "+" + l.overtimeMins + "m" : "-"} | ${l.pauses > 0 ? l.pauses + "次" : "-"} | ${l.distracted ? l.distractedMins + "m" : "-"} |\n`;
      });
    } else {
      State.logs.forEach((l, i) => {
        let status = "✅";
        if (l.aborted) status = "⏹️";
        else if (l.distracted) status = "😅";
        else if (l.overtime) status = "🌊";

        md += `${i + 1}. ${status} ${l.start} **${l.emoji} ${l.name}**\n`;
        md += `   - 结束: ${l.end || "-"} | 计划: ${l.planned}m | 实际: ${l.actual ?? "-"}m\n`;
        if (l.pauses > 0) md += `   - 暂停: ${l.pauses}次\n`;
        if (l.distracted) md += `   - 分心: ${l.distractedMins}m\n`;
        if (l.overtime) md += `   - 心流超时: +${l.overtimeMins}m\n`;
        if (l.aborted) md += `   - 状态: 已中止\n`;
        md += `\n`;
      });
    }

    if (State.flashes.length > 0) {
      md += `\n---\n### 💭 闪念记录\n`;
      State.flashes.forEach((f, i) => {
        const taskLabel = f.task ? `（${f.task}）` : "";
        md += `- ${f.time} ${taskLabel} ${f.text}\n`;
      });
    }

    const totalPlanned = State.logs.reduce((a, l) => a + (l.planned || 0), 0);
    const totalActual = State.logs.reduce((a, l) => a + (Number(l.actual) || 0), 0);
    const flowCount = State.logs.filter(l => l.overtime && !l.distracted).length;
    const distractCount = State.logs.filter(l => l.distracted).length;

    md += `\n---\n**📊 统计**\n`;
    md += `- 完成: ${State.logs.length} 步骤\n`;
    md += `- 时间: 计划 ${totalPlanned}m / 实际 ${Math.round(totalActual)}m\n`;
    if (flowCount > 0) md += `- 🌊 心流: ${flowCount} 次\n`;
    if (distractCount > 0) md += `- 😅 分心: ${distractCount} 次\n`;

    DOM.logContent.textContent = md;
  }
};

export { UI, EmojiSizer, DOM, cacheDOM };