'use strict';

registerFilter({
  url_regex: [/hire\.lever\.co\/.+/],
  provider: 'lever',
  provider_name: (_url) => 'Lever',
  processors: [
    // Candidate
    {
      source_id_processor: (url) => {
        const rePath = new RegExp(`candidates\\/${GUID_REGEX}`);
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'Full Name - Lever Hire' -> 'Full Name'
      title_processor: (t) => `${t.split('–')[0].trim()} (Candidate)`,
    },
    // Interview
    {
      source_id_processor: (url) => {
        const rePath = new RegExp(`interviews\\/${GUID_REGEX}`);
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'Full Name - Lever Hire' -> 'Full Name'
      title_processor: (t) => `${t.split('–')[0].trim()} (Interview)`,
    },
  ],
  block_list: {
    title: [/Lever Hire/],
    url: [/\/candidates\?/],
  },
});
