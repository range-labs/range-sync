'use strict';

registerFilter({
  url_regex: [/app\.lucidchart\.com/],
  provider: 'lucid_chart',
  provider_name: (_url) => 'Lucid Chart',
  processors: [
    {
      source_id_processor: (url) => {
        const rePath = new RegExp(`documents\\/edit\\/${GUID_REGEX}`);
        return reMatch(url.pathname, rePath, 0);
      },
      title_processor: (t) => t.split(': ')[0].trim(),
    },
  ],
});
