'use strict';

registerFilter({
  url_regex: [/monday\.com/],
  provider: 'monday',
  provider_name: (_url) => 'Monday',
  type: (_url) => 'TASK',
  processors: [
    // Task
    {
      source_id_processor: (url) => {
        const rePath = /\/pulses\/([0-9]+)$/;
        return reMatch(url.pathname, rePath, 1);
      },
      // i.e. 'Team Board - Task 1' -> 'Task 1'
      title_processor: (t) => trimFirstPart(t, ' - '),
    },
  ],
});
