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

function normalizePlanId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0621-\u064Aa-z0-9-_]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parsePrice(value) {
  const normalized = String(value || '')
    .replace(/[^\d.,]/g, '')
    .replace(/,/g, '');

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function getPlanId(plan, index) {
  const directId = normalizePlanId(plan?.id);
  if (directId) return directId;

  const fromName = normalizePlanId(plan?.name || plan?.title || plan?.label);
  if (fromName) return fromName;

  return `plan-${index + 1}`;
}

function getCourseTitle(course) {
  if (!course || typeof course !== 'object') return '';

  if (typeof course.title === 'string') return course.title;
  if (course.title && typeof course.title === 'object') {
    return course.title.ar || course.title.en || '';
  }

  if (typeof course.name === 'string') return course.name;
  if (course.name && typeof course.name === 'object') {
    return course.name.ar || course.name.en || '';
  }

  return '';
}

function getPricingPlans(course) {
  if (!course || typeof course !== 'object') return [];

  if (Array.isArray(course.pricingPlans)) return course.pricingPlans;
  if (Array.isArray(course.pricing)) return course.pricing;
  if (Array.isArray(course.plans)) return course.plans;

  return [];
}

function resolvePlanFromCourse(course, requestedPlanId) {
  const plans = getPricingPlans(course);
  const normalizedRequestedPlanId = normalizePlanId(requestedPlanId);

  if (!plans.length || !normalizedRequestedPlanId) {
    return null;
  }

  for (let i = 0; i < plans.length; i += 1) {
    const plan = plans[i] || {};
    const computedPlanId = getPlanId(plan, i);

    if (computedPlanId !== normalizedRequestedPlanId) {
      continue;
    }

    const planName =
      plan.name ||
      plan.title ||
      plan.label ||
      '';

    const priceSource =
      plan.priceText ??
      plan.price ??
      plan.amount ??
      '';

    const price = parsePrice(priceSource);

    if (!price || price <= 0) {
      return null;
    }

    return {
      planId: computedPlanId,
      planName: String(planName || ''),
      price,
      priceText: String(priceSource || ''),
      features: Array.isArray(plan.features) ? plan.features : [],
      badge: String(plan.badge || ''),
      note: String(plan.note || ''),
    };
  }

  return null;
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

    const customerName = String(body.customerName || '').trim();
    const customerEmail = String(body.customerEmail || '').trim().toLowerCase();
    const customerPhone = normalizePhone(body.customerPhone);

    const selectedItems = Array.isArray(body.selectedItems)
      ? body.selectedItems
          .map((item) => ({
            courseId: String(item?.courseId || '').trim(),
            planId: normalizePlanId(item?.planId),
          }))
          .filter((item) => item.courseId && item.planId)
      : [];

    if (!selectedItems.length) {
      return send(res, 400, {
        message: 'selectedItems is required and must contain courseId and planId',
      });
    }

    if (!customerName || !customerEmail || !customerPhone) {
      return send(res, 400, { message: 'Customer info is required' });
    }

    const uniqueMap = new Map();
    for (const item of selectedItems) {
      const key = `${item.courseId}__${item.planId}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    }
    const uniqueSelectedItems = Array.from(uniqueMap.values());

    const admin = getFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    let totalAmount = 0;
    const resolvedCourses = [];

    for (const item of uniqueSelectedItems) {
      const courseSnap = await admin.database().ref(`courses/${item.courseId}`).get();

      if (!courseSnap.exists()) {
        return send(res, 404, { message: `Course not found: ${item.courseId}` });
      }

      const course = courseSnap.val() || {};
      const resolvedPlan = resolvePlanFromCourse(course, item.planId);

      if (!resolvedPlan) {
        return send(res, 400, {
          message: `Pricing plan not found or invalid for course: ${item.courseId}`,
        });
      }

      const enrollmentSnap = await admin
        .database()
        .ref(`enrollments/${uid}/${item.courseId}`)
        .get();

      if (enrollmentSnap.exists()) {
        return send(res, 400, {
          message: 'أنت مشترك بالفعل في أحد الكورسات المحددة.',
        });
      }

      totalAmount += resolvedPlan.price;

      resolvedCourses.push({
        id: item.courseId,
        title: getCourseTitle(course),
        price: resolvedPlan.price,
        priceText: resolvedPlan.priceText,
        planId: resolvedPlan.planId,
        planName: resolvedPlan.planName,
        badge: resolvedPlan.badge,
        note: resolvedPlan.note,
        features: resolvedPlan.features,
      });
    }

    if (!resolvedCourses.length || totalAmount <= 0) {
      return send(res, 400, {
        message: 'No valid purchasable items were found.',
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
      courseIds: resolvedCourses.reduce((acc, item) => {
        acc[item.id] = true;
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