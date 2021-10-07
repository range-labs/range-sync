'use strict';

registerFilter({
  url_regex: [/^app\.shortcut\.com\//],
  provider: 'clubhouse',
  provider_name: (_url) => 'Shortcut',
  type: (_url) => 'TASK',
  processors: [
    {
      source_id_processor: (url) => {
        // https://app.shortcut.com/workspace-slug/story/13/task-name
        const { pathname } = new URL(url);

        // /workspace-slug/story/13/task-name
        const match = pathname.match(/^\/([^\/]+)\/story\/(\d+)(\/[^\/]+)?$/);
        if (!match) {
          return null;
        }
        const [, workspaceSlug, storyId] = match;

        // workspace-slug/13
        return `${workspaceSlug}/${storyId}`;
      },
      title_processor: (title) => {
        // Task Name | Clubhouse
        return title.split('|')[0].trim();
      },
    },
  ],
});
