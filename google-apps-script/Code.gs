/**
 * Portfolio contact form — Google Apps Script web app.
 *
 * Paste this file into a new Apps Script project (script.google.com).
 *
 * Recipient (pick one):
 *   1. Replace TO_EMAIL below with your address, or
 *   2. Project Settings → Script properties → TO_EMAIL = you@yourdomain.com
 *      (script property wins if set)
 *
 * Spreadsheet log (optional; email still sends if unset):
 *   1. Create a blank Google Sheet, copy the ID from the URL
 *      (https://docs.google.com/spreadsheets/d/SHEET_ID/edit)
 *   2. Replace SHEET_ID below, or set Script property SHEET_ID
 *      (script property wins if set)
 *   3. Optional: SHEET_NAME constant or Script property (default: Submissions)
 *   4. Share the Sheet with the Google account that runs this script
 *      (same account = already fine)
 *
 * Deploy:
 *   Deploy → New deployment → Type: Web app
 *   Execute as: Me
 *   Who has access: Anyone
 *   Copy the /exec URL into scripts/config.js (googleScriptWebAppUrl)
 *
 * After editing this file, Deploy → Manage deployments → Edit → New version.
 */

var TO_EMAIL = 'YOUR_EMAIL@example.com';
var SHEET_ID = 'YOUR_SHEET_ID';
var SHEET_NAME = 'Submissions';

var MAX_NAME = 200;
var MAX_EMAIL = 254;
var MAX_SUBJECT = 200;
var MAX_MESSAGE = 5000;

function doGet() {
  return jsonOutput({ ok: true, service: 'portfolio-contact' });
}

function doPost(e) {
  try {
    var data = parsePayload(e);

    if (honeypotFilled(data)) {
      return jsonOutput({ ok: true });
    }

    var fields = normalizeFields(data);
    var error = validateFields(fields);
    if (error) {
      return jsonOutput({ ok: false, error: error });
    }

    var recipient = getRecipient();
    if (!recipient || recipient.indexOf('YOUR_EMAIL@') !== -1) {
      return jsonOutput({ ok: false, error: 'Recipient is not configured.' });
    }

    sendContactEmail(recipient, fields);
    appendToSheet(fields);
    return jsonOutput({ ok: true });
  } catch (err) {
    if (err && String(err.message) === 'INVALID_JSON') {
      return jsonOutput({ ok: false, error: 'Invalid request.' });
    }
    return jsonOutput({ ok: false, error: 'The message could not be sent.' });
  }
}

function getRecipient() {
  var fromProps = PropertiesService.getScriptProperties().getProperty('TO_EMAIL');
  if (fromProps && String(fromProps).trim()) {
    return String(fromProps).trim();
  }
  return TO_EMAIL;
}

function getConfiguredValue(propertyName, fallback) {
  var fromProps = PropertiesService.getScriptProperties().getProperty(propertyName);
  if (fromProps && String(fromProps).trim()) {
    return String(fromProps).trim();
  }
  return fallback;
}

function getSheetId() {
  return getConfiguredValue('SHEET_ID', SHEET_ID);
}

function getSheetName() {
  return getConfiguredValue('SHEET_NAME', SHEET_NAME) || 'Submissions';
}

function isSheetIdConfigured(id) {
  var trimmed = String(id || '').trim();
  return !!(trimmed && trimmed.indexOf('YOUR_SHEET') === -1);
}

function appendToSheet(fields) {
  try {
    var sheetId = getSheetId();
    if (!isSheetIdConfigured(sheetId)) {
      console.warn('SHEET_ID is not set. Skipping sheet write; email was still sent. Set Script property SHEET_ID or the SHEET_ID constant.');
      return;
    }

    var spreadsheet = SpreadsheetApp.openById(sheetId);
    var tabName = getSheetName();
    var sheet = spreadsheet.getSheetByName(tabName);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(tabName);
      sheet.appendRow(['Timestamp', 'Name', 'Email', 'Subject', 'Message']);
    } else if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Name', 'Email', 'Subject', 'Message']);
    }

    sheet.appendRow([
      new Date(),
      fields.name,
      fields.email,
      fields.subject || '',
      fields.message
    ]);
  } catch (err) {
    console.warn('Sheet write failed (email was still sent): ' + err);
  }
}

function parsePayload(e) {
  var data = {};
  if (!e) return data;

  if (e.parameter) {
    Object.keys(e.parameter).forEach(function (key) {
      data[key] = e.parameter[key];
    });
  }

  if (e.postData && e.postData.contents) {
    var contents = String(e.postData.contents);
    if (!contents.replace(/^\s+|\s+$/g, '')) {
      return data;
    }
    var type = String(e.postData.type || '').toLowerCase();
    var parsed = null;
    var shouldParse = type.indexOf('application/json') !== -1 || type.indexOf('text/plain') !== -1 || looksLikeJson(contents);

    if (shouldParse) {
      try {
        parsed = JSON.parse(contents);
      } catch (err) {
        throw new Error('INVALID_JSON');
      }
    }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      Object.keys(parsed).forEach(function (key) {
        data[key] = parsed[key];
      });
    } else if (parsed != null) {
      throw new Error('INVALID_JSON');
    }
  }

  return data;
}

function looksLikeJson(contents) {
  var trimmed = contents.replace(/^\s+/, '');
  return trimmed.charAt(0) === '{';
}

function honeypotFilled(data) {
  var names = ['bot-field', 'honeypot', '_gotcha'];
  for (var i = 0; i < names.length; i++) {
    if (String(data[names[i]] || '').trim()) return true;
  }
  return false;
}

function normalizeFields(data) {
  var first = clip(str(data.first_name), MAX_NAME);
  var last = clip(str(data.last_name), MAX_NAME);
  var combined = clip(str(data.name), MAX_NAME);
  var name = combined || [first, last].filter(Boolean).join(' ');

  return {
    name: clip(name, MAX_NAME),
    email: clip(str(data.email).toLowerCase(), MAX_EMAIL),
    subject: clip(str(data.subject), MAX_SUBJECT),
    message: clip(str(data.message), MAX_MESSAGE)
  };
}

function validateFields(fields) {
  if (!fields.name) return 'Name is required.';
  if (!fields.email) return 'Email is required.';
  if (!isValidEmail(fields.email)) return 'Email is invalid.';
  if (!fields.message) return 'Message is required.';
  return '';
}

function clip(value, max) {
  return String(value || '').slice(0, max);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function str(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/^\s+|\s+$/g, '');
}

function sendContactEmail(recipient, fields) {
  var subject = fields.subject
    ? 'Portfolio contact: ' + fields.subject
    : 'New portfolio contact from ' + fields.name;

  var body = [
    'New message from the portfolio contact form.',
    '',
    'Name: ' + fields.name,
    'Email: ' + fields.email,
    'Subject: ' + (fields.subject || '(none)'),
    '',
    'Message:',
    fields.message
  ].join('\n');

  MailApp.sendEmail({
    to: recipient,
    replyTo: fields.email,
    subject: subject,
    body: body
  });
}

function jsonOutput(obj) {
  // TEXT (not JSON) avoids a CORS preflight on the redirected googleusercontent response.
  var payload = obj && typeof obj === 'object' ? obj : { ok: false, error: 'The message could not be sent.' };
  var body;
  try {
    body = JSON.stringify(payload);
  } catch (err) {
    body = '{"ok":false,"error":"The message could not be sent."}';
  }
  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.TEXT);
}
