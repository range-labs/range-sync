'use strict';

registerFilter({
  url_regex: [/dropbox\.com\/.*\.paper/, /paper\.dropbox\.com/],
  provider: 'dropbox_paper',
  provider_name: (_url) => 'Dropbox Paper',
  type: (_url) => 'DOCUMENT',
  subtype: (_url) => 'DROPBOX_FILE',
  processors: [
    // Document
    {
      source_id_processor: (url) => {
        const rePath1 = /scl\/fi\/[a-z0-9]+/;
        const rePath2 = /\/doc\/.*--(.*$)/;
        const match1 = reMatch(url.pathname, rePath1, 0);
        return !!match1 ? match1 : reMatch(url.pathname, rePath2, 1);
      },
      title_processor: (t) => trimLastPart(t, ' – '),
    },
  ],
});
