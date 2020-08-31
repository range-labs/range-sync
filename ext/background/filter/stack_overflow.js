'use strict';

register_filter({
  url_regex: [/stackoverflow\.com/, /stackenterprise\.co/],
  provider: 'stackoverflow',
  provider_name: (_url) => 'Stack Overflow',
  processors: [
    // User
    {
      source_id_processor: (url) => {
        const rePath = /users\/([\d\w]+)/;
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'username - Stack Overflow' -> 'username'
      title_processor: (t) => t.split(' - ')[0].trim(),
    },
    // Question
    {
      source_id_processor: (url) => {
        const rePath = /questions\/([\d]+)/;
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'html - my questions - Stack Overflow' -> 'my questions'
      title_processor: (t) => t.split(' - ')[1].trim(),
    },
  ],
});
