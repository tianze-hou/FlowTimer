import { State } from './utils.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';

// ==================== Chime (active-time based) ====================
const Chime = {
  cycle() {
    const order = [0, 15, 30, 60];
    const idx = order.indexOf(State.chimeMins);
    State.chimeMins = order[(idx + 1 + order.length) % order.length];
    // Storage.saveChime(State) called by App

    if (State.isRunning) {
      if (State.chimeMins > 0) {
        State.nextChimeAtActiveSeconds = State.routineActiveSeconds + State.chimeMins * 60;
        Audio.playChime();
        return `敲钟已开启：每 ${State.chimeMins} 分钟一次`;
      } else {
        State.nextChimeAtActiveSeconds = null;
        return "敲钟已关闭";
      }
    } else {
      return State.chimeMins > 0 ? `敲钟：${State.chimeMins} 分钟` : "敲钟：关闭";
    }
  },

  tick(nowMs) {
    if (!State.isRunning) return;
    if (State.isPaused) return;
    if (!State.chimeMins || State.chimeMins <= 0) return;
    if (!Number.isFinite(State.nextChimeAtActiveSeconds)) return;

    if (State.lastActiveUpdate) {
      const dt = Math.max(0, (nowMs - State.lastActiveUpdate) / 1000);
      State.routineActiveSeconds += dt;
      State.lastActiveUpdate = nowMs;
    } else {
      State.lastActiveUpdate = nowMs;
    }

    const intervalSec = State.chimeMins * 60;
    let guard = 0;
    while (State.routineActiveSeconds >= State.nextChimeAtActiveSeconds && guard++ < 5) {
      Audio.playChime();
      State.nextChimeAtActiveSeconds += intervalSec;
    }
  },

  syncActiveOnPauseToggle(isPausing) {
    const now = Date.now();
    if (isPausing) {
      if (State.lastActiveUpdate) {
        State.routineActiveSeconds += Math.max(0, (now - State.lastActiveUpdate) / 1000);
      }
      State.lastActiveUpdate = now;
    } else {
      State.lastActiveUpdate = now;
    }
  },

  initForRoutineStart() {
    State.routineActiveSeconds = 0;
    State.lastActiveUpdate = Date.now();
    if (State.chimeMins > 0) {
      State.nextChimeAtActiveSeconds = State.chimeMins * 60;
    } else {
      State.nextChimeAtActiveSeconds = null;
    }
  },

  endRoutine() {
    State.lastActiveUpdate = null;
    State.nextChimeAtActiveSeconds = null;
  }
};

// ==================== Timer (timestamp-based) ====================
const Timer = {
  intervalId: null,

  start() {
    this.stop();
    this.tick();
    this.intervalId = window.setInterval(() => this.tick(), 1000);
  },

  tick() {
    if (!State.isRunning) return;
    if (State.isPaused) return;

    const task = State.tasks[State.currentTaskIndex];
    if (!task) return;

    const startTime = State.taskStats.startTime;
    if (!startTime) return;

    Chime.tick(Date.now());

    const totalElapsed = (Date.now() - startTime) / 1000;
    const activeElapsed = totalElapsed - (State.taskStats.pauseDuration || 0);

    const taskTotalSeconds = (task.mins || 1) * 60;
    const remaining = taskTotalSeconds - activeElapsed;

    if (remaining > 0) {
      State.timeLeft = Math.ceil(remaining);
      State.isOvertime = false;
    } else {
      if (!State.isOvertime) {
        State.isOvertime = true;
        Audio.play();
      }
      State.overtimeSeconds = Math.floor(Math.abs(remaining));
    }

    UI.updateTimer();
    UI.updateProgress();
    UI.updateETA();
  },

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
};

export { Timer, Chime };