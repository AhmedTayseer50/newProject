const { getFirebaseAdmin } = require('./_lib/firebaseAdmin');

function boolify(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

function getTransactionObject(req) {
  if (req.body?.obj) return req.body.obj;
  if (req.body && typeof req.body === 'object' && req.body.id) return req.body;
  if (req.query && req.query.id) return req.query;
  return null;
}

async function grantCoursesAndTelegram(admin, orderData) {
  const uid = orderData.userId;
  const courseIdsObj = orderData.courseIds || {};
  const courseIds = Object.keys(courseIdsObj);

  for (const courseId of courseIds) {
    await admin.database().ref(`enrollments/${uid}/${courseId}`).set({
      grantedAt: Date.now(),
      grantedBy: 'paymob-callback',
    });

    await admin.database().ref(`telegramAccess/${uid}/${courseId}`).set({
      enabled: true,
      status: 'ready',
      grantedAt: Date.now(),
      grantedBy: 'paymob-callback',
      usedAt: null,
    });
  }

  await admin.database().ref(`customers/${uid}`).update({
    email: orderData.userEmail || null,
    name: orderData.userName || null,
    whatsapp: orderData.userPhone || null,
    lastOrderAt: Date.now(),
  });
}

module.exports = async function handler(req, res) {
  try {
    const txn = getTransactionObject(req);

    if (!txn) {
      return res.status(400).send('Missing transaction payload');
    }

    const merchantOrderId =
      txn?.order?.merchant_order_id ||
      txn?.merchant_order_id ||
      txn?.merchantOrderId ||
      '';

    if (!merchantOrderId) {
      return res.status(400).send('Missing merchantOrderId');
    }

    const success = boolify(txn?.success);
    const isVoided = boolify(txn?.is_voided);
    const isRefunded = boolify(txn?.is_refunded);
    const transactionId = txn?.id ? String(txn.id) : null;

    const admin = getFirebaseAdmin();
    const orderRef = admin.database().ref(`paymentOrders/${merchantOrderId}`);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists()) {
      return res.status(404).send('Order not found');
    }

    const orderData = orderSnap.val() || {};
    const alreadyPaid = orderData.status === 'paid';

    if (success && !isVoided && !isRefunded) {
      if (!alreadyPaid) {
        await grantCoursesAndTelegram(admin, orderData);
      }

      await orderRef.update({
        status: 'paid',
        paidAt: Date.now(),
        transactionId,
        paymobRaw: txn,
      });
    } else {
      await orderRef.update({
        status: 'failed',
        failedAt: Date.now(),
        transactionId,
        paymobRaw: txn,
      });
    }

    const redirectBase = '/payment-result';
    const redirectUrl = `${redirectBase}?merchantOrderId=${encodeURIComponent(
      merchantOrderId
    )}`;

    if (req.method === 'GET') {
      return res.redirect(302, redirectUrl);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[paymob-callback] ERROR:', error);
    return res.status(500).send(error?.message || 'FUNCTION_INVOCATION_FAILED');
  }
};