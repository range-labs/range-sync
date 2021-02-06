'use strict';

// Bitbucket and Bitbucket Enterprise basically share everything except for
// their names and URLs
const bitbucketBase = {
  parent: (url) => {
    const reName = /\/(.+)\/(.+)\/pull-requests/;
    const nameMatch = url.pathname.match(reName);
    return {
      parent_name: nameMatch ? nameMatch[2] : null,
      parent_description: 'All the code.',
      parent_html_url: url.href,
    };
  },
  type: (_) => 'CODE_CHANGE',
  processors: [
    // NOTE: Issues do not exist in Bitbucket. Bitbucket embeds a JIRA board for
    // bug tracking but does not update the page title or URL to something
    // scrapable. You can view the issues in JIRA, which we also integrate, so
    // this should be fine.
    // Pull Request
    {
      // i.e. 'https://bitbucket.org/jmiller101/extension-testing-repo/pull-requests/1' -> 'extension-testing-repo#1'
      source_id_processor: (url) => {
        const rePath = /\/(.+)\/(.+)\/pull-requests\/([0-9]+)/;
        const match = url.pathname.match(rePath);
        return match ? `${match[2]}#${match[3]}` : null;
      },
      // i.e. 'jmiller101 / extension-testing-repo / Pull Request #1: Woo a commit — Bitbucket' -> 'Woo a commit'
      title_processor: (t) => {
        const i = trimFirstPart(t, ': ');
        return trimLastPart(i, ' — ');
      },
      change_info: (url) => {
        const rePath = /\/pull-requests\/([0-9]+)/;
        const match = url.pathname.match(rePath);
        return {
          change_label: 'PR #',
          change_id: match ? match[1] : null,
        };
      },
    },
  ],
};

// Bitbucket Enterprise
registerFilter({
  ...bitbucketBase,
  url_regex: [/bitbucket(.+)\.org/, /bitbucket(.+)\.com/],
  provider: 'bitbucket_enterprise',
  provider_name: (_url) => 'Bitbucket Enterprise',
});

// Regular Bitbucket
registerFilter({
  ...bitbucketBase,
  url_regex: [/bitbucket\.org/],
  provider: 'bitbucket',
  provider_name: (_url) => 'Bitbucket',
});
