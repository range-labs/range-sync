chrome.runtime.getBackgroundPage(bg => {
  bg.getAccounts()
    .then(accounts => {
      if (accounts.length === 0) {
        renderAlert('Please log in to Range', 'warn');
      } else {
        accounts.forEach(renderAccount);
      }
    })
    .catch(e => {
      if (e.code === 7 || e.code === 16) {
        renderAlert('Please log into your Range account', 'warn', 'https://range.co/login');
      } else {
        renderAlert(`Something went wrong: ${e.message}`, 'error');
        console.error('Error fetching accounts:', e);
      }
    });
  bg.getAttachments().then(attachments => {
    if (attachments.length > 0) {
      attachments.forEach(renderAttachmment);
    } else {
      renderAlert('No suggestions captured yet', 'info');
    }
  });
});

function renderAlert(msg, level, opt_action) {
  let el = document.getElementById('alert');
  el.textContent = msg;
  if (opt_action) {
    el.onclick = e => window.open(opt_action);
    el.className = 'alert--link';
  } else {
    delete el.onclick;
    el.className = '';
  }
  document.getElementById('canvas').className = level;
}

function renderAttachmment(attachment) {
  let tmpl = document.getElementById('attachment-template');
  let inst = tmpl.content.cloneNode(true);
  inst.querySelector('.slotName').textContent = attachment.name;
  inst.querySelector('.slotProvider').textContent = attachment.provider_name;
  inst.querySelector('.slotTime').textContent = formatTime(new Date(attachment.display_date));
  inst
    .querySelector('.attachment')
    .addEventListener('click', e => window.open(attachment.html_url), true);
  document.getElementById('main').appendChild(inst);
}

function renderAccount(account) {
  let tmpl = document.getElementById('account-template');
  let inst = tmpl.content.cloneNode(true);
  inst.querySelector('img').src = account.profilePhoto;
  inst.querySelector('.slotOrgName').textContent = account.orgName;
  inst
    .querySelector('.account')
    .addEventListener(
      'click',
      e => window.open(`https://range.co/${account.orgSlug}/compose`),
      true
    );
  document.getElementById('accounts').appendChild(inst);
}

function formatTime(t) {
  if (!t) return 'some time ago';
  const seconds = Math.floor((Date.now() - t) / 1000);
  const years = Math.floor(seconds / 31536000);
  const months = Math.floor(seconds / 2592000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60);
  if (years > 1) return years + ' years ago';
  if (months > 1) return months + ' months ago';
  if (days > 1) return days + ' days ago';
  if (hours > 1) return hours + ' hours ago';
  if (minutes > 1) return minutes + ' minutes ago';
  return Math.floor(seconds) + ' seconds ago';
}
