'use strict';

const REGEX = [
  // Stack Overflow User
  {
    url_regex: [/.*stackoverflow\.com\/.*/, /.*stackenterprise\.co\/.*/],
    page_regex: /users\/([\d\w]+)/,
    provider: 'stackoverflow',
    provider_name: 'Stack Overflow',
  },
  // Stack Overflow Question
  {
    url_regex: [/.*stackoverflow\.com\/.*/, /.*stackenterprise\.co\/.*/],
    page_regex: /questions\/([\d]+)/,
    provider: 'stackoverflow',
    provider_name: 'Stack Overflow',
  },
];
