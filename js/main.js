import { State } from './utils.js';
import { Storage } from './storage.js';
import { UI, EmojiSizer, DOM } from './ui.js';
import { App } from './app.js';
import { Timer, Chime } from './timer.js';

// ==================== Events ====================
function setupEvents() {
  document.addEventListener("click", (e) => {
    const actionEl = e.target.closest("[data-action]");
    const action = actionEl?.dataset.action;
    if (!action) return;

    switch (action) {
      case "start": App.startRoutine(); break;
      case "add-task": App.addTask(); break;
      case "remove-task": App.removeTaskById(actionEl.dataset.id); break;

      case "export": App.exportConfig(); break;
      case "import": DOM.fileInput.click(); break;
      case "import-clipboard": App.importFromClipboard(); break;

      case "save-preset":
        DOM.saveModal.classList.add("show");
        DOM.presetNameInput.value = "";
        DOM.presetNameInput.focus();
        break;
      case "cancel-save":
        DOM.saveModal.classList.remove("show");
        break;
      case "confirm-save": {
        const name = DOM.presetNameInput.value.trim();
        if (!name) { UI.toast("请输入名称", "error"); break; }
        App.savePreset(name);
        DOM.saveModal.classList.remove("show");
        break;
      }

      case "load-preset":
        App.loadPreset(actionEl.dataset.id);
        break;
      case "delete-preset":
        App.deletePreset(actionEl.dataset.id);
        break;

      case "pause": App.togglePause(); break;
      case "complete": App.completeTask(); break;

      case "forgot":
        DOM.distractionModal.classList.add("show");
        DOM.customDistractionInput.value = "";
        DOM.customDistractionInput.focus();
        break;
      case "cancel-distraction":
        DOM.distractionModal.classList.remove("show");
        break;
      case "apply-custom-distraction": {
        const mins = Utils.clampInt(DOM.customDistractionInput.value, 1, 999);
        if (mins > 0) {
          DOM.distractionModal.classList.remove("show");
          App.applyDistraction(mins);
        } else {
          UI.toast("请输入有效的分钟数", "error");
        }
        break;
      }

      case "stop": App.stopRoutine(); break;
      case "close-panel": App.closePanel(); break;

      case "mobile-pause": App.togglePause(); break;
      case "mobile-menu": App.togglePanel(); break;
      case "mobile-forgot":
        DOM.distractionModal.classList.add("show");
        DOM.customDistractionInput.value = "";
        break;

      case "edit-task":
        App.editTask(Number.parseInt(actionEl.dataset.index, 10));
        break;

      case "copy-log":
        navigator.clipboard.writeText(DOM.logContent.textContent);
        UI.toast("已复制 Markdown 日志！");
        break;

      case "restart":
        location.reload();
        break;

      case "open-flash":
        App.openFlash();
        break;
      case "cancel-flash":
        DOM.flashModal.classList.remove("show");
        break;
      case "save-flash":
        App.saveFlash();
        break;
      case "toggle-chime": {
        const msg = Chime.cycle();
        Storage.saveChime(State);
        UI.toast(State.chimeMins > 0 ? `敲钟已开启：每 ${State.chimeMins} 分钟一次` : msg, State.chimeMins > 0 ? "success" : "error");
        UI.updatePanelTools();
        break;
      }
    }
  });

  DOM.distractionGrid.addEventListener("click", (e) => {
    const option = e.target.closest(".distraction-option");
    if (!option) return;
    DOM.distractionModal.classList.remove("show");
    App.applyDistraction(Utils.clampInt(option.dataset.mins, 1, 999));
  });

  DOM.panelTrigger.addEventListener("click", () => App.togglePanel());

  if (DOM.panelOverlay) {
    DOM.panelOverlay.addEventListener("click", () => App.closePanel());
  }

  DOM.taskList.addEventListener("input", (e) => {
    const input = e.target;
    const field = input.dataset.field;
    if (!field) return;

    const row = input.closest(".task-item");
    const taskId = row?.dataset.taskId;
    if (!taskId) return;

    App.updateTaskById(taskId, field, input.value);

    if (field === "emoji") EmojiSizer.fit(input);
  });

  DOM.taskList.addEventListener("change", (e) => {
    const input = e.target;
    if (input.dataset.field !== "mins") return;

    const row = input.closest(".task-item");
    const taskId = row?.dataset.taskId;
    if (!taskId) return;

    App.updateTaskById(taskId, "mins", input.value);
    const t = State.tasks.find(x => x.id === taskId);
    input.value = String(t?.mins ?? 1);
  });

  DOM.fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      App.importConfig(e.target.files[0]);
      e.target.value = "";
    }
  });

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      State.logMode = btn.dataset.tab;
      UI.renderLog();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      DOM.saveModal.classList.remove("show");
      DOM.distractionModal.classList.remove("show");
      DOM.flashModal.classList.remove("show");
    }
    if (e.key === "Enter" && DOM.saveModal.classList.contains("show")) {
      document.querySelector('[data-action="confirm-save"]').click();
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && DOM.flashModal.classList.contains("show")) {
      document.querySelector('[data-action="save-flash"]').click();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && State.isRunning && !State.isPaused) Timer.tick();
  });
}

// ==================== Init ====================
function init() {
  cacheDOM();
  Storage.load(State);
  UI.renderTasks();
  UI.renderPresets();
  UI.updatePanelTools();
  setupEvents();
}

document.addEventListener("DOMContentLoaded", init);

// Re-export Utils for use in event handlers
export { Utils } from './utils.js';