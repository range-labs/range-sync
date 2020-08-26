'use strict';

const GUID_REGEX =
  '({){0,1}[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(}){0,1}';

const BLOCK_LIST = {
  title: [/^chrome:\/\//],
};

const FILTER = [
  // Asana
  {
    url_regex: [/app\.asana\.com/],
    provider: 'asana',
    provider_name: 'Asana',
    processors: [
      // Ticket
      {
        source_id_processor: (url) => {
          const pathRegex = /(?<=0\/[\d]+\/)([\d]+)/;
          return reMatch(url.pathname, pathRegex, 0);
        },
        // i.e. 'Customers - Planning - Draft slides - Asana' -> 'Draft slides'
        title_processor: (t) => t.split(' - ')[2].trim(),
      },
    ],
    block_list: [/board$/],
  },
  // Stack Overflow
  {
    url_regex: [/stackoverflow\.com/, /stackenterprise\.co/],
    provider: 'stackoverflow',
    provider_name: 'Stack Overflow',
    processors: [
      // User
      {
        source_id_processor: (url) => {
          const pathRegex = /users\/([\d\w]+)/;
          return reMatch(url.pathname, pathRegex, 0);
        },
        // i.e. 'username - Stack Overflow' -> 'username'
        title_processor: (t) => t.split(' - ')[0].trim(),
      },
      // Question
      {
        source_id_processor: (url) => {
          const pathRegex = /questions\/([\d]+)/;
          return reMatch(url.pathname, pathRegex, 0);
        },
        // i.e. 'html - my questions - Stack Overflow' -> 'my questions'
        title_processor: (t) => t.split(' - ')[1].trim(),
      },
    ],
  },
  // GitHub
  {
    url_regex: [/github\.com\/.+/],
    provider: 'github',
    provider_name: 'GitHub',
    processors: [
      // Issue
      {
        source_id_processor: (url) => {
          const pathRegex = /([a-z-\/]+)\/issues\/[0-9]+/;
          return reMatch(url.pathname, pathRegex, 0);
        },
        // i.e. 'I have an issue · Issue #1234 · range-labs/mono' -> 'I have an issue (Issue #1234)'
        title_processor: (t) => {
          const p = t.split(' · ');
          return `${p[0].trim()} (${p[1].trim()})`;
        },
      },
      // Pull Request
      {
        source_id_processor: (url) => {
          const pathRegex = /([a-z-\/]+)\/pull\/[0-9]+/;
          return reMatch(url.pathname, pathRegex, 0);
        },
        // i.e. 'I have a PR · Pull Request #1234 · range-labs/mono' -> 'I have a PR (PR #1234)'
        title_processor: (t) => {
          const p = t.split(' · ');
          return `${p[0].trim()} (PR #${p[1].split('#')[1]})`;
        },
      },
    ],
    block_list: {
      url: [/\/pulls/],
    },
  },
  // Gmail
  {
    url_regex: [/mail\.google\.com/],
    provider: 'gmail',
    provider_name: 'Gmail',
    processors: [
      // Email
      {
        source_id_processor: (url) => {
          const hashRegex = /[a-zA-z]+$/;
          return reMatch(url.hash, hashRegex, 0);
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
  },
  // Lever
  {
    url_regex: [/hire\.lever\.co\/.+/],
    provider: 'lever',
    provider_name: 'Lever',
    processors: [
      // Candidate
      {
        source_id_processor: (url) => {
          const pathRegex = new RegExp(`candidates\\/${GUID_REGEX}`);
          return reMatch(url.pathname, pathRegex, 0);
        },
        // i.e. 'Full Name - Lever Hire' -> 'Full Name'
        title_processor: (t) => `${t.split('–')[0].trim()} (Candidate)`,
      },
      // Interview
      {
        source_id_processor: (url) => {
          const pathRegex = new RegExp(`interviews\\/${GUID_REGEX}`);
          return reMatch(url.pathname, pathRegex, 0);
        },
        // i.e. 'Full Name - Lever Hire' -> 'Full Name'
        title_processor: (t) => `${t.split('–')[0].trim()} (Interview)`,
      },
    ],
    block_list: {
      title: [/Lever Hire/],
      url: [/\/candidates\?/],
    },
  },
  // Metabase
  {
    url_regex: [/metabase\..*/],
    provider: 'metabase',
    provider_name: 'Metabase',
    processors: [
      // Question
      {
        source_id_processor: (url) => {
          const pathRegex = /question\/[0-9]+/;
          return reMatch(url.pathname, pathRegex, 0);
        },
        // i.e. 'How many users so we have? · Metabase' -> 'How many users so we have?'
        title_processor: (t) => t.split('·')[0].trim(),
      },
      // Dashboard
      {
        source_id_processor: (url) => {
          const pathRegex = /dashboard\/[0-9]+/;
          return reMatch(url.pathname, pathRegex, 0);
        },
        // i.e. 'General Metrics · Dashboard · Metabase' -> 'General Metrics'
        title_processor: (t) => t.split('·')[0].trim(),
      },
    ],
    block_list: {
      title: [/^Question/, /^Metabase/],
      // Metabase collections just have the title "Metabase" which is kinda useless
      // for our purposes
      url: [/\/collection\/[0-9]+$/],
    },
  },
];

function reMatch(str, re, index) {
  const match = str.match(re);
  return match ? match[index] : null;
}
