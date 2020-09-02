'use strict';

registerFilter({
  url_regex: [/figma\.com/],
  provider: 'figma',
  provider_name: (_url) => 'Figma',
  type: (_url) => 'DOCUMENT',
  subtype: (_url) => 'FIGMA_DOCUMENT',
  processors: [
    // Project
    {
      source_id_processor: (url) => {
        const rePath = /project\/[0-9]+/;
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'Project Name – Figma' -> 'Project Name'
      title_processor: (t) => `${t.split('–')[0].trim()} (Project)`,
    },
    // Document
    {
      source_id_processor: (url) => {
        const rePath = /file\/[a-zA-Z0-9]+/;
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'File Name – Figma' -> 'File Name'
      title_processor: (t) => `${t.split('–')[0].trim()} (File)`,
    },
  ],
});
