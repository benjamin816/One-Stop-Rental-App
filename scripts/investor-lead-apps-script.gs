/** Deploy this as a Web app: execute as owner, access anyone. */
const INVESTOR_SHEET_ID = '1S9Umd8a0-X5DKiSjnFuOD4ysyuskMZSft1bxolkYXpw';
const INVESTOR_TAB = 'Investor Leads';
const INVESTOR_ALERT_EMAIL = 'benjamin.carver@exprealty.com';
const INVESTOR_ALLOWED_ORIGINS = [
  'https://www.raleighncguide.com',
  'https://raleighncguide.com'
];

function doPost(e) {
  let submissionId = '';
  let origin = INVESTOR_ALLOWED_ORIGINS[0];
  const lock = LockService.getScriptLock();
  try {
    const lead = JSON.parse(String(e.parameter.payload || '{}'));
    submissionId = cleanInvestorValue_(lead.submissionId, 100);
    origin = cleanInvestorValue_(lead.origin, 120);
    if (INVESTOR_ALLOWED_ORIGINS.indexOf(origin) === -1) throw new Error('Invalid origin.');
    if (!submissionId || !/^[a-zA-Z0-9-]{10,100}$/.test(submissionId)) throw new Error('Invalid submission.');
    if (cleanInvestorValue_(lead.website, 200)) throw new Error('Invalid submission.');
    const firstName = cleanInvestorValue_(lead.firstName, 100);
    const lastName = cleanInvestorValue_(lead.lastName, 100);
    const email = cleanInvestorValue_(lead.email, 254).toLowerCase();
    const phone = cleanInvestorValue_(lead.phone, 40);
    if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.replace(/\D/g, '').length < 10) {
      throw new Error('Name, email, and phone are required.');
    }
    if (lead.contactConsent !== true) throw new Error('Consent is required.');

    lock.waitLock(10000);
    const sheet = SpreadsheetApp.openById(INVESTOR_SHEET_ID).getSheetByName(INVESTOR_TAB);
    if (!sheet) throw new Error('Investor lead tab is missing.');
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const existing = sheet.getRange(2, 3, lastRow - 1, 1).createTextFinder(submissionId).matchEntireCell(true).findNext();
      if (existing) return investorResponse_({ ok: true, submissionId: submissionId }, origin);
    }

    const wantsContact = lead.wantsContact === true;
    const values = [
      new Date(),
      cleanInvestorValue_(lead.source, 100) || 'Rental Calculator',
      submissionId,
      firstName,
      lastName,
      email,
      phone,
      cleanInvestorValue_(lead.investingGoal, 500),
      cleanInvestorValue_(lead.propertyType, 100),
      wantsContact ? 'Yes' : 'No',
      'Yes',
      cleanInvestorValue_(lead.pageUrl, 500),
      cleanInvestorValue_(lead.utmSource, 100),
      cleanInvestorValue_(lead.utmMedium, 100),
      cleanInvestorValue_(lead.utmCampaign, 100),
      wantsContact ? 'Pending' : 'Not requested',
      '',
      'New',
      ''
    ];
    sheet.appendRow(values);
    const row = sheet.getLastRow();
    if (wantsContact) {
      try {
        const body = [
          'New Raleigh investor contact request',
          '',
          'Name: ' + firstName + ' ' + lastName,
          'Email: ' + email,
          'Phone: ' + phone,
          'Investing goal: ' + values[7],
          'Property type: ' + values[8],
          'Source: ' + values[1],
          'Page: ' + values[11],
          'UTM source: ' + values[12],
          'UTM medium: ' + values[13],
          'UTM campaign: ' + values[14],
          'Submitted: ' + new Date().toISOString(),
          'Submission ID: ' + submissionId
        ].join('\n');
        MailApp.sendEmail({
          to: INVESTOR_ALERT_EMAIL,
          subject: 'Raleigh investor wants to be contacted: ' + firstName + ' ' + lastName,
          body: body,
          replyTo: email
        });
        sheet.getRange(row, 16, 1, 2).setValues([['Sent', new Date()]]);
      } catch (mailError) {
        sheet.getRange(row, 16).setValue('Failed: ' + cleanInvestorValue_(mailError, 200));
      }
    }
    return investorResponse_({ ok: true, submissionId: submissionId }, origin);
  } catch (error) {
    return investorResponse_({ ok: false, submissionId: submissionId, error: String(error && error.message || error) }, origin);
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function investorResponse_(result, origin) {
  const target = INVESTOR_ALLOWED_ORIGINS.indexOf(origin) === -1 ? INVESTOR_ALLOWED_ORIGINS[0] : origin;
  const message = JSON.stringify({ type: 'investor-lead-result', ...result }).replace(/</g, '\\u003c');
  return HtmlService.createHtmlOutput('<!doctype html><html><body><script>window.top.postMessage(' + message + ',' + JSON.stringify(target) + ');</script></body></html>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function cleanInvestorValue_(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength).replace(/^[=+@-]/, "'$&");
}
