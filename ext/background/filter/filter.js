'use strict';

// We store the cache here rather than using chrome.storage because we cannot
// save objects with their methods in chrome.storage.
const _filters = [];

async function enabledFilters(userRequested) {
  // This is only used when a user is recording something on purpose
  if (userRequested) return _filters;

  const activeProviders = await getEnabledProviders();
  const activeFilters = [];
  for (const f of _filters) {
    if (activeProviders.includes(f.provider)) activeFilters.push(f);
  }

  return activeFilters;
}

async function toggleProvider(provider, active) {
  const activeProviders = await getEnabledProviders();
  const idx = activeProviders.indexOf(provider);
  if (active) {
    if (idx < 0) activeProviders.push(provider);
  } else {
    if (idx > -1) activeProviders.splice(idx, 1);
    // Ensure that if reenabled, the backfill doesn't start at the beginning
    setBackfillTime(provider);
  }

  return new Promise((resolve) => {
    chrome.storage.local.set({ active_providers: activeProviders }, resolve);
  });
}

function getEnabledProviders() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['active_providers'], (r) => {
      resolve(r.active_providers || []);
    });
  });
}

function getNewProviders() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['new_providers'], (r) => {
      resolve(r.new_providers || []);
    });
  });
}

function ackNewProviders() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ new_providers: [] }, resolve);
  });
}

function getAllFilters() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['filters'], (r) => {
      resolve(r.filters || []);
    });
  });
}

function registerFilter(filter) {
  _filters.push(filter);
  const toStore = {};
  for (const f of _filters) {
    if (f.no_sync) continue;
    toStore[f.provider] = staticFilter(f);
  }
  chrome.storage.local.set({ filters: toStore });
}

function getProviderDedupe(provider) {
  const f = _filters.filter((f) => f.provider == provider);
  if (f && f.length > 0 && f[0].dedupe) {
    return MERGE_BEHAVIOR[f[0].dedupe] || MERGE_BEHAVIOR.KEEP_EXISTING;
  }
  return MERGE_BEHAVIOR.KEEP_EXISTING;
}

async function tabHasFilter(tab) {
  const _enabledFilters = await enabledFilters();
  const provider = await providerInfo(new URL(tab.url), tab.title, true);

  const resp = {
    provider: provider.provider,
    provider_name: provider.provider_name,
    enabled_count: _enabledFilters.length,
  };

  for (const f of _enabledFilters) {
    if (f.provider === provider.provider) {
      return {
        ...resp,
        status: INTEGRATION_STATUSES.ENABLED,
      };
    }
  }
  if (provider.provider.includes('chromeext_')) {
    return {
      ...resp,
      status: INTEGRATION_STATUSES.NOT_IMPLEMENTED,
    };
  } else {
    return {
      ...resp,
      status: INTEGRATION_STATUSES.DISABLED,
    };
  }
}

// We cannot store objects with their methods to chrome.storage. If we need
// access to that field when reading the filter from chrome.storage, we need to
// convert the methods to a value.
function staticFilter(filter) {
  return {
    ...filter,
    provider_name: filter.provider_name(),
  };
}

function reMatch(str, re, index) {
  const match = str.match(re);
  return match ? match[index] : null;
}

function trimFirstPart(str, match) {
  const parts = str.split(match);
  if (parts.length > 1) parts.shift();
  return parts.join(match);
}

function trimLastPart(str, match) {
  const parts = str.split(match);
  if (parts.length > 1) parts.pop();
  return parts.join(match);
}

function trimExtension(str) {
  const reExt = /([a-zA-Z0-9]+\.[a-zA-Z0-9]+$)/;
  if (reExt.test(str)) {
    return trimLastPart(str, '.');
  }
  return str;
}
