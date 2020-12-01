'use strict';

registerFilter({
  url_regex: [/(.+)github\.com/, /github(.+)\.com/],
  provider: 'github_enterprise',
  provider_name: (_url) => 'GitHub Enterprise',
  parent: (url) => {
    const reName = /(.+)\/(.+)\/(issues|pull)/;
    const nameMatch = url.pathname.match(reName);
    const reUrl = /(.+)\/(issues|pull)/;
    const urlMatch = url.pathname.match(reUrl);
    return {
      parent_name: nameMatch ? `${nameMatch[1]}/${nameMatch[2]}` : null,
      parent_html_url: urlMatch ? urlMatch[1] : null,
    };
  },
  type: (_url) => 'CODE_CHANGE',
  processors: [
    // Issue
    {
      // i.e. 'https://github.com/range-labs/mono/issues/8166' -> 'range-labs/mono#8166'
      source_id_processor: (url) => {
        const rePath = /(.+)\/(.+)\/issues\/([0-9]+)/;
        const match = url.pathname.match(rePath);
        return match ? `${match[1]}/${match[2]}#${match[3]}` : null;
      },
      // i.e. 'I have an issue · Issue #1234 · range-labs/mono' -> 'Issue #1234: I have an issue'
      title_processor: (t) => {
        return t.split(' · ')[0].trim();
      },
      change_info: (url) => {
        const rePath = /(.+)\/(.+)\/issues\/([0-9]+)/;
        const match = url.pathname.match(rePath);
        return {
          change_label: 'Issue #',
          change_id: match ? match[3] : null,
        };
      },
    },
    // Pull Request
    {
      // i.e. 'https://github.com/range-labs/mono/pull/8166' -> 'range-labs/mono#8166'
      source_id_processor: (url) => {
        const rePath = /(.+)\/(.+)\/pull\/([0-9]+)/;
        const match = url.pathname.match(rePath);
        return match ? `${match[1]}/${match[2]}#${match[3]}` : null;
      },
      // i.e. 'I have a PR by jmiller101 · Pull Request #1234 · range-labs/mono' -> 'I have a PR'
      title_processor: (t) => {
        const p = t.split(' · ');
        return p[0].split(' by ')[0].trim();
      },
      change_info: (url) => {
        const rePath = /(.+)\/(.+)\/pull\/([0-9]+)/;
        const match = url.pathname.match(rePath);
        return {
          change_label: 'PR #',
          change_id: match ? match[3] : null,
        };
      },
    },
  ],
});
