'use strict';

(() => {
  registerFilter({
    url_regex: [/atlassian\.net\/browse\//],
    provider: 'jira',
    provider_name: (_url) => 'Jira',
    type: (_url) => 'ISSUE',
    processors: [
      {
        source_id_processor: (url) => {
          const hostname = toHostname(url);
          const issueKey = toIssueKey(url);
          if (!issueKey) {
            return null;
          }

          return `${hostname}/${issueKey}`;
        },
        title_processor: (title) => {
          if (title.endsWith(' - Jira')) {
            title = trimLastPart(title, ' - ');
          }
          if (title.startsWith('[')) {
            // The leading issue key will be included in the issue_info.
            // Remove the leading leading "[AB-1] ".
            title = title.replace(/^\[[^\]]+\]\s*/, '');
          }
          return title;
        },
        issue_info: (url) => {
          const issueKey = toIssueKey(url);
          if (issueKey) {
            return {
              issue_id: issueKey,
            };
          }

          return null;
        },
      },
    ],
  });

  function toIssueKey(url) {
    const a = document.createElement('a');
    a.href = url;
    // https://workspace-slug.atlassian.net/browse/AB-1
    return reMatch(a.pathname, /^\/browse\/([^\/]+)$/, 1);
  }

  function toHostname(url) {
    const a = document.createElement('a');
    a.href = url;
    return a.hostname;
  }
})();
