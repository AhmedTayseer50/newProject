const crypto = require('crypto');
const { isProductionRuntime, isTrue } = require('./runtime');

function safeValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function getTransactionObject(req) {
  if (req.body?.obj) return req.body.obj;
  if (req.body && typeof req.body === 'object' && req.body.id) return req.body;
  if (req.query && req.query.id) return req.query;
  return null;
}

function getConfiguredCallbackToken() {
  return String(process.env.PAYMOB_CALLBACK_TOKEN || '').trim();
}

function getProvidedCallbackToken(req) {
  return String(
    req.query?.token || req.query?.callbackToken || req.headers['x-paymob-callback-token'] || ''
  ).trim();
}

function isConfiguredMockMode() {
  return isTrue(process.env.PAYMOB_MOCK_MODE);
}

function isMockModeAllowed() {
  return isConfiguredMockMode() && !isProductionRuntime();
}

function assertMockModeAllowed() {
  if (!isMockModeAllowed()) {
    const error = new Error('Mock payment flow is disabled');
    error.statusCode = 404;
    throw error;
  }
}

function assertCallbackToken(req) {
  const expected = getConfiguredCallbackToken();
  if (!expected) {
    return;
  }

  const provided = getProvidedCallbackToken(req);
  if (provided && provided === expected) {
    return;
  }

  const error = new Error('Invalid callback token');
  error.statusCode = 401;
  throw error;
}

function shouldRequireProtectedCallback() {
  if (isProductionRuntime()) {
    return true;
  }

  return isTrue(process.env.PAYMOB_REQUIRE_PROTECTED_CALLBACK);
}

function buildPaymobHmacPayload(txn) {
  const source = txn?.order || {};

  return [
    source.id,
    txn?.pending,
    txn?.amount_cents,
    txn?.success,
    txn?.is_auth,
    txn?.is_capture,
    txn?.is_standalone_payment,
    txn?.is_voided,
    txn?.is_refunded,
    txn?.is_3d_secure,
    source?.integration_id,
    txn?.profile_id,
    txn?.has_parent_transaction,
    source?.currency,
    txn?.created_at,
    txn?.error_occured,
    txn?.is_live,
    txn?.other_endpoint_reference,
    txn?.source_data?.pan,
    txn?.source_data?.sub_type,
    txn?.source_data?.type,
  ]
    .map(safeValue)
    .join('');
}

function assertPaymobHmac(req, txn) {
  const secret = String(process.env.PAYMOB_HMAC_SECRET || '').trim();
  if (!secret) {
    return false;
  }

  const provided = String(req.query?.hmac || req.body?.hmac || '').trim().toLowerCase();
  if (!provided) {
    const error = new Error('Missing Paymob hmac');
    error.statusCode = 401;
    throw error;
  }

  const computed = crypto
    .createHmac('sha512', secret)
    .update(buildPaymobHmacPayload(txn))
    .digest('hex')
    .toLowerCase();

  if (computed !== provided) {
    const error = new Error('Invalid Paymob hmac');
    error.statusCode = 401;
    throw error;
  }

  return true;
}

function assertProtectedPaymobCallback(req, txn) {
  const hmacConfigured = String(process.env.PAYMOB_HMAC_SECRET || '').trim().length > 0;
  const tokenConfigured = getConfiguredCallbackToken().length > 0;

  if (hmacConfigured) {
    assertPaymobHmac(req, txn);
  }

  if (tokenConfigured) {
    assertCallbackToken(req);
  }

  if (shouldRequireProtectedCallback() && !hmacConfigured && !tokenConfigured) {
    const error = new Error(
      'Missing callback protection. Configure PAYMOB_HMAC_SECRET or PAYMOB_CALLBACK_TOKEN'
    );
    error.statusCode = 500;
    throw error;
  }
}

module.exports = {
  assertMockModeAllowed,
  assertProtectedPaymobCallback,
  getTransactionObject,
  isConfiguredMockMode,
  isMockModeAllowed,
};
