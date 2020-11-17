'use strict';

registerFilter({
  url_regex: [/onedrive\.live\.com/, /office\.com/],
  provider: 'live',
  provider_name: (url, title) => {
    if (!url) return 'Microsoft OneDrive';
    const providerName = title.split('-');
    if (providerName[1]) return providerName[1].trim();

    const reDomain = /onedrive\.live\.com|office\.com/;
    const domain = reMatch(url.href, reDomain, 0);
    switch (domain) {
      case 'onedrive.live.com':
        return 'Microsoft OneDrive';
      case 'office.com':
        return 'Microsoft Office Online';
    }
  },
  type: (_url) => 'DOCUMENT',
  subtype: (url, title) => {
    const reDocType = /Excel|PowerPoint|Word|xlsx|pptx|docx/;
    let type = reMatch(url.href, reDocType, 0);
    if (!type) type = reMatch(title, reDocType, 0);
    switch (type) {
      case 'Excel':
        return 'MICROSOFT_EXCEL';
      case 'xlsx':
        return 'MICROSOFT_EXCEL';
      case 'PowerPoint':
        return 'MICROSOFT_POWERPOINT';
      case 'pptx':
        return 'MICROSOFT_POWERPOINT';
      case 'Word':
        return 'MICROSOFT_WORD';
      case 'docx':
        return 'MICROSOFT_WORD';
      default:
        return 'NONE';
    }
  },
  processors: [
    {
      source_id_processor: (url) => {
        let dedupeUrl = decodeURI(url.href);
        const rePath1 = /resid=([a-zA-Z0-9!]+)/;
        const rePath2 = /FormId=([a-zA-Z0-9]+)/; //for Microsoft Forms
        let match = reMatch(dedupeUrl, rePath1, 1);
        return !!match ? match : reMatch(dedupeUrl, rePath2, 1);
      },
      // i.e. 'Title of Doc - Microsoft Word Online' -> 'Title of Doc'
      title_processor: (t) => {
        return trimLastPart(t, ' - ');
      },
    },
  ],
  block_list: { title: [/Microsoft Office Home/, /OneDrive$/], url: [/launch$/] },
});
