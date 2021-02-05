'use strict';

registerFilter({
  url_regex: [/app\.box\.com/],
  provider: 'box',
  provider_name: (url, title) => {
    if (title) {
      const reDocType = /(gdoc|gsheet|gslides|xlsx|pptx|docx)/;
      const type = reMatch(title, reDocType, 0);
      switch (type) {
        case 'gdoc':
          return 'Google Documents';
        case 'gsheet':
          return 'Google Sheets';
        case 'gslides':
          return 'Google Slides';
        case 'xlsx':
        case 'pptx':
        case 'docx':
          return 'Microsoft Office Online';
      }
    }

    if (url) {
      const reDocType = /(notes|web_link|googledss|box_for_office_online)/;
      const type = reMatch(url.pathname, reDocType, 0);
      switch (type) {
        case 'notes':
        case 'web_link':
          return 'Box';
        case 'googledss':
          return 'Google Drive';
        case 'box_for_office_online':
          return 'Microsoft Office Online';
      }
    }

    return 'Box';
  },
  type: (_url) => 'DOCUMENT',
  processors: [
    // File
    {
      source_id_processor: (url) => {
        const rePath = /\/file\/([0-9]+)/;
        return reMatch(url.pathname, rePath, 1);
      },
      // i.e. 'Document Title.ext' -> 'Document Title'
      title_processor: (t) => trimExtension(t),
    },
    // Web link
    {
      source_id_processor: (url) => {
        const rePath = /\/web_link\/([0-9]+)/;
        return reMatch(url.pathname, rePath, 1);
      },
      // i.e. 'Document Title' -> 'Document Title'
      title_processor: (t) => t,
    },
    // Box note
    {
      source_id_processor: (url) => {
        const rePath = /\/notes\/([0-9]+)/;
        return reMatch(url.pathname, rePath, 1);
      },
      // i.e. 'Document Title' -> 'Document Title'
      title_processor: (t) => t,
    },
    // Google Drive
    {
      source_id_processor: (url) => {
        const rePath = /\/integrations\/googledss\/.*fileId=[0-9]+/;
        return reMatch(url.pathname, rePath, 2);
      },
      // i.e. 'Document Title on Box for G Suite - powered by Box' -> 'Document Title'
      title_processor: (t) => {
        return trimLastPart(t, ' on Box for G Suite');
      },
    },
    // Microsoft Office Online
    {
      source_id_processor: (url) => {
        const rePath = /\/services\/box_for_office_online\/.*fileId=[0-9]+/;
        return reMatch(url.pathname, rePath, 2);
      },
      // i.e. 'Document Title on Box for G Suite - powered by Box' -> 'Document Title'
      title_processor: (t) => {
        return trimLastPart(t, ' on Box for G Suite');
      },
    },
  ],
  block_list: { title: [/^Box \| Simple Online Collaboration$/], url: [/app\.box\.com\/folder/] },
});
