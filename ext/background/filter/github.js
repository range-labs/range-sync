'use strict';

// This is currently disabled. Reenable it by adding the file to
// background.scripts in manifest.json
registerFilter({
  url_regex: [/github\.com\/.+/],
  provider: 'github',
  provider_name: (_url) => 'GitHub',
  type: (_url) => 'CODE_CHANGE',
  processors: [
    // Issue
    {
      source_id_processor: (url) => {
        const rePath = /([a-z-\/]+)\/issues\/[0-9]+/;
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'I have an issue · Issue #1234 · range-labs/mono' -> 'Issue #1234: I have an issue'
      title_processor: (t) => {
        const p = t.split(' · ');
        return `${p[1].trim()}: ${p[0].trim()}`;
      },
    },
    // Pull Request
    {
      source_id_processor: (url) => {
        const rePath = /([a-z-\/]+)\/pull\/[0-9]+/;
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'I have a PR by jmiller101· Pull Request #1234 · range-labs/mono' -> 'PR #1234: I have a PR'
      title_processor: (t) => {
        const p = t.split(' · ');
        const title = p[0].split(' by ')[0].trim();
        return `PR #${p[1].split('#')[1]}: ${title}`;
      },
    },
  ],
});
