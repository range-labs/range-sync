'use strict';

const GUID_REGEX =
  '({){0,1}[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(}){0,1}';

const BLOCK_LIST = { title: [/^chrome:\/\//, /^Range/] };

const FILTER = [
  // Asana
  {
    url_regex: [/app\.asana\.com/],
    provider: 'asana',
    provider_name: (_url) => 'Asana',
    processors: [
      // Ticket
      {
        source_id_processor: (url) => {
          const rePath = /(?<=0\/[\d]+\/)([\d]+)/;
          return reMatch(url.pathname, rePath, 0);
        },
        // i.e. 'Customers - Planning - Draft slides - Asana' -> 'Draft slides'
        title_processor: (t) => t.split(' - ')[2].trim(),
      },
    ],
  },
  // Stack Overflow
  {
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
  },
  // GitHub
  {
    url_regex: [/github\.com\/.+/],
    provider: 'github',
    provider_name: (_url) => 'GitHub',
    processors: [
      // Issue
      {
        source_id_processor: (url) => {
          const rePath = /([a-z-\/]+)\/issues\/[0-9]+/;
          return reMatch(url.pathname, rePath, 0);
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
          const rePath = /([a-z-\/]+)\/pull\/[0-9]+/;
          return reMatch(url.pathname, rePath, 0);
        },
        // i.e. 'I have a PR · Pull Request #1234 · range-labs/mono' -> 'I have a PR (PR #1234)'
        title_processor: (t) => {
          const p = t.split(' · ');
          return `${p[0].trim()} (PR #${p[1].split('#')[1]})`;
        },
      },
    ],
  },
  // Gmail
  {
    url_regex: [/mail\.google\.com/],
    provider: 'gmail',
    provider_name: (_url) => 'Gmail',
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
  },
  // Google Docs
  {
    url_regex: [/docs\.google\.com/],
    provider: 'drive',
    provider_name: (url) => {
      const reDocType = /(document|spreadsheets|presentation)/;
      const type = reMatch(url.pathname, reDocType, 0);
      switch (type) {
        case 'document':
          return 'Google Documents';
        case 'spreadsheets':
          return 'Google Sheets';
        case 'presentation':
          return 'Google Slides';
        default:
          return 'Google Drive';
      }
    },
    processors: [
      // Document
      {
        source_id_processor: (url) => {
          const rePath = /\/d\/([a-zA-Z0-9-_]+)/;
          return reMatch(url.pathname, rePath, 0);
        },
        // i.e. 'Document Title - Google Docs' -> 'Document Title'
        title_processor: (t) => t.split(' - ')[0],
      },
    ],
    block_list: { title: [/Google Drive$/] },
  },
  // Lever
  {
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
  },
  // Metabase
  {
    url_regex: [/metabase\..*/],
    provider: 'metabase',
    provider_name: (_url) => 'Metabase',
    processors: [
      // Question
      {
        source_id_processor: (url) => {
          const rePath = /question\/[0-9]+/;
          return reMatch(url.pathname, rePath, 0);
        },
        // i.e. 'How many users so we have? · Metabase' -> 'How many users so we have?'
        title_processor: (t) => t.split('·')[0].trim(),
      },
      // Dashboard
      {
        source_id_processor: (url) => {
          const rePath = /dashboard\/[0-9]+/;
          return reMatch(url.pathname, rePath, 0);
        },
        // i.e. 'General Metrics · Dashboard · Metabase' -> 'General Metrics'
        title_processor: (t) => t.split('·')[0].trim(),
      },
    ],
    block_list: { title: [/^Question/, /^Metabase/] },
  },
  // Figma
  {
    url_regex: [/figma\.com/],
    provider: 'figma',
    provider_name: (_url) => 'Figma',
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
  },
  // Medium
  {
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
  },
  // Dropbox Paper
  {
  url_regex: [/dropbox\.com\/.*\.paper/],
    provider: 'dropbox_paper',
    provider_name: (_url) => 'Dropbox Paper',
    processors: [
      // Document
      {
        source_id_processor: (url) => {
          const rePath = /scl\/fi\/[a-z0-9]+/;
          return reMatch(url.pathname, rePath, 0);
        },
        title_processor: (t) => t,
      },
    ],
  },
];

function reMatch(str, re, index) {
  const match = str.match(re);
  return match ? match[index] : null;
}
