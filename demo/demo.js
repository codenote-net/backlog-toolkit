const $ = (selector) => document.querySelector(selector);
const uploadPath = '/api/v2/space/attachment';
function addInput() {
  const input = document.createElement('input');
  input.type = 'file';
  input.setAttribute('aria-label', 'Dynamic file upload');
  $('#dynamic').append(input);
  return input;
}
$('#add-control').onclick = addInput;
$('[data-upload-button]').onclick = () => $('#file').click();
$('#send-comment').onclick = async () => {
  try {
    const response = await fetch('/api/v2/issues/1/comments', { method: 'POST', body: $('#comment').value });
    $('#comment-result').textContent = response.ok ? 'Comment accepted by local server.' : 'Comment failed.';
  } catch { $('#comment-result').textContent = 'Comment failed.'; }
};
for (const type of ['drop', 'paste']) {
  $('#drop').addEventListener(type, (event) => {
    event.preventDefault();
    const data = event.dataTransfer ?? event.clipboardData;
    $('#gesture-result').textContent = data.files.length ? 'File gesture reached the page (not blocked).' : 'Text gesture reached the page (allowed).';
  });
}
$('#run').onclick = async () => {
  const results = [];
  const report = (pass, label) => results.push(`${pass ? 'PASS' : 'FAIL'} — ${label}`);
  $('#run').disabled = true;
  try {
    const before = await (await fetch('/stats')).json();
    let rejected = 0;
    for (const path of [uploadPath, `${uploadPath}?fixture=1`, `${uploadPath}/`]) {
      try { await fetch(path, { method: 'POST', body: 'harmless local fixture' }); }
      catch { rejected++; }
    }
    const comment = await fetch('/api/v2/issues/1/comments', { method: 'POST', body: 'demo comment' });
    const after = await (await fetch('/stats')).json();
    report(rejected === 3 && after.uploads === before.uploads, 'All three upload POSTs blocked before reaching the server');
    report(comment.ok && after.comments === before.comments + 1, 'Text comment POST reaches the server');
    const read = await fetch(uploadPath);
    report(read.status === 404, 'GET on upload path is not blocked (fixture returns 404)');
    const dynamic = addInput();
    await new Promise((resolve) => setTimeout(resolve, 100));
    report($('#file').disabled && getComputedStyle($('#file')).display === 'none', 'Existing file input hidden and disabled');
    report(dynamic.disabled && getComputedStyle(dynamic).display === 'none', 'Dynamically added file input hidden and disabled');
    report(getComputedStyle($('[data-upload-button]')).display === 'none', 'Configured upload button hidden');
    for (const type of ['drop', 'paste']) {
      const transfer = new DataTransfer();
      transfer.items.add(new File(['fixture'], 'fixture.txt', { type: 'text/plain' }));
      const event = type === 'drop'
        ? new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer })
        : new ClipboardEvent(type, { bubbles: true, cancelable: true, clipboardData: transfer });
      let reached = false;
      const listener = () => { reached = true; };
      $('#comment').addEventListener(type, listener);
      $('#comment').dispatchEvent(event);
      $('#comment').removeEventListener(type, listener);
      report(event.defaultPrevented && !reached, `Synthetic file ${type} intercepted before page handler`);
    }
    const text = new DataTransfer();
    text.setData('text/plain', 'hello');
    const paste = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: text });
    $('#comment').dispatchEvent(paste);
    report(!paste.defaultPrevented, 'Text-only paste is not cancelled');
    results.push(`Server counters: uploads=${after.uploads}, comments=${after.comments}`);
    results.push('Synthetic gesture checks do not replace manual OS file drag/drop and clipboard checks.');
  } catch (error) { results.push(`ERROR — ${error.message}`); }
  $('#results').textContent = results.join('\n');
  $('#run').disabled = false;
};
