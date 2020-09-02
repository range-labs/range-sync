'use strict';

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
      // i.e. 'I have an issue · Issue #1234 · range-labs/mono' -> 'I have an issue (Issue #1234)'
      title_processor: (t) => {
        const p = t.split(' · ');
        return `${p[0].trim()} (${p[1].trim()})`;
      },
    },
    // Pull Request
    {
      source_id_processor: (url) => {
        const rePath = /([a-z-\/]+)\/pull\/[0-9]+/;
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'I have a PR · Pull Request #1234 · range-labs/mono' -> 'I have a PR (PR #1234)'
      title_processor: (t) => {
        const p = t.split(' · ');
        return `${p[0].trim()} (PR #${p[1].split('#')[1]})`;
      },
    },
  ],
});
