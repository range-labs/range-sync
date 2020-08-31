'use strict';

chrome.tabs.onUpdated.addListener((tabId, _info, tab) => {
  // no-op unless done loading
  if (!tab.status || !tab.status.localeCompare('complete') == 0) return;

  // no-op if title is in the global block list
  for (const reTitle of BLOCK_LIST.title) {
    if (reTitle.test(tab.title)) return;
  }

  // no-op unless we have enough info to make an attachment
  if (!tab.url || !tab.title) return;

  // no-op if the title has not actually loaded yet
  if (tab.url.localeCompare(tab.title) == 0) return;

  listOrgs()
    .then((slugs) => Promise.all(slugs.map(getSession)))
    .then((sessions) =>
      Promise.all(
        sessions.map((s) => {
          const a = attachment(s, tab);
          if (!a) return Promise.resolve();

          return recordInteraction(
            {
              interaction_type: 'VIEWED',
              idempotency_key: `${tabId}::${tab.title}`,
              attachment: a,
            },
            authorize(s)
          );
        })
      )
    )
    .catch(console.log);
});

function attachment(session, tab) {
  const url = new URL(tab.url);

  // To avoid spam, do not automatically track domains without paths
  if (url.pathname.length <= 1) return null;

  const provider = providerInfo(url, tab.title);
  if (!provider) return null;

  return {
    ...provider,
    html_url: url.href,
    org_id: session.org.org_id,
    type: 'LINK',
    subtype: 'NONE',
  };
}

function providerInfo(url, title) {
  // For consistency, remove trailing forward slashes
  const base = url.hostname + url.pathname.replace(/\/+$/, '');
  // Loop through the known providers and check if the current URL matches one
  for (const filter of FILTERS) {
    let sourceId = '';
    for (const reUrl of filter.url_regex) {
      if (!reUrl.test(base)) continue;
      if (blocked(filter.block_list, url, title)) return null;

      for (const processor of filter.processors) {
        sourceId = processor.source_id_processor(url);
        if (!!sourceId) {
          return {
            name: processor.title_processor(title),
            provider: filter.provider,
            provider_name: filter.provider_name(url),
            source_id: sourceId,
          };
        }
      }

      // No processor found for a recognized domain; return to avoid spam
      return null;
    }
  }

  // No processor found for any domain; return null to avoid spam
  return null;
}

function blocked(blockList, url, title) {
  if (!blockList) return false;

  if (!!blockList.title) {
    for (const s of blockList.title) {
      if (s.test(title)) return true;
    }
  }

  if (!!blockList.url) {
    for (const r of blockList.url) {
      if (r.test(url.href)) return true;
    }
  }
}
