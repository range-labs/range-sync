'use strict';

registerFilter({
  url_regex: [/medium\.com/],
  provider: 'medium',
  provider_name: (_url) => 'Medium',
  processors: [
    // Story Edit
    {
      source_id_processor: (url) => {
        const rePath = /p\/([0-9a-f]+)\/edit$/;
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'Project Name – Figma' -> 'Project Name'
      title_processor: (t) => `${t.split('–')[0].trim().replace('Editing ', '')}`,
    },
  ],
  block_list: { title: [/^Medium$/] },
});
