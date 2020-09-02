'use strict';

registerFilter({
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
  type: (_url) => 'DOCUMENT',
  subtype: (url) => {
    const reDocType = /(document|spreadsheets|presentation)/;
    const type = reMatch(url.pathname, reDocType, 0);
    switch (type) {
      case 'document':
        return 'GOOGLE_DOCUMENT';
      case 'spreadsheets':
        return 'GOOGLE_SPREADSHEET';
      case 'presentation':
        return 'GOOGLE_PRESENTATION';
      default:
        return 'GOOGLE_DRIVE';
    }
  },
  processors: [
    // Document
    {
      source_id_processor: (url) => {
        const rePath = /\/d\/([a-zA-Z0-9-_]+)/;
        return reMatch(url.pathname, rePath, 1);
      },
      // i.e. 'Document Title - Google Docs' -> 'Document Title'
      title_processor: (t) => {
        const parts = t.split(' - ');
        parts.pop();
        return parts.join(' - ');
      },
    },
  ],
  block_list: { title: [/Google Drive$/] },
});
