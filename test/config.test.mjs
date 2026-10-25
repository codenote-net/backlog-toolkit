import test from 'node:test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { validateConfig, makeRules } from '../scripts/config.mjs';
const config = { origins: ['https://example.backlog.com'], uploadPaths: ['/api/v2/space/attachment'], uploadSelectors: [] };

test('only explicit Backlog HTTPS spaces are accepted in production', () => {
  for (const origin of ['https://example.backlog.com', 'https://example.backlog.jp', 'https://example.backlogtool.com']) {
    assert.equal(validateConfig({ ...config, origins: [origin] }).origins[0], origin);
  }
  for (const origin of ['http://example.backlog.com', 'https://backlog.com', 'https://example.backlog.com.evil.test', 'https://*.backlog.com', 'https://example.backlog.com/', 'https://example.backlog.com:444', 'http://127.0.0.1:4173']) {
    assert.throws(() => validateConfig({ ...config, origins: [origin] }));
  }
});

test('upload rules match only the exact origin and path, including query and trailing slash', () => {
  const [rule] = makeRules(validateConfig(config));
  const matches = (url, method = 'post') => rule.condition.requestMethods.includes(method) && new RegExp(rule.condition.regexFilter).test(url);
  for (const suffix of ['', '?apiKey=dummy', '/', '/?foo=bar']) assert.ok(matches(config.origins[0] + config.uploadPaths[0] + suffix));
  for (const url of ['https://other.backlog.com/api/v2/space/attachment', 'https://exampleXbacklog.com/api/v2/space/attachment', 'https://example.backlog.com/api/v2/space/attachments', 'https://example.backlog.com/api/v2/issues/1/comments', 'https://example.backlog.com/api/v2/space/attachment/child']) assert.equal(matches(url), false);
  assert.equal(matches(config.origins[0] + config.uploadPaths[0], 'get'), false);
});

test('demo access is opt-in and invalid path configuration fails', () => {
  assert.ok(validateConfig({ ...config, origins: ['http://127.0.0.1:4173'] }, { demo: true }));
  for (const uploadPaths of [[], ['/*'], ['https://evil.test/'], ['/a?b'], ['/a/../b']]) assert.throws(() => validateConfig({ ...config, uploadPaths }));
  assert.throws(() => validateConfig({ ...config, uploadSelectors: [''] }));
});

test('rules have unique IDs for multiple origins and paths', () => {
  const rules = makeRules(validateConfig({ ...config, origins: [...config.origins, 'https://other.backlog.jp'], uploadPaths: [...config.uploadPaths, '/verified-upload'] }));
  assert.deepEqual(rules.map((r) => r.id), [1, 2, 3, 4]);
});

test('observed web UI attachment action is blocked without affecting issue submission', () => {
  const rules = makeRules(validateConfig({ ...config, uploadPaths: ['/AddAttachmentAsync.action'] }));
  const matches = (path) => new RegExp(rules[0].condition.regexFilter).test(config.origins[0] + path);
  assert.equal(matches('/AddAttachmentAsync.action'), true);
  assert.equal(matches('/AddAttachmentAsync.action?token=dummy'), true);
  assert.equal(matches('/AddIssue.action'), false);
  assert.equal(matches('/AddComment.action'), false);
  assert.equal(matches('/AddAttachmentAsyncXaction'), false);
});


test('example configuration blocks all observed upload routes while preserving normal requests', async () => {
  const example = JSON.parse(await readFile(new URL('../config.example.json', import.meta.url), 'utf8'));
  const rules = makeRules(validateConfig(example));
  const blocked = (origin, path, method = 'post') => rules.some(({ condition }) =>
    condition.requestMethods.includes(method) && new RegExp(condition.regexFilter).test(origin + path));
  const origin = example.origins[0];
  for (const path of ['/api/v2/space/attachment', '/AddAttachmentAsync.action', '/AddWikiAttachmentAsync.action', '/r/files/addSharedFile']) {
    assert.ok(blocked(origin, path));
    assert.ok(blocked(origin, path + '/?token=dummy'));
    assert.equal(blocked(origin, path, 'get'), false);
    assert.equal(blocked('https://other.backlog.com', path), false);
    assert.equal(blocked(origin, path + '/child'), false);
  }
  for (const path of ['/AddIssue.action', '/AddComment.action', '/UpdateWiki.action', '/api/v2/issues/1/comments', '/downloadWikiAttachment/1/test.txt']) {
    assert.equal(blocked(origin, path), false);
    assert.equal(blocked(origin, path, 'get'), false);
  }
});
