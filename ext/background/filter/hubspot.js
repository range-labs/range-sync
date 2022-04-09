'use strict';

registerFilter({
  url_regex: [/app\.hubspot\.com\/.+/],
  provider: 'hubspot',
  provider_name: (_url) => 'HubSpot',
  processors: [
    // Lists.
    {
      source_id_processor: (url) => {
        const rePath = new RegExp(`\/contacts\/[0-9]+\/lists\/[0-9]+`);
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'List Name | Lists' -> 'List Name'
      title_processor: (t) => `${t.split('|')[0].trim()}`,
    },
    // Contact.
    {
      source_id_processor: (url) => {
        const rePath = new RegExp(`\/contacts/[0-9]+\/contact\/[0-9]+`);
        return reMatch(url.pathname, rePath, 0);
      },
      title_processor: (t) => `${t}`,
    },
    // Company.
    {
      source_id_processor: (url) => {
        const rePath = new RegExp(`\/contacts/[0-9]+\/company\/[0-9]+`);
        return reMatch(url.pathname, rePath, 0);
      },
      title_processor: (t) => `${t}`,
    },
    // Deal.
    {
      source_id_processor: (url) => {
        const rePath = new RegExp(`\/contacts/[0-9]+\/deal\/[0-9]+`);
        return reMatch(url.pathname, rePath, 0);
      },
      title_processor: (t) => `${t} • Deal`,
    },
  ],
});
