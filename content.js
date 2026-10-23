
console.log('[Hypeddit Skip] content.js injected! Current URL:', window.location.href);

// --- Auto-trigger logic: check storage for auto-trigger setting and run automation if enabled ---
if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
  browser.storage.local.get('hypeddit_auto_trigger').then((result) => {
    if (result.hypeddit_auto_trigger) {
      // Check silently without logging to popup
      const logs = [];
      let result = true;
      
      const hasSpotifyPage = document.body.classList.contains('spotify-page');
      if (!hasSpotifyPage) result = false;
      
      const hasArcadeGate = !!document.getElementById('arcadegateOnDownload');
      if (!hasArcadeGate) result = false;
      
      const downloadBtn = document.getElementById('downloadProcess');
      const hasDownloadBtn = !!downloadBtn && /download/i.test(downloadBtn.textContent);
      if (!hasDownloadBtn) result = false;
      
      if (result) {
        logToConsole('Auto-trigger enabled. Running automation on page load.');
        // Use default values for name/email/comment
        handleMessage({ type: 'HYPEDDIT_SKIP_START' }, null, null);
      }
    }
  });
}

// --- Hypeddit SoundCloud Gate: Set flag before opening SoundCloud auth ---
// This runs on the Hypeddit gate page. Adjust selector if needed.
const scGateBtn = document.getElementById('login_to_sc');
if (scGateBtn) {
  scGateBtn.addEventListener('click', () => {
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
      browser.storage.local.set({ hypeddit_sc_auth_next: true });
      console.log('[Hypeddit Skip] Set flag: hypeddit_sc_auth_next = true');
    }
  }, { once: true });
}
// --- SoundCloud Auth Auto-Click (only if flagged by Hypeddit gate) ---
if (window.location.href.includes('secure.soundcloud.com/authorize')) {
  if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
    browser.storage.local.get('hypeddit_sc_auth_next').then((result) => {
      if (result.hypeddit_sc_auth_next) {
        console.log('[Hypeddit Skip] SoundCloud auth page detected and flag set:', window.location.href);
        // Clear the flag immediately so it only works for this tab
        browser.storage.local.remove('hypeddit_sc_auth_next');
        function clickAuthButtonIfPresent() {
          try {
            const btn = document.getElementById('submit_approval');
            console.log('[Hypeddit Skip] Auth button found:', !!btn);
            if (btn) {
              btn.click();
              console.log('[Hypeddit Skip] SoundCloud auth button auto-clicked successfully.');
              return true;
            }
            return false;
          } catch (err) {
            console.error('[Hypeddit Skip] Error clicking auth button:', err);
            return false;
          }
        }

        // Try immediately in case the button is already present
        if (!clickAuthButtonIfPresent()) {
          console.log('[Hypeddit Skip] Button not found initially, setting up observers...');
          // Observe DOM for the button if not found
          const observer = new MutationObserver((mutations) => {
            console.log('[Hypeddit Skip] DOM mutation detected');
            if (clickAuthButtonIfPresent()) {
              observer.disconnect();
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
          // Also try again after DOMContentLoaded just in case
          document.addEventListener('DOMContentLoaded', () => {
            console.log('[Hypeddit Skip] DOMContentLoaded fired');
            clickAuthButtonIfPresent();
          });
        }
      } else {
        console.log('[Hypeddit Skip] SoundCloud auth page detected, but flag not set. No auto-click.');
      }
    });
  }
}

// Adjustable wait time (ms) before each automation step, loaded from storage
let WAIT_TIME_MS = 1000; // default 1s
if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
  browser.storage.local.get('delaySeconds').then(({ delaySeconds }) => {
    if (typeof delaySeconds === 'number' && !isNaN(delaySeconds) && delaySeconds > 0) {
      WAIT_TIME_MS = delaySeconds * 1000;
      console.log('[Hypeddit Skip] WAIT_TIME_MS set from storage:', WAIT_TIME_MS);
    }
  });
}
// This script will automate Hypeddit gates when triggered


function logToConsole(msg, sendToPopup = true) {
  console.log('[Hypeddit Skip]', msg);
  if (sendToPopup) {
    sendLogToPopup(msg);
  }
}

function handleMessage(msg, sender, sendResponse) {
  if (msg.type === 'HYPEDDIT_SKIP_IS_GATE') {
    const isGate = isDownloadPortal();
    if (sendResponse) sendResponse({isGate});
    return true;
  }
  if (msg.type === 'HYPEDDIT_SKIP_GATE_LOGS') {
    // Run all checks and return logs as array
    const { isGate, logs } = isDownloadPortal(true);
    if (sendResponse) sendResponse({logs, isGate});
    return true;
  }
  if (msg.type === 'HYPEDDIT_SKIP_START') {
    if (isDownloadPortal()) {
      //logToConsole('Download portal detected. Ready to automate.');

      function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      const userName = msg.name || 'Your Name Here';
      const userEmail = msg.email || 'youremailhere@gmail.com';
      const userComment = msg.comment || 'Nice!';

      (async () => {
        // Wait for WAIT_TIME_MS to be loaded from storage if needed
        if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
          const { delaySeconds } = await browser.storage.local.get('delaySeconds');
          if (typeof delaySeconds === 'number' && !isNaN(delaySeconds) && delaySeconds > 0) {
            WAIT_TIME_MS = delaySeconds * 1000;
            console.log('[Hypeddit Skip] WAIT_TIME_MS set from storage (runtime):', WAIT_TIME_MS);
          }
        }

        // Step 1: Try clicking the main download button
        const downloadBtn = document.getElementById('downloadProcess');
        if (downloadBtn) {
          await wait(WAIT_TIME_MS);
          downloadBtn.click();
          logToConsole('Download button clicked.', false); // Console only
        }

        // Step 2: Try filling email/name and clicking the email download button
        const nameInput = document.getElementById('email_name');
        const emailInput = document.getElementById('email_address');
        const emailBtn = document.getElementById('email_to_downloads_next');
        if (nameInput && emailInput && emailBtn) {
          await wait(WAIT_TIME_MS);
          nameInput.value = userName;
          emailInput.value = userEmail;
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          await wait(WAIT_TIME_MS);
          emailBtn.click();
          logToConsole('Email skipped.'); // Keep this one for user feedback
        }

        // Step 3: Try clicking the SoundCloud connect button and handle popup
        const scBtn = document.getElementById('login_to_sc');
        if (scBtn) {
          await wait(WAIT_TIME_MS);
          // Fill SoundCloud comment field if present
          const scCommentInput = document.getElementById('sc_comment_text');
          if (scCommentInput) {
            scCommentInput.value = userComment;
            scCommentInput.dispatchEvent(new Event('input', { bubbles: true }));
            logToConsole('Filled SoundCloud comment field.', false); // Console only
          }
          await wait(WAIT_TIME_MS);
          // Click the SoundCloud connect button (popup will be handled by background script)
          scBtn.click();
          logToConsole('SoundCloud skipped'); // Keep for user feedback
        }

        // Step 4: Click the Spotify connect button if present
        const spotifyBtn = document.getElementById('login_to_sp');
        if (spotifyBtn) {
          await wait(WAIT_TIME_MS);
          spotifyBtn.click();
          logToConsole('Spotify skipped.'); // Keep for user feedback
          await wait(WAIT_TIME_MS); // Wait after click
        }

        // Step 5: Click the final download button if present
        const gateDownloadBtn = document.getElementById('gateDownloadButton');
        await wait(WAIT_TIME_MS*2);
        if (gateDownloadBtn) {
          gateDownloadBtn.click();
          logToConsole('Download started!'); // Keep this important one
        }

        //logToConsole('Automation sequence complete.');
      })();
    } else {
      logToConsole('Not a download portal.');
      sendLogToPopup('This is not a Hypeddit download portal.');
    }
    return true;
  }
}

if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.onMessage) {
  browser.runtime.onMessage.addListener(handleMessage);
}

function isDownloadPortal(returnLogs = false) {
  const logs = [];
  let result = true;
  
  // Check 1: body class
  const hasSpotifyPage = document.body.classList.contains('spotify-page');
  const spotifyCheck = 'Check body.spotify-page: ' + hasSpotifyPage;
  if (returnLogs) logs.push(spotifyCheck);
  else console.log('[Hypeddit Skip]', spotifyCheck); // Console only, no popup
  if (!hasSpotifyPage) result = false;

  // Check 2: arcadegateOnDownload
  const hasArcadeGate = !!document.getElementById('arcadegateOnDownload');
  const arcadeCheck = 'Check #arcadegateOnDownload: ' + hasArcadeGate;
  if (returnLogs) logs.push(arcadeCheck);
  else console.log('[Hypeddit Skip]', arcadeCheck); // Console only, no popup
  if (!hasArcadeGate) result = false;

  // Check 3: downloadProcess button
  const downloadBtn = document.getElementById('downloadProcess');
  const hasDownloadBtn = !!downloadBtn && /download/i.test(downloadBtn.textContent);
  const downloadCheck = 'Check #downloadProcess button: ' + hasDownloadBtn;
  if (returnLogs) logs.push(downloadCheck);
  else console.log('[Hypeddit Skip]', downloadCheck); // Console only, no popup
  if (!hasDownloadBtn) result = false;

  return returnLogs ? { isGate: result, logs } : result;
}

function sendLogToPopup(text) {
  if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.sendMessage) {
    browser.runtime.sendMessage({type: 'HYPEDDIT_SKIP_LOG', text});
  }
}