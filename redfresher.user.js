// ==UserScript==
// @name        RedFresher
// @description Adds refresh page button to website (originally created for Redmine Task Tracker)
// @author      kosmotema
// @namespace   kosmotema.dev
// @license     Mozilla Public License 2.0
// @downloadURL https://raw.github.com/kosmotema/redfresher/main/redfresher.user.js
// @homepageURL https://github.com/kosmotema/redfresher
// @version     2.6.1
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

  function lsUpdateState() {
    if (timeout) {
      ls.set(LS_STATE_KEY, String(timeout));
    } else {
      ls.remove(LS_STATE_KEY);
    }
  }

  function startTimer() {
    timeout = setTimeout(
      () => location.reload(),
      7500 + Math.round(Math.random() * 2500)
    );
  }

  function stopTimer() {
    clearTimeout(timeout);
    timeout = null;
  }

  function toggleTimerWithLS() {
    if (timeout) {
      stopTimer();
    } else {
      startTimer();
    }
    lsUpdateState();
  }

  const timerPauseToggle = (function () {
    let state;

    return () => {
      if (!!timeout) {
        stopTimer();
        state = true;
      } else if (state) {
        startTimer();
        state = false;
      }
    };
  })();

  if (ls.get(LS_STATE_KEY)) {
    startTimer();
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
  --image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='${SIZE}px' viewBox='0 0 24 24' width='${SIZE}px' fill='%23000000'%3E%3Cpath d='M0 0h24v24H0V0z' fill='none'/%3E%3Cpath d='M17.65 6.35c-1.63-1.63-3.94-2.57-6.48-2.31-3.67.37-6.69 3.35-7.1 7.02C3.52 15.91 7.27 20 12 20c3.19 0 5.93-1.87 7.21-4.56.32-.67-.16-1.44-.9-1.44-.37 0-.72.2-.88.53-1.13 2.43-3.84 3.97-6.8 3.31-2.22-.49-4.01-2.3-4.48-4.52C5.31 9.44 8.26 6 12 6c1.66 0 3.14.69 4.22 1.78l-1.51 1.51c-.63.63-.19 1.71.7 1.71H19c.55 0 1-.45 1-1V6.41c0-.89-1.08-1.34-1.71-.71l-.64.65z'/%3E%3C/svg%3E\");
  
  -webkit-mask-image: var(--image);
  mask-image: var(--image);
  background-color: darkgray;
  position: fixed;
  width: ${SIZE}px;
  height: ${SIZE}px;
  left: ${adjustLeft(ls.get(LS_LEFT_KEY) ?? 0)}px;
  top: ${adjustTop(ls.get(LS_TOP_KEY) ?? Infinity)}px;
  cursor: pointer;
  border: none;
}

.${BUTTON_CLASS_NAME}_active {
  background-color: green;
}

.${BUTTON_CLASS_NAME}_moving {
  background-color: white;
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
}
`);

  const bg = document.createElement('div');
  bg.setAttribute('class', BG_CLASS_NAME);

  const bgText = document.createElement('h1');
  bgText.textContent = 'Перемещайте кнопку внутри этой области';
  bgText.setAttribute('class', BG_CLASS_NAME + '__text');
  bg.append(bgText);

  const element = document.createElement('span'); // button is not draggable in Firefox
  element.setAttribute('class', BUTTON_CLASS_NAME);
  element.setAttribute('draggable', 'true');
  element.setAttribute('role', 'button');

  function colorize() {
    element.classList.toggle(BUTTON_CLASS_NAME + '_active', !!timeout);
  }

  function titlify() {
    element.title =
      'Авто-обновление страницы ' + (timeout ? 'включено' : 'выключено');
  }

  titlify();
  colorize();

  element.addEventListener('click', () => {
    toggleTimerWithLS();
    titlify();
    colorize();
  });

  element.addEventListener('dragstart', (event) => {
    timerPauseToggle();

    event.dataTransfer.effectAllowed = 'move';

    element.classList.add(BUTTON_CLASS_NAME + '_moving');
    bg.classList.add(BG_CLASS_NAME + '_active');
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

    timerPauseToggle();

    element.classList.remove(BUTTON_CLASS_NAME + '_moving');
    bg.classList.remove(BG_CLASS_NAME + '_active');
  });

  document.body.append(bg, element);
})();
