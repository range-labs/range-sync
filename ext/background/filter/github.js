'use strict';

registerFilter({
  url_regex: [/github\.com\/.+/],
  provider: 'github',
  provider_name: (_url) => 'GitHub',
  type: (_url) => 'CODE_CHANGE',
  processors: [
    // Issue
    {
      // i.e. 'https://github.com/range-labs/mono/issues/8166' -> 'range-labs/mono#8166'
      source_id_processor: (url) => {
        const rePath = /\.com\/(.+)\/(.+)\/issues\/([0-9]+)/;
        const match = url.href.match(rePath);
        return match ? `${match[1]}/${match[2]}#${match[3]}` : null;
      },
      // i.e. 'I have an issue · Issue #1234 · range-labs/mono' -> 'Issue #1234: I have an issue'
      title_processor: (t) => {
        return t.split(' · ')[0].trim();
      },
    },
    // Pull Request
    {
      // i.e. 'https://github.com/range-labs/mono/pull/8166' -> 'range-labs/mono#8166'
      source_id_processor: (url) => {
        const rePath = /\.com\/(.+)\/(.+)\/pull\/([0-9]+)/;
        const match = url.href.match(rePath);
        return match ? `${match[1]}/${match[2]}#${match[3]}` : null;
      },
      // i.e. 'I have a PR by jmiller101 · Pull Request #1234 · range-labs/mono' -> 'I have a PR'
      title_processor: (t) => {
        const p = t.split(' · ');
        return p[0].split(' by ')[0].trim();
      },
    },
  ],
});
