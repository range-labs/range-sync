'use strict';

registerFilter({
  url_regex: [/app\.clickup\.com/],
  provider: 'clickup',
  provider_name: (_url) => 'ClickUp',

  processors: [
    // Documents: /$id/docs/$docid/$pageid
    {
      source_id_processor: (url) => {
        const rePath = /[0-9]+\/docs\/([^\\]+\/[^\\]+)/;
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'Page Title | Document Title'
      title_processor: (t) => {
        const parts = t.split(' | ');
        return parts[1] + ' • ' + parts[0];
      },
      provider_name: (_url) => 'ClickUp Documents',
      type: (_url) => 'DOCUMENT',
    },

    // Goals: /$id/goals/$number
    // No document title for the goal, so not supported.
  ],
});
