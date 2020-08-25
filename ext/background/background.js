'use strict';

chrome.tabs.onUpdated.addListener((_tabId, _info, tab) => {
  // no-op unless done loading
  if (!tab.status || !tab.status.localeCompare('complete') == 0) return;

  // no-op unless we have enough info to make an attachment
  if (!tab.url || !tab.title) return;

  // no-op if the title has not actually loaded yet
  if (tab.url.localeCompare(tab.title) == 0) return;

  listOrgs()
    .then((slugs) => Promise.all(slugs.map(getSession)))
    .then((sessions) =>
      Promise.all(
        sessions.map((s) => {
          return recordInteraction(
            {
              interaction_type: 'VIEWED',
              idempotency_key: tab.title,
              attachment: attachment(s, tab),
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

  return {
    ...providerInfo(url),
    name: tab.title,
    html_url: url.hostname + url.pathname,
    org_id: session.org.org_id,
    type: 'LINK',
    subtype: 'NONE',
  };
}

function providerInfo(url) {
  const base = url.hostname + url.pathname;
  // Loop through the known providers and check the url against them
  for (const reConfig of REGEX) {
    let sourceId = '';
    for (const reUrl of reConfig.url_regex) {
      if (reUrl.test(base)) {
        const pageMatch = base.match(reConfig.page_regex);
        if (!!pageMatch) {
          sourceId = pageMatch[0];
          break;
        }
      }
    }
    // If no match, try the next one
    if (!sourceId) continue;

    return {
      provider: reConfig.provider,
      provider_name: reConfig.provider_name,
      source_id: sourceId,
    };
  }

  // If there's no known provider, generate one based on the URL
  const hostParts = url.hostname.split('.');
  return {
    source_id: base,
    // i.e. 'subdomain.nytimes.com' -> 'chromeext_nytimes'
    provider: `chromeext_${hostParts[hostParts.length - 2]}`,
    // i.e. 'subdomain.nytimes.com' -> 'nytimes.com (via Range Sync)'
    provider_name: `${hostParts[hostParts.length - 2]}.${hostParts[hostParts.length - 1]} (via Range Sync)`,
  };
}
