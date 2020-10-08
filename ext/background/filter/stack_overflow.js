'use strict';

registerFilter({
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
      title_processor: (t) => {
        return trimLastPart(t, ' - ');
      },
    },
    // Question
    {
      source_id_processor: (url) => {
        const rePath = /questions\/([\d]+)/;
        return reMatch(url.pathname, rePath, 0);
      },
      // i.e. 'my questions - Stack Overflow' -> 'my questions'
      // i.e. 'html - my questions - Stack Overflow' -> 'my questions'
      title_processor: (t) => {
        const reTitle = / - /g;
        const count = (t.match(reTitle) || []).length;
        if (count == 1) {
          return trimLastPart(t, reTitle);
        } else {
          return t.split(reTitle)[1].trim();
        }
      },
    },
  ],
  block_list: { title: [/^Stack Overflow$/] },
});
