const { getFirebaseAdmin } = require('./_lib/firebaseAdmin');

function send(res, status, payload) {
  res.status(status).json(payload);
}

function isMockModeEnabled() {
  return String(process.env.PAYMOB_MOCK_MODE || 'true').toLowerCase() === 'true';
}

async function paymobAuth(apiKey) {
  const response = await fetch('https://accept.paymob.com/api/auth/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });

  if (!response.ok) {
    throw new Error('Failed to authenticate with Paymob');
  }

  return await response.json();
}

async function paymobCreateOrder(authToken, amountCents, merchantOrderId) {
  const response = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: authToken,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: 'EGP',
      merchant_order_id: merchantOrderId,
      items: [],
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create Paymob order');
  }

  return await response.json();
}

async function paymobCreatePaymentKey({
  authToken,
  amountCents,
  orderId,
  integrationId,
  billingData,
}) {
  const response = await fetch(
    'https://accept.paymob.com/api/acceptance/payment_keys',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: orderId,
        billing_data: billingData,
        currency: 'EGP',
        integration_id: Number(integrationId),
        lock_order_when_paid: true,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to create payment key');
  }

  return await response.json();
}

function normalizePhone(phone) {
  return String(phone || '')
    .replace(/\s+/g, '')
    .replace(/[^\d+]/g, '');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { message: 'Method Not Allowed' });
  }

  try {
    const authHeader = String(req.headers.authorization || '');
    const match = authHeader.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return send(res, 401, { message: 'Missing Authorization token' });
    }

    const idToken = match[1];
    const body = req.body || {};

    const courseIds = Array.isArray(body.courseIds)
      ? body.courseIds.map((x) => String(x || '').trim()).filter(Boolean)
      : [];

    const customerName = String(body.customerName || '').trim();
    const customerEmail = String(body.customerEmail || '').trim().toLowerCase();
    const customerPhone = normalizePhone(body.customerPhone);

    if (!courseIds.length) {
      return send(res, 400, { message: 'courseIds is required' });
    }

    if (!customerName || !customerEmail || !customerPhone) {
      return send(res, 400, { message: 'Customer info is required' });
    }

    const admin = getFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    let totalAmount = 0;
    const resolvedCourses = [];

    for (const courseId of courseIds) {
      const courseSnap = await admin.database().ref(`courses/${courseId}`).get();
      if (!courseSnap.exists()) {
        return send(res, 404, { message: `Course not found: ${courseId}` });
      }

      const course = courseSnap.val() || {};
      const price = Number(course.price || 0);

      if (!price || price <= 0) {
        return send(res, 400, {
          message: `Course price is invalid for course: ${courseId}`,
        });
      }

      const enrollmentSnap = await admin
        .database()
        .ref(`enrollments/${uid}/${courseId}`)
        .get();

      if (enrollmentSnap.exists()) {
        return send(res, 400, {
          message: 'أنت مشترك بالفعل في أحد الكورسات المحددة.',
        });
      }

      totalAmount += price;
      resolvedCourses.push({
        id: courseId,
        title: course.title || '',
        price,
      });
    }

    const merchantOrderId = `pm_${uid}_${Date.now()}`;
    const amountCents = Math.round(totalAmount * 100);

    const pendingOrder = {
      merchantOrderId,
      userId: uid,
      userEmail: customerEmail,
      userName: customerName,
      userPhone: customerPhone,
      amount: totalAmount,
      amountCents,
      currency: 'EGP',
      courseIds: courseIds.reduce((acc, id) => {
        acc[id] = true;
        return acc;
      }, {}),
      items: resolvedCourses,
      status: 'pending',
      paymentProvider: isMockModeEnabled() ? 'paymob-mock' : 'paymob',
      createdAt: Date.now(),
    };

    await admin.database().ref(`paymentOrders/${merchantOrderId}`).set(pendingOrder);

    if (isMockModeEnabled()) {
      const mockUrl = `/api/paymob-mock-complete?merchantOrderId=${encodeURIComponent(
        merchantOrderId
      )}&status=paid`;

      return send(res, 200, {
        iframeUrl: mockUrl,
        merchantOrderId,
      });
    }

    const apiKey = process.env.PAYMOB_API_KEY;
    const integrationId = process.env.PAYMOB_INTEGRATION_ID;
    const iframeId = process.env.PAYMOB_IFRAME_ID;

    if (!apiKey || !integrationId || !iframeId) {
      return send(res, 500, {
        message:
          'Missing Paymob env vars: PAYMOB_API_KEY / PAYMOB_INTEGRATION_ID / PAYMOB_IFRAME_ID',
      });
    }

    const authData = await paymobAuth(apiKey);
    const authToken = authData.token;

    const orderData = await paymobCreateOrder(
      authToken,
      amountCents,
      merchantOrderId
    );

    const billingData = {
      apartment: 'NA',
      email: customerEmail,
      floor: 'NA',
      first_name: customerName.split(' ').slice(0, 1).join(' ') || 'Customer',
      street: 'NA',
      building: 'NA',
      phone_number: customerPhone,
      shipping_method: 'NA',
      postal_code: 'NA',
      city: 'Cairo',
      country: 'EG',
      last_name:
        customerName.split(' ').slice(1).join(' ') || customerName || 'Customer',
      state: 'Cairo',
    };

    const paymentKeyData = await paymobCreatePaymentKey({
      authToken,
      amountCents,
      orderId: orderData.id,
      integrationId,
      billingData,
    });

    await admin.database().ref(`paymentOrders/${merchantOrderId}`).update({
      paymobOrderId: orderData.id,
      paymobPaymentTokenIssuedAt: Date.now(),
    });

    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKeyData.token}`;

    return send(res, 200, {
      iframeUrl,
      merchantOrderId,
    });
  } catch (error) {
    console.error('[paymob-create-session] ERROR:', error);
    return send(res, 500, {
      message: error?.message || 'FUNCTION_INVOCATION_FAILED',
    });
  }
};