'use strict';

const GUID_REGEX =
  '({){0,1}[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(}){0,1}';

const BLOCK_LIST = { title: [/^chrome:\/\//, /^Range/] };

const FILTERS = [];

function registerFilter(filter) {
  FILTERS.push(filter);
}

function reMatch(str, re, index) {
  const match = str.match(re);
  return match ? match[index] : null;
}