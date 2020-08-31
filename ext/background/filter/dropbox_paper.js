'use strict';

register_filter({
  url_regex: [/dropbox\.com\/.*\.paper/],
  provider: 'dropbox_paper',
  provider_name: (_url) => 'Dropbox Paper',
  processors: [
    // Document
    {
      source_id_processor: (url) => {
        const rePath = /scl\/fi\/[a-z0-9]+/;
        return reMatch(url.pathname, rePath, 0);
      },
      title_processor: (t) => t,
    },
  ],
});
