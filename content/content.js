// content.js – Clean toggling ON/OFF, full widget, instant bets for lotusbook.cc
(function () {
  'use strict';

  if (window.top !== window.self) return;

  console.log('[BetEngine] Content script started.');

  // ──────────────────────────────────────────────────────────────
  // 1. CSS – hides the bet modal (MUI modal), never interfere with page
  // ──────────────────────────────────────────────────────────────
  const styleId = 'instant-engine-style';
  function applyStyles() {
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      /* Hide place-bet modal and backdrop – never interfere with page */
      .MuiModal-root, .MuiBackdrop-root,
      .MuiModal-root > div, .MuiBackdrop-root > div {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      #custom-toast-container {
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        z-index: 2147483647 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
        width: auto !important;
        max-width: 350px !important;
        pointer-events: none !important;
      }
      .custom-toast {
        padding: 12px 20px !important;
        border-radius: 8px !important;
        color: #fff !important;
        font-weight: bold !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
        animation: fadeInOut 2.5s ease forwards !important;
        pointer-events: auto !important;
      }
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-10px); }
        15% { opacity: 1; transform: translateY(0); }
        85% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(style);
  }
  function removeStyles() {
    const style = document.getElementById(styleId);
    if (style) style.remove();
  }

  // ──────────────────────────────────────────────────────────────
  // 2. TOAST CONTAINER & FUNCTION (called from injected script)
  // ──────────────────────────────────────────────────────────────
  function showToast(msg, ok) {
    let c = document.getElementById('custom-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'custom-toast-container';
      document.body.appendChild(c);
    }
    const t = document.createElement('div');
    t.className = 'custom-toast';
    t.style.background = ok ? '#28a745' : '#dc3545';
    t.innerText = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  window.addEventListener('message', function (event) {
    if (event.data.type === 'MANGO_TOAST') {
      showToast(event.data.message, event.data.success);
    }
  });

  // ──────────────────────────────────────────────────────────────
  // 3. SCRIPT INJECTION
  // ──────────────────────────────────────────────────────────────
  function injectCoreScripts() {
    if (document.querySelector('script[data-extension-script="main"]')) return;
    const mainScript = document.createElement('script');
    mainScript.src = chrome.runtime.getURL('injected.js');
    mainScript.setAttribute('data-extension-script', 'main');
    mainScript.onload = () => console.log('[BetEngine] injected.js loaded.');
    mainScript.onerror = () => console.error('[BetEngine] Failed to load injected.js.');
    document.documentElement.appendChild(mainScript);
  }
  function removeCoreScripts() {
    document.querySelectorAll('script[data-extension-script]').forEach(el => el.remove());
  }

  // ──────────────────────────────────────────────────────────────
  // 4. WIDGET UI (exactly same as Rimzim/Saffron)
  // ──────────────────────────────────────────────────────────────
  let shadowRoot = null;
  function injectProfessionalWidget() {
    if (document.getElementById('bet-pro-widget-root')) return;
    try {
      if (window.top !== window.self) return;
    } catch (e) {
      return;
    }
    const host = document.createElement('div');
    host.id = 'bet-pro-widget-root';
    document.documentElement.appendChild(host);
    shadowRoot = host.attachShadow({ mode: 'open' });

    shadowRoot.innerHTML = `
      <style>
        :host { position: fixed !important; bottom: 25px !important; right: 25px !important; z-index: 2147483647 !important; font-family: 'Inter', -apple-system, sans-serif !important; display: block; }
        @media (max-width: 600px) { :host { bottom: 15px !important; right: 15px !important; } .panel { width: calc(100vw - 30px) !important; bottom: 70px !important; right: 0 !important; } }
        .fab { width: 54px; height: 54px; background: #0b1120; border: 2px solid #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.5); transition: transform 0.2s; }
        .fab:hover { transform: scale(1.05); }
        .fab svg { width: 28px; height: 28px; fill: #10b981; }
        .panel { display: none; position: absolute; bottom: 75px; right: 0; width: 320px; background: rgba(15, 23, 42, 0.98); backdrop-filter: blur(10px); border: 1px solid #1e293b; border-radius: 12px; padding: 18px; box-shadow: 0 10px 40px rgba(0,0,0,0.9); color: #f8fafc; box-sizing: border-box; }
        .panel.open { display: block; animation: slideUp 0.2s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #1e293b; padding-bottom: 10px; }
        .title { font-size: 16px; font-weight: 800; color: #10b981; text-transform: uppercase; letter-spacing: 0.5px; }
        .close-icon { width: 24px; height: 24px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.2s; }
        .close-icon:hover { background: rgba(239, 68, 68, 0.2); }
        .close-icon svg { width: 12px; height: 12px; fill: #ef4444; }
        .section-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; margin: 12px 0 8px 0; font-weight: bold; letter-spacing: 0.5px; }
        .input-box { width: 100%; padding: 12px 14px; background: #0b1120; border: 1px solid #334155; border-radius: 8px; color: #10b981; font-size: 18px; font-weight: bold; box-sizing: border-box; transition: 0.2s; }
        .input-box:focus { outline: none; border-color: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.2); }
        .chips-container { display: flex; gap: 8px; flex-wrap: wrap; }
        .chip { position: relative; background: radial-gradient(circle, #1e293b 30%, #0f172a 100%); border: 2px solid #334155; color: #e2e8f0; padding: 8px 12px; font-size: 13px; font-weight: 800; border-radius: 20px; cursor: pointer; box-shadow: inset 0 0 0 2px #1e293b, 0 3px 6px rgba(0,0,0,0.4); text-align: center; min-width: 45px; transition: all 0.2s; }
        .chip:hover { transform: translateY(-2px); }
        .chip.active { background: radial-gradient(circle, #10b981 30%, #059669 100%); border-color: #047857; color: #0b1120; }
        .switch-container { display: flex; justify-content: space-between; align-items: center; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 12px; border-radius: 8px; margin-top: 20px; }
        .switch-text { font-size: 13px; font-weight: bold; color: #10b981; }
      </style>
      <div class="fab" id="fabBtn"><svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39,0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg></div>
      <div class="panel" id="mainPanel">
        <div class="row">
          <span class="title">Mango Bot</span>
          <div class="close-icon" id="closePanelBtn">
            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </div>
        </div>
        <div class="section-label">Active Stake Amount</div>
        <input type="number" id="stakeField" class="input-box" placeholder="Custom Stake...">
        <div class="section-label">Quick Presets</div>
        <div class="chips-container" id="presetChips">
          <div class="chip" data-val="100">100</div>
          <div class="chip" data-val="1000">1000</div>
          <div class="chip" data-val="10000">10000</div>
          <div class="chip" data-val="25000">25000</div>
          <div class="chip" data-val="50000">50000</div>
          <div class="chip" data-val="100000">100000</div>
        </div>
        <div class="section-label">Recent User Inputs</div>
        <div class="chips-container" id="recentChips"></div>
        <div class="switch-container">
          <span class="switch-text">AUTO-SUBMIT: ON</span>
        </div>
      </div>
    `;

    bindWidgetEvents();
    updateWidgetUI();
  }
  function removeWidget() {
    const host = document.getElementById('bet-pro-widget-root');
    if (host) host.remove();
    shadowRoot = null;
  }

  // ──────────────────────────────────────────────────────────────
  // 5. WIDGET EVENTS (unchanged)
  // ──────────────────────────────────────────────────────────────
  function bindWidgetEvents() {
    const host = document.getElementById('bet-pro-widget-root');
    const panel = shadowRoot.getElementById('mainPanel');
    const fabBtn = shadowRoot.getElementById('fabBtn');

    let isDragging = false;
    let hasDragged = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    const dragStart = (e) => {
      if (panel.classList.contains('open')) return;
      isDragging = true;
      hasDragged = false;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;
      const rect = host.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
    };

    const dragMove = (e) => {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - startX;
      const dy = clientY - startY;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasDragged = true;
        if (e.cancelable) e.preventDefault();
      }

      if (hasDragged) {
        host.style.setProperty('bottom', 'auto', 'important');
        host.style.setProperty('right', 'auto', 'important');
        host.style.setProperty('left', (initialLeft + dx) + 'px', 'important');
        host.style.setProperty('top', (initialTop + dy) + 'px', 'important');
      }
    };

    const dragEnd = () => { isDragging = false; };

    fabBtn.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', dragMove, { passive: false });
    document.addEventListener('mouseup', dragEnd);

    fabBtn.addEventListener('touchstart', dragStart, { passive: true });
    document.addEventListener('touchmove', dragMove, { passive: false });
    document.addEventListener('touchend', dragEnd);

    fabBtn.addEventListener('click', (e) => {
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        panel.classList.toggle('open');
      }
    });

    shadowRoot.getElementById('closePanelBtn').addEventListener('click', () => panel.classList.remove('open'));

    const stakeField = shadowRoot.getElementById('stakeField');
    stakeField.addEventListener('blur', (e) => processCustomInput(e.target.value));
    stakeField.addEventListener('keypress', (e) => { if (e.key === 'Enter') { processCustomInput(e.target.value); stakeField.blur(); } });

    shadowRoot.addEventListener('click', (e) => {
      if (e.target.classList.contains('chip')) saveNewStake(e.target.getAttribute('data-val'));
    });
  }

  function processCustomInput(val) {
    val = val.trim();
    if (val && !isNaN(val)) saveNewStake(val);
  }

  function saveNewStake(val) {
    userStake = val;
    let updatedRecent = [val, ...recentStakes.filter(s => s !== val)].slice(0, 5);
    chrome.storage.local.set({ stake: val, recentStakes: updatedRecent });
    localStorage.setItem('mangoStake', String(val));
    localStorage.setItem('mangoRecentStakes', JSON.stringify(updatedRecent));
    document.dispatchEvent(new CustomEvent('updateStake', { detail: { stake: val } }));
    updateWidgetUI();
  }

  function updateWidgetUI() {
    if (!shadowRoot) return;
    shadowRoot.getElementById('stakeField').value = userStake;
    shadowRoot.querySelectorAll('#presetChips .chip').forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-val') === userStake);
    });
    shadowRoot.getElementById('recentChips').innerHTML = recentStakes.map(val =>
      `<div class="chip ${val === userStake ? 'active' : ''}" data-val="${val}">${val}</div>`
    ).join('');
  }

  // ──────────────────────────────────────────────────────────────
  // 6. MAIN TOGGLE LOGIC (with flag for injected.js)
  // ──────────────────────────────────────────────────────────────
  function activateExtension() {
    window.__betEngineActive = true;   // enable flag
    applyStyles();
    injectProfessionalWidget();
    injectCoreScripts();
    updateVisibility(true);
  }

  function deactivateExtension() {
    window.__betEngineActive = false;  // disable flag
    removeStyles();
    removeWidget();
    removeCoreScripts();
    updateVisibility(false);
  }

  let isExtensionActive = true;
  let userStake = '100';
  let recentStakes = ['100', '500', '1000', '5000', '10000'];

  chrome.storage.local.get(['isActive', 'stake', 'recentStakes'], (data) => {
    isExtensionActive = data.isActive !== undefined ? data.isActive : true;
    userStake = data.stake || '100';
    recentStakes = data.recentStakes || ['100', '500', '1000', '5000', '10000'];

    if (isExtensionActive) {
      activateExtension();
    } else {
      deactivateExtension();
    }
    updateWidgetUI();
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.isActive) {
      isExtensionActive = changes.isActive.newValue;
      if (isExtensionActive) {
        activateExtension();
      } else {
        deactivateExtension();
      }
    }
    if (changes.stake) {
      userStake = changes.stake.newValue;
      document.dispatchEvent(new CustomEvent('updateStake', { detail: { stake: userStake } }));
      updateWidgetUI();
    }
    if (changes.recentStakes) {
      recentStakes = changes.recentStakes.newValue;
      updateWidgetUI();
    }
  });

  function updateVisibility(active) {
    const host = document.getElementById('bet-pro-widget-root');
    if (host) {
      host.style.setProperty('display', active ? 'block' : 'none', 'important');
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 7. CLOSE PANEL WHEN CLICKING OUTSIDE
  // ──────────────────────────────────────────────────────────────
  document.addEventListener('mousedown', (e) => {
    const host = document.getElementById('bet-pro-widget-root');
    if (host && shadowRoot) {
      const panel = shadowRoot.getElementById('mainPanel');
      if (panel.classList.contains('open') && !e.composedPath().includes(host)) {
        panel.classList.remove('open');
      }
    }
  });
})();