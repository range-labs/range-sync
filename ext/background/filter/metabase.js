'use strict';

registerFilter({
  url_regex: [/metabase\..*/],
  provider: 'metabase',
  provider_name: (_url) => 'Metabase',
  processors: [
    // Question
    {
      source_id_processor: (url) => {
        const rePath = /question\/[0-9]+/;
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'How many users so we have? · Metabase' -> 'How many users so we have?'
      title_processor: (t) => t.split('·')[0].trim(),
    },
    // Dashboard
    {
      source_id_processor: (url) => {
        const rePath = /dashboard\/[0-9]+/;
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'General Metrics · Dashboard · Metabase' -> 'General Metrics'
      title_processor: (t) => t.split('·')[0].trim(),
    },
  ],
  block_list: { title: [/^Question/, /^Metabase/] },
});
