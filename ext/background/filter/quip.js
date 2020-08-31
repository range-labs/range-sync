'use strict';

registerFilter({
  url_regex: [/\.quip\.com/],
  provider: 'quip',
  provider_name: (_url) => 'Quip',
  processors: [
    // Document
    {
      source_id_processor: (url) => {
        const rePath = /^\/([A-Za-z0-9]+)\/.+/;
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'Title of Doc - Quip' -> 'Title of Doc'
      title_processor: (t) => t.split(' - ')[0],
    },
  ],
  block_list: { url: [/folder/] },
});
