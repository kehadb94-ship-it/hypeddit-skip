// popup.js

document.addEventListener('DOMContentLoaded', () => {
  // Make header clickable to open a website
  const header = document.getElementById('header-link');
  if (header) {
    header.addEventListener('click', () => {
      browser.tabs.create({ url: 'https://www.hypeddit.com/' });
    });
  }
  const emailInput = document.getElementById('email');
  const nameInput = document.getElementById('name');
  const commentInput = document.getElementById('comment');
  const startBtn = document.getElementById('start-btn');
  const logArea = document.getElementById('log');
  const autoTriggerToggle = document.getElementById('auto-trigger-toggle');
  // Sync toggle with storage
  function restoreAutoTrigger() {
    browser.storage.local.get('hypeddit_auto_trigger').then((result) => {
      if (autoTriggerToggle) {
        autoTriggerToggle.checked = !!result.hypeddit_auto_trigger;
      }
    });
  }
  
  // Delay input wiring for popup
  const delayInput = document.getElementById('delay-input');
  if (delayInput) {
    // Load saved delay (in seconds)
    browser.storage.local.get('delaySeconds').then(({ delaySeconds }) => {
      if (typeof delaySeconds === 'number' && !isNaN(delaySeconds)) {
        delayInput.value = delaySeconds.toFixed(1);
      }
    });
  
    // Save delay on change (as float seconds)
    delayInput.addEventListener('input', async () => {
      let val = parseFloat(delayInput.value);
      if (isNaN(val)) val = 1.0;
      await browser.storage.local.set({ delaySeconds: val });
    });

    // Format to 1 decimal place on blur (when user finishes editing)
    delayInput.addEventListener('blur', () => {
      let val = parseFloat(delayInput.value);
      if (isNaN(val)) val = 1.0;
      delayInput.value = val.toFixed(1);
    });
  }

  function saveAutoTrigger() {
    if (autoTriggerToggle) {
      browser.storage.local.set({ hypeddit_auto_trigger: autoTriggerToggle.checked });
    }
  }
  if (autoTriggerToggle) {
    restoreAutoTrigger();
    autoTriggerToggle.addEventListener('change', saveAutoTrigger);
  }

  function log(msg) {
    if (logArea) logArea.textContent += msg + '\n';
  }

  function clearLog() {
    if (logArea) logArea.textContent = '';
  }

  function saveUserInfo() {
    const info = {
      email: emailInput.value,
      name: nameInput.value,
      comment: commentInput.value
    };
    browser.storage.local.set({ userInfo: info });
  }

  function restoreUserInfo() {
    browser.storage.local.get('userInfo').then((result) => {
      if (result.userInfo) {
        emailInput.value = result.userInfo.email ?? 'youremailhere@gmail.com';
        nameInput.value = result.userInfo.name ?? 'Your Name Here';
        commentInput.value = result.userInfo.comment ?? 'Nice!';
      } else {
        emailInput.value = 'youremailhere@gmail.com';
        nameInput.value = 'Your Name Here';
        commentInput.value = 'Nice!';
      }
    });
  }

  function isHypedditUrl(url) {
    return url && url.match(/^https?:\/\/(www\.)?hypeddit\.com\//i);
  }

  async function checkTabAndSetButton() {
    let tabUrl = '';
    let tabId = null;
    const [tab] = await browser.tabs.query({active: true, currentWindow: true});
    tabUrl = tab && tab.url;
    tabId = tab && tab.id;
    if (isHypedditUrl(tabUrl) && tabId) {
      // Ask content script for all gate check logs and status
      const resp = await new Promise((resolve) => {
        browser.tabs.sendMessage(tabId, {type: 'HYPEDDIT_SKIP_GATE_LOGS'}, resolve);
      });
      if (resp && Array.isArray(resp.logs)) {
        // Don't log the detailed gate checks to keep popup clean
        // resp.logs.forEach(l => log(l));
      }
      if (resp && resp.isGate) {
        startBtn.disabled = false;
        log('Ready on Hypeddit download gate.');
      } else {
        startBtn.disabled = true;
        log('Not on a download gate.');
      }
    } else {
      startBtn.disabled = true;
      log('Not a Hypeddit page.');
    }
  }

  if (emailInput && nameInput && commentInput) {
    emailInput.addEventListener('input', saveUserInfo);
    nameInput.addEventListener('input', saveUserInfo);
    commentInput.addEventListener('input', saveUserInfo);
    restoreUserInfo();
  }

  checkTabAndSetButton();

  startBtn.addEventListener('click', async () => {
    clearLog();
    // Flash effect
    startBtn.classList.add('flash');
    setTimeout(() => {
      startBtn.classList.remove('flash');
    }, 150);
    const [tab] = await browser.tabs.query({active: true, currentWindow: true});
    const tabUrl = tab && tab.url;
    const tabId = tab && tab.id;
    if (isHypedditUrl(tabUrl) && tabId) {
      // Get user input values
      const emailValue = emailInput.value;
      const nameValue = nameInput.value;
      const commentValue = commentInput.value;
      browser.tabs.sendMessage(tabId, {
        type: 'HYPEDDIT_SKIP_START',
        email: emailValue,
        name: nameValue,
        comment: commentValue
      });
      log('Skipping download gate.');
    } else {
      log('Not a Hypeddit download gate.');
    }
  });

  // Listen for log messages from the content script
  if (browser && browser.runtime && browser.runtime.onMessage) {
    browser.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'HYPEDDIT_SKIP_LOG') {
        log(msg.text);
      }
    });
  }
});


