// Exact attribution is available for the unpacked PoC only. Never infer our
// involvement from an arbitrary page error or another extension's block.
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
  if (info.rule.rulesetId !== 'upload_blocking' || info.request.tabId < 0) return;
  chrome.tabs.sendMessage(info.request.tabId, {
    type: 'backlog-toolkit:upload-blocked',
  }, { frameId: Math.max(info.request.frameId, 0) }).catch(() => {
    // Navigation, closed tabs, or pages opened before install may have no listener.
  });
});
