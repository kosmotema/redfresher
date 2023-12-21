// ==UserScript==
// @name        RedFresher
// @description Adds refresh page button to website (originally created for Redmine Task Tracker)
// @author      kosmotema
// @namespace   kosmotema.dev
// @license     Mozilla Public License 2.0
// @downloadURL https://raw.github.com/kosmotema/redfresher/main/redfresher.user.js
// @updateURL   https://raw.github.com/kosmotema/redfresher/main/redfresher.user.js
// @homepageURL https://github.com/kosmotema/redfresher
// @version     3.1.0
// @grant       GM_addStyle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const LS_STATE_KEY = 'redfresher-status';
  const LS_LEFT_KEY = 'redfresher-left';
  const LS_TOP_KEY = 'redfresher-top';

  const SIZE = 24;

  const X_GAP = SIZE;
  const Y_GAP = SIZE / 2;

  function randomString() {
    return Math.random().toString(16).substring(2);
  }

  const BUTTON_CLASS_NAME = 'redfresher-button-' + randomString();
  const BG_CLASS_NAME = 'redfresher-bg-' + randomString();

  let timeout;

  const ls = {
    get: (key) => {
      return localStorage.getItem(key);
    },
    set: (key, value) => {
      localStorage.setItem(key, value);
    },
    remove: (key) => {
      localStorage.removeItem(key);
    },
  };

  function isActive() {
    return !!timeout;
  }

  function isSuspended() {
    return timeout === false;
  }

  function updateLocalStorageState() {
    if (isSuspended()) {
      return;
    }

    if (isActive()) {
      ls.set(LS_STATE_KEY, 'enabled');
    } else {
      ls.remove(LS_STATE_KEY);
    }
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function adjustLeft(left) {
    return clamp(
      +left,
      X_GAP,
      document.documentElement.clientWidth - SIZE - X_GAP
    );
  }

  function adjustTop(top) {
    return clamp(
      +top,
      Y_GAP,
      document.documentElement.clientHeight - SIZE - Y_GAP
    );
  }

  GM_addStyle(`
.${BUTTON_CLASS_NAME} {
  color: darkgray;
  position: fixed;
  width: ${SIZE}px;
  height: ${SIZE}px;
  left: ${adjustLeft(ls.get(LS_LEFT_KEY) ?? 0)}px;
  top: ${adjustTop(ls.get(LS_TOP_KEY) ?? Infinity)}px;
  cursor: pointer;
  border-radius: 4px;

  transition: color 0.3s ease;
}

.${BUTTON_CLASS_NAME}_active {
  color: green;
}

.${BUTTON_CLASS_NAME}_paused {
  color: orange;
}

.${BUTTON_CLASS_NAME}_moving {
  background-color: white;
}

.${BUTTON_CLASS_NAME}__icon {
  width: 100%;
  height: 100%;
}

.${BG_CLASS_NAME} {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  visibility: hidden;
  opacity: 0;
  background-color: #0008;
  display: flex;
  transition: opacity 0.25s;
  border: solid #0004;
  border-top-width: ${Y_GAP}px;
  border-left-width: ${X_GAP}px;
  border-right-width: ${X_GAP}px;
  border-bottom-width: ${Y_GAP}px;
}

.${BG_CLASS_NAME}_active {
  visibility: visible;
  opacity: 1;
}

.${BG_CLASS_NAME}__text {
  color: white;
  margin: auto;

  font-size: 1.5rem;
  font-weight: 500;
}
`);

  const bg = document.createElement('div');
  bg.className = BG_CLASS_NAME;

  const bgText = document.createElement('p');
  bgText.textContent = 'Перемещайте кнопку внутри этой области';
  bgText.className = BG_CLASS_NAME + '__text';
  bg.append(bgText);

  // NOTE: button is not draggable in Firefox
  const element = document.createElement('span');
  element.className = BUTTON_CLASS_NAME;
  element.setAttribute('draggable', 'true');
  element.setAttribute('role', 'button');
  element.setAttribute('tabindex', '0');
  element.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' class='${BUTTON_CLASS_NAME}__icon'><path d='M17.65 6.35c-1.63-1.63-3.94-2.57-6.48-2.31-3.67.37-6.69 3.35-7.1 7.02C3.52 15.91 7.27 20 12 20c3.19 0 5.93-1.87 7.21-4.56.32-.67-.16-1.44-.9-1.44-.37 0-.72.2-.88.53-1.13 2.43-3.84 3.97-6.8 3.31-2.22-.49-4.01-2.3-4.48-4.52C5.31 9.44 8.26 6 12 6c1.66 0 3.14.69 4.22 1.78l-1.51 1.51c-.63.63-.19 1.71.7 1.71H19c.55 0 1-.45 1-1V6.41c0-.89-1.08-1.34-1.71-.71l-.64.65z' fill='currentcolor'/></svg>`;

  const BUTTON_CLASSES = {
    active: BUTTON_CLASS_NAME + '_active',
    suspended: BUTTON_CLASS_NAME + '_suspended',
    moving: BUTTON_CLASS_NAME + '_moving',
  };

  const BG_CLASSES = {
    active: BG_CLASS_NAME + '_active',
  };

  function onTimeoutChange() {
    element.classList.toggle(BUTTON_CLASSES.active, isActive());
    element.classList.toggle(BUTTON_CLASSES.suspended, isSuspended());

    element.title =
      'Авто-обновление страницы ' +
      (isActive()
        ? 'включено'
        : isSuspended()
        ? 'приостановлено'
        : 'выключено');
  }

  function startTimer() {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(
      () => location.reload(),
      7500 + Math.round(Math.random() * 2500)
    );

    onTimeoutChange();
  }

  function stopTimer() {
    clearTimeout(timeout);
    timeout = null;

    onTimeoutChange();
  }

  function suspendTimer() {
    clearTimeout(timeout);
    timeout = false;

    onTimeoutChange();
  }

  function toggleTimer() {
    if (isActive()) {
      stopTimer();
    } else {
      startTimer();
    }
  }

  const { startPause, endPause } = (function () {
    let wasActive = false;
    let isPaused = false;

    return {
      startPause: () => {
        if (isPaused) {
          return;
        }

        isPaused = true;
        wasActive = isActive();
        stopTimer();
      },

      endPause: () => {
        if (!isPaused) {
          return;
        }

        isPaused = false;

        if (wasActive) {
          startTimer();
          wasActive = false;
        }
      },
    };
  })();

  if (ls.get(LS_STATE_KEY)) {
    startTimer();
  }

  function handleAction(event) {
    event.stopPropagation();

    if (!isActive() && ls.get(LS_STATE_KEY)) {
      startTimer();
      element.classList.remove(BUTTON_CLASSES.suspended);
    } else {
      toggleTimer();
      updateLocalStorageState();
    }
  }

  element.addEventListener('click', handleAction);
  element.addEventListener('keyup', (event) => {
    if (event.code === 'Enter' || event.code === 'Space') {
      handleAction(event);
    }
  });

  element.addEventListener('dragstart', (event) => {
    startPause();

    event.dataTransfer.effectAllowed = 'move';

    element.classList.add(BUTTON_CLASSES.moving);
    bg.classList.add(BG_CLASSES.active);
  });

  bg.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  });

  bg.addEventListener('drop', (event) => {
    event.preventDefault();

    const left = adjustLeft(event.clientX - SIZE / 2);
    const top = adjustTop(event.clientY - SIZE / 2);

    ls.set(LS_LEFT_KEY, left);
    ls.set(LS_TOP_KEY, top);

    element.style.setProperty('left', `${left}px`);
    element.style.setProperty('top', `${top}px`);
  });

  element.addEventListener('dragend', (event) => {
    event.preventDefault();

    endPause();

    element.classList.remove(BUTTON_CLASSES.moving);
    bg.classList.remove(BG_CLASSES.active);
  });

  document.body.append(bg, element);

  document.addEventListener('click', () => {
    if (!isActive()) {
      return;
    }

    suspendTimer();
  });

  window.addEventListener('storage', ({ key, newValue }) => {
    if (key === null) {
      stopTimer();

      return;
    }

    if (key !== LS_STATE_KEY) {
      return;
    }

    // TODO: do we need to toggle suspended state?
    if (isSuspended()) {
      return;
    }

    if (newValue === null) {
      stopTimer();
    } else {
      startTimer();
    }
  });
})();
