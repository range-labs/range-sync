'use strict';

chrome.tabs.onUpdated.addListener((_tabId, info, tab) => {
  // no-op unless done loading
  if (!tab.status || !tab.status == 'complete') return;

  // no-op unless we have enough info to make an attachment
  if (!tab.url || !tab.title) return;

  // no-op if the title has not actually loaded yet
  if (tab.url.localeCompare(tab.title) == 0) return;

  listOrgs()
    .then((slugs) => Promise.all(slugs.map(getSession)))
    .then((sessions) =>
      Promise.all(
        sessions.map((s) => {
          const url = new URL(tab.url);
          const base = url.hostname + url.pathname;
          return addInteraction(
            {
              interaction_type: 'VIEWED',
              idempotency_key: tab.title,
              attachment: {
                org_id: s.org.org_id,
                source_id: `chrome_extension::${base}`,
                provider: 'chrome_extension',
                provider_name: 'Chrome Extension',
                type: 'LINK',
                subtype: 'NONE',
                name: tab.title,
                html_url: base,
              },
            },
            authorize(s)
          );
        })
      )
    )
    .then(console.log);
});
