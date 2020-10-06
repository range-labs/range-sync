'use strict';

// This is currently disabled. Reenable it by adding the file to
// background.scripts in manifest.json
registerFilter({
  url_regex: [/mail\.google\.com/],
  provider: 'gmail',
  provider_name: (_url) => 'Gmail',
  type: (_url) => 'DOCUMENT',
  processors: [
    // Email
    {
      source_id_processor: (url) => {
        const reHash = /[a-zA-z]+$/;
        return reMatch(url.hash, reHash, 0);
      },
      // i.e. 'Fwd: Action required: Email title - me@domain.com - My Email Account' -> 'Fwd: Action required: Email title'
      title_processor: (t) => t.split(' - ')[0],
    },
  ],
  block_list: {
    title: [
      /^Inbox/,
      /^Sent Mail/,
      /^Starred/,
      /^Snoozed/,
      /^Drafts/,
      /^Important/,
      /^\(no subject\)/,
    ],
    url: [/inbox$/, /sent$/, /starred$/, /snoozed$/, /drafts$/, /important$/],
  },
});
