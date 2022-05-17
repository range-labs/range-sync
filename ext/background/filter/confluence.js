'use strict';

registerFilter({
  url_regex: [/atlassian\.net\/wiki/],
  provider: 'confluence',
  provider_name: (_url) => 'Confluence',
  type: (_url) => 'DOCUMENT',
  processors: [
    // Document
    {
      source_id_processor: (url) => {
        const parts = url.pathname.split('/');
        if (parts.length != 7) return null;

        const projectId = parts[3];
        let documentId;

        const reEdit = /\/edit(?:-v2)?\//;
        if (reEdit.test(url)) {
          // "/wiki/spaces/RR/pages/edit-v2/12345"
          documentId = parts[6];
        } else {
          // "/wiki/spaces/RR/pages/12345/My+first+confluence+document"
          documentId = parts[5];
        }

        return `${projectId}-${documentId}`;
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
