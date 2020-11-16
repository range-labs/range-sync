'use strict';

registerFilter({
  url_regex: [/app\.asana\.com/],
  provider: 'asana',
  provider_name: (_url) => 'Asana',
  type: (_url) => 'TASK',
  processors: [
    // Ticket
    {
      source_id_processor: (url) => {
        const rePath = /(?<=0\/[\d]+\/)([\d]+)/;
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'Customers - Planning - Draft slides - Asana' -> 'Draft slides'
      title_processor: (t) => {
        const parts = t.split(' - ');
        return parts[parts.length - 2].trim();
      },
    },
  ],
});
