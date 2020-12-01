'use strict';

// GitHub and GitHub Enterprise basically share everything except for their
// names and URLs
const base = {
  parent: (url) => {
    const reName = /\/(.+)\/(.+)\/(issues|pull)/;
    const nameMatch = url.pathname.match(reName);
    return {
      parent_name: nameMatch ? `${nameMatch[1]}/${nameMatch[2]}` : null,
      parent_description: 'All the code.',
      parent_html_url: url.href,
    };
  },
  type: (url) => {
    const type = /\/(issues|pull)/;
    const typeMatch = url.pathname.match(type);
    if (typeMatch) {
      switch (typeMatch[1]) {
        case 'issues':
          return 'ISSUE';
        case 'pull':
          return 'CODE_CHANGE';
      }
    }
    return 'CODE_CHANGE';
  },
  processors: [
    // Issue
    {
      // i.e. 'https://github.com/range-labs/mono/issues/8166' -> 'range-labs/mono#8166'
      source_id_processor: (url) => {
        const rePath = /\/(.+)\/(.+)\/issues\/([0-9]+)/;
        const match = url.pathname.match(rePath);
        return match ? `${match[1]}/${match[2]}#${match[3]}` : null;
      },
      // i.e. 'I have an issue · Issue #1234 · range-labs/mono' -> 'Issue #1234: I have an issue'
      title_processor: (t) => {
        return t.split(' · ')[0].trim();
      },
      change_info: (url) => {
        const rePath = /\/(.+)\/(.+)\/issues\/([0-9]+)/;
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
        const rePath = /\/(.+)\/(.+)\/pull\/([0-9]+)/;
        const match = url.pathname.match(rePath);
        return match ? `${match[1]}/${match[2]}#${match[3]}` : null;
      },
      // i.e. 'I have a PR by jmiller101 · Pull Request #1234 · range-labs/mono' -> 'I have a PR'
      title_processor: (t) => {
        const p = t.split(' · ');
        return p[0].split(' by ')[0].trim();
      },
      change_info: (url) => {
        const rePath = /\/(.+)\/(.+)\/pull\/([0-9]+)/;
        const match = url.pathname.match(rePath);
        return {
          change_label: 'PR #',
          change_id: match ? match[3] : null,
        };
      },
    },
  ],
};

// GitHub Enterprise
registerFilter({
  ...base,
  url_regex: [/github(.+)\.com/],
  provider: 'github_enterprise',
  provider_name: (_url) => 'GitHub Enterprise',
});

// Regular GitHub
registerFilter({
  ...base,
  url_regex: [/github\.com/],
  provider: 'github',
  provider_name: (_url) => 'GitHub',
});
