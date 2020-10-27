'use strict';



// We store the cache here rather than using chrome.storage because we cannot
// save objects with their methods in chrome.storage.
const _filters = [];

// This will be integrated with Chrome history in the future to inform
// integration suggestions
chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.openOptionsPage();
});

function enabledFilters(userRequested) {
  // This is only used when a user is recording something on purpose
  if (userRequested) return Promise.resolve(_filters);

  return new Promise((resolve) => {
    chrome.storage.local.get(['active_providers'], (resp) => {
      if (!resp || !resp.active_providers) resolve([]);

      const activeFilters = [];
      for (const f of _filters) {
        if (resp.active_providers.includes(f.provider)) activeFilters.push(f);
      }

      resolve(activeFilters);
    });
  });
}

function registerFilter(filter) {
  _filters.push(filter);
  const toStore = {};
  for (const f of _filters) {
    toStore[f.provider] = staticFilter(f);
  }
  chrome.storage.local.set({ filters: toStore });
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

function trimLastPart(str, match) {
  const parts = str.split(match);
  if (parts.length > 1) parts.pop();
  return parts.join(match);
}
