export function validateConfig(config, { demo = false } = {}) {
  if (!Array.isArray(config.origins) || !config.origins.length) {
    throw new Error('Configure at least one explicit Backlog origin.');
  }
  const origins = [...new Set(config.origins.map((origin) => {
    const url = new URL(origin);
    const backlog = url.protocol === 'https:' && /^[a-z0-9-]+\.(backlog\.(com|jp)|backlogtool\.com)$/.test(url.hostname);
    const local = demo && origin === 'http://127.0.0.1:4173';
    if ((!backlog && !local) || url.origin !== origin || url.port && !local) {
      throw new Error(`Unsupported origin: ${origin}. Use an exact HTTPS Backlog origin without a trailing slash.`);
    }
    return origin;
  }))];
  if (!Array.isArray(config.uploadPaths) || !config.uploadPaths.length ||
      config.uploadPaths.some((path) => typeof path !== 'string' || !/^\/[a-zA-Z0-9_./-]+$/.test(path) || path.includes('..'))) {
    throw new Error('uploadPaths must contain exact URL paths without query strings or wildcards.');
  }
  if (!Array.isArray(config.uploadSelectors) || config.uploadSelectors.some((s) => typeof s !== 'string' || !s.trim())) {
    throw new Error('uploadSelectors must be an array of nonempty CSS selectors.');
  }
  return { origins, uploadPaths: [...new Set(config.uploadPaths)], uploadSelectors: config.uploadSelectors };
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function makeRules(config) {
  return config.origins.flatMap((origin) => config.uploadPaths.map((path) => ({
    id: 0,
    priority: 1,
    action: { type: 'block' },
    condition: {
      regexFilter: `^${escapeRegex(origin)}${escapeRegex(path)}/?(\\?.*)?$`,
      isUrlFilterCaseSensitive: true,
      requestMethods: ['post'],
    },
  }))).map((rule, index) => ({ ...rule, id: index + 1 }));
}
