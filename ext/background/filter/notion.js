'use strict';

registerFilter({
  url_regex: [/^www\.notion\.so\//],
  provider: 'notion',
  provider_name: (_url) => 'Notion',
  type: (_url) => 'DOCUMENT',
  processors: [
    {
      source_id_processor: (url) => {
        // https://www.notion.so/Development-Lifecycle-1d5b23c7ac364a0fa286b5fbfaeff687
        // https://www.notion.so/49e5279dce9e4d3bb346360b5395b6ab?v=76e0143acc9e4db7a053f694fdc0a9a1
        const { pathname } = new URL(url);

        // /Development-Lifecycle-1d5b23c7ac364a0fa286b5fbfaeff687
        // /49e5279dce9e4d3bb346360b5395b6ab
        const [, fullIdentifier, hasSubdirectory] = pathname.split('/');
        if (hasSubdirectory) {
          return null;
        }

        const match = fullIdentifier.match(/\b([a-z0-9]{32})$/);
        if (match) {
          // 1d5b23c7ac364a0fa286b5fbfaeff687
          // 49e5279dce9e4d3bb346360b5395b6ab
          return match[1];
        }
        return null;
      },
      title_processor: (title) => {
        // To-Do  | By Status
        // Engineering Wiki
        return title.split('|')[0].trim();
      },
    },
  ],
});
