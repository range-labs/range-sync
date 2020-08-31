'use strict';

registerFilter({
  url_regex: [/atlassian\.net\/wiki/],
  provider: 'confluence',
  provider_name: (_url) => 'Confluence',
  processors: [
    // Document
    {
      source_id_processor: (url) => {
        const parts = url.pathname.split('/');
        if (parts.length != 7) return null;

        const reEdit = /\/edit(?:-v2)?\//;
        if (reEdit.test(url)) {
          return `${parts[2]}-${parts[5]}`;
        } else {
          return `${parts[2]}-${parts[4]}`;
        }
      },
      // i.e. 'Edit - Here's a neat document - Range Labs - Confluence' -> 'Here's a neat document'
      // i.e. 'Here's a neat document - Range Labs - Confluence' -> 'Here's a neat document'
      title_processor: (t) => {
        if (t.startsWith('Edit - ')) {
          return t.split(' - ')[1].trim() + ' (Edited)';
        }
        return t.split(' - ')[0].trim();
      },
    },
  ],
});
