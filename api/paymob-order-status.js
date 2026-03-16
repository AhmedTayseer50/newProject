const { getFirebaseAdmin } = require('./_lib/firebaseAdmin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const merchantOrderId = String(req.query.merchantOrderId || '').trim();

    if (!merchantOrderId) {
      return res.status(400).json({ message: 'merchantOrderId is required' });
    }

    const admin = getFirebaseAdmin();
    const snap = await admin
      .database()
      .ref(`paymentOrders/${merchantOrderId}`)
      .get();

    if (!snap.exists()) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const data = snap.val() || {};
    const courseIds = Object.keys(data.courseIds || {});

    return res.status(200).json({
      ok: true,
      merchantOrderId,
      status: data.status || 'pending',
      amount: Number(data.amount || 0),
      courseIds,
      transactionId: data.transactionId || null,
      message:
        data.status === 'paid'
          ? 'تم الدفع وتفعيل الوصول بنجاح.'
          : data.status === 'failed'
            ? 'عملية الدفع لم تكتمل.'
            : 'الطلب ما زال قيد المعالجة.',
    });
  } catch (error) {
    console.error('[paymob-order-status] ERROR:', error);
    return res.status(500).json({
      message: error?.message || 'FUNCTION_INVOCATION_FAILED',
    });
  }
};