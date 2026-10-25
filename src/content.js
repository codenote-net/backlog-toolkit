(() => {
  'use strict';
  const config = globalThis.backlogToolkitConfig;
  if (!config?.origins.includes(location.origin)) return;

  const selectors = ['input[type="file"]'];
  for (const selector of config.uploadSelectors) {
    try {
      document.querySelector(selector);
      selectors.push(selector);
    } catch {
      console.warn('Backlog Toolkit: invalid upload selector ignored:', selector);
    }
  }
  const uploadSelector = selectors.join(',');
  const style = document.createElement('style');
  style.textContent = `${uploadSelector} { display: none !important; }`;

  const japanese = document.documentElement?.lang.startsWith('ja') || location.hostname !== '127.0.0.1';
  const messages = japanese ? {
    policy: 'Backlog Toolkitにより、ファイルのアップロードを制限しています。テキストは通常どおり投稿できます。',
    gesture: 'Backlog Toolkitがファイルのアップロードをブロックしました。',
    network: 'Backlog Toolkitがアップロード通信をブロックしました。ファイルは送信されていません。',
    dismiss: '通知を閉じる',
  } : {
    policy: 'Backlog Toolkit restricts file uploads here. You can still post text normally.',
    gesture: 'Backlog Toolkit blocked a file upload.',
    network: 'Backlog Toolkit blocked the upload request. The file was not sent.',
    dismiss: 'Dismiss notification',
  };
  const panels = new Map();
  let lastNetworkBlock = 0;
  function makePanel(message, live = false) {
    const host = document.createElement('div');
    host.className = 'backlog-toolkit-panel';
    const shadow = host.attachShadow({ mode: 'open' });
    const css = document.createElement('style');
    css.textContent = ':host{display:block!important;margin:8px 0;clear:both} .box{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border:1px solid #b8d6cd;border-radius:6px;background:#f0f8f5;color:#244b40;font:13px/1.6 system-ui,sans-serif;overflow-wrap:anywhere} .shield{flex:none;font-size:16px} p{margin:0} button{margin-left:auto;border:0;background:transparent;color:inherit;cursor:pointer;font-size:18px;flex:none}';
    const box = document.createElement('div');
    box.className = 'box';
    const icon = document.createElement('span');
    icon.className = 'shield';
    icon.textContent = '🛡';
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('p');
    if (live) { text.setAttribute('role', 'status'); text.setAttribute('aria-live', 'polite'); }
    text.textContent = message;
    box.append(icon, text);
    shadow.append(css, box);
    return { host, text, box };
  }
  function restrictControls() {
    if (!style.isConnected && document.documentElement) document.documentElement.append(style);
    for (const [anchor, panel] of panels) {
      if (!anchor.isConnected) { panel.host.remove(); panels.delete(anchor); }
    }
    for (const control of document.querySelectorAll(uploadSelector)) {
      if ('disabled' in control && !control.disabled) control.disabled = true;
      const editor = control.closest('.comment-editor');
      const anchor = editor?.querySelector('.comment-editor__input-wrapper') ||
        control.closest('.file-upload') || control.parentElement;
      if (!anchor || ['HTML', 'HEAD'].includes(anchor.tagName)) continue;
      let panel = panels.get(anchor);
      if (!panel) {
        panel = makePanel(messages.policy);
        panels.set(anchor, panel);
      }
      if (!panel.host.isConnected) anchor.append(panel.host);
    }
  }
  // Schedule outside the observer microtask, and do not rewrite unchanged DOM.
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; restrictControls(); });
  });
  observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['type', 'disabled'] });
  restrictControls();

  let noticeTimer;
  function notify(kind = 'gesture') {
    if (!document.body) return;
    document.getElementById('backlog-toolkit-notice')?.remove();
    const panel = makePanel(messages[kind], true);
    panel.host.id = 'backlog-toolkit-notice';
    panel.host.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;width:min(440px,calc(100vw - 40px));margin:0;box-shadow:0 4px 18px #0003;';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', messages.dismiss);
    close.onclick = () => panel.host.remove();
    panel.box.append(close);
    document.body.append(panel.host);
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => panel.host.remove(), 10000);
    if (kind === 'network') {
      // Keep the explanation near the attachment UI even after the toast expires.
      for (const inline of panels.values()) inline.text.textContent = messages.network;
    }
  }
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (sender.id !== chrome.runtime.id || message?.type !== 'backlog-toolkit:upload-blocked') return;
    if (Date.now() - lastNetworkBlock < 500) return;
    lastNetworkBlock = Date.now();
    restrictControls();
    notify('network');
  });
  function block(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.type !== 'dragover' && event.type !== 'dragenter') notify();
  }
  function hasFiles(transfer) {
    return transfer && (Array.from(transfer.types).includes('Files') ||
      Array.from(transfer.items ?? []).some((item) => item.kind === 'file'));
  }
  for (const type of ['dragenter', 'dragover', 'drop']) {
    window.addEventListener(type, (event) => {
      if (hasFiles(event.dataTransfer)) block(event);
    }, true);
  }
  window.addEventListener('paste', (event) => {
    if (hasFiles(event.clipboardData)) block(event);
  }, true);
  window.addEventListener('click', (event) => {
    if (event.composedPath().some((node) => node instanceof Element && node.matches(uploadSelector))) block(event);
  }, true);
  window.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'file') {
      event.target.value = '';
      block(event);
    }
  }, true);
})();
