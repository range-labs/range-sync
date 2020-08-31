'use strict';

register_filter({
  url_regex: [/docs\.google\.com/],
  provider: 'drive',
  provider_name: (url) => {
    const reDocType = /(document|spreadsheets|presentation)/;
    const type = reMatch(url.pathname, reDocType, 0);
    switch (type) {
      case 'document':
        return 'Google Documents';
      case 'spreadsheets':
        return 'Google Sheets';
      case 'presentation':
        return 'Google Slides';
      default:
        return 'Google Drive';
    }
  },
  processors: [
    // Document
    {
      source_id_processor: (url) => {
        const rePath = /\/d\/([a-zA-Z0-9-_]+)/;
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'Document Title - Google Docs' -> 'Document Title'
      title_processor: (t) => t.split(' - ')[0],
    },
  ],
  block_list: { title: [/Google Drive$/] },
});
