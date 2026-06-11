const { getFirebaseAdmin } = require('./_lib/firebaseAdmin');

const WHATSAPP_NUMBER = '201555614096';

function send(res, status, payload) {
  res.status(status).json(payload);
}

function normalizePlanId(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit).toString())
    .replace(/[^\u0621-\u064Aa-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (/^\d+$/.test(normalized)) {
    return `plan-${normalized}`;
  }

  return normalized;
}

function normalizeLanguage(value) {
  return String(value || '').trim().toLowerCase() === 'en' ? 'en' : 'ar';
}

function normalizeItemType(value) {
  return String(value || '').trim().toLowerCase() === 'diploma' ? 'diploma' : 'course';
}

function getLocalizedText(value) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    if (typeof value.ar === 'string' || typeof value.ar === 'number') return String(value.ar);
    if (typeof value.en === 'string' || typeof value.en === 'number') return String(value.en);
    if (typeof value.title === 'string' || typeof value.title === 'number') return String(value.title);
    if (typeof value.name === 'string' || typeof value.name === 'number') return String(value.name);
  }

  return '';
}

function getLocalizedArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '')).filter(Boolean);
  }

  if (value && typeof value === 'object') {
    if (Array.isArray(value.ar)) return value.ar.map((item) => String(item || '')).filter(Boolean);
    if (Array.isArray(value.en)) return value.en.map((item) => String(item || '')).filter(Boolean);
  }

  return [];
}

function parsePrice(value) {
  const normalized = getLocalizedText(value)
    .replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit).toString())
    .replace(/[^\d.,]/g, '')
    .replace(/,/g, '');

  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function getPlanAliases(plan, index) {
  const aliases = new Set();
  const rawId = String(plan?.id ?? '').trim();
  if (rawId) {
    aliases.add(rawId.toLowerCase());
    aliases.add(normalizePlanId(rawId));
  }

  const name = normalizePlanId(getLocalizedText(plan?.name));
  const title = normalizePlanId(getLocalizedText(plan?.title));
  const label = normalizePlanId(getLocalizedText(plan?.label));
  if (name) aliases.add(name);
  if (title) aliases.add(title);
  if (label) aliases.add(label);

  aliases.add(String(index + 1));
  aliases.add(`plan-${index + 1}`);

  return Array.from(aliases).filter(Boolean);
}

function getCanonicalPlanId(plan, index) {
  const rawId = String(plan?.id ?? '').trim();
  return rawId ? normalizePlanId(rawId) : `plan-${index + 1}`;
}

function getPricingPlans(entity) {
  if (!entity || typeof entity !== 'object') return [];
  if (Array.isArray(entity.pricingPlans)) return entity.pricingPlans;
  if (Array.isArray(entity.pricing)) return entity.pricing;
  if (Array.isArray(entity.plans)) return entity.plans;
  return [];
}

function resolvePlanFromEntity(entity, requestedPlanId) {
  const plans = getPricingPlans(entity);
  const normalizedRequestedPlanId = normalizePlanId(requestedPlanId);
  if (!plans.length || !normalizedRequestedPlanId) return null;

  for (let i = 0; i < plans.length; i += 1) {
    const plan = plans[i] || {};
    const matched = getPlanAliases(plan, i).some(
      (alias) => normalizePlanId(alias) === normalizedRequestedPlanId
    );

    if (!matched) continue;

    const priceSource = plan.priceText ?? plan.price ?? plan.amount ?? '';
    const price = parsePrice(priceSource);
    if (!price || price <= 0) return null;

    return {
      planId: getCanonicalPlanId(plan, i),
      planName:
        getLocalizedText(plan.name) ||
        getLocalizedText(plan.title) ||
        getLocalizedText(plan.label) ||
        `Plan ${i + 1}`,
      price,
      priceText: getLocalizedText(priceSource),
      badge: getLocalizedText(plan.badge),
      note: getLocalizedText(plan.note),
      features: getLocalizedArray(plan.features),
      hideStudyMaterial: plan?.hideStudyMaterial === true,
    };
  }

  return null;
}

function getEntityTitle(entity) {
  return getLocalizedText(entity?.title) || getLocalizedText(entity?.name) || '';
}

function buildWhatsappMessage({ email, totalAmount, items }) {
  const courseTitles = items.map((item) => `- ${item.title}`).join('\n');

  return [
    'مرحبًا، أريد إتمام دفع الكورسات التالية:',
    '',
    'الكورسات:',
    courseTitles,
    '',
    'الإيميل المسجل:',
    email,
    '',
    'إجمالي المبلغ:',
    `${totalAmount} جنيه`,
  ].join('\n');
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

    const admin = getFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(match[1]);
    const uid = decoded.uid;
    const body = req.body || {};
    const language = normalizeLanguage(body.language);

    const selectedItems = Array.isArray(body.selectedItems)
      ? body.selectedItems
          .map((item) => ({
            itemType: normalizeItemType(item?.itemType),
            itemId: String(item?.itemId || item?.courseId || item?.diplomaId || '').trim(),
            planId: normalizePlanId(item?.planId),
          }))
          .filter((item) => item.itemId && item.planId)
      : [];

    if (!selectedItems.length) {
      return send(res, 400, {
        message: 'selectedItems is required and must contain itemType, itemId and planId',
      });
    }

    const uniqueMap = new Map();
    for (const item of selectedItems) {
      const key = `${item.itemType}:${item.itemId}__${item.planId}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, item);
    }

    const userSnap = await admin.database().ref(`users/${uid}`).get();
    const user = userSnap.exists() ? userSnap.val() || {} : {};
    const userEmail = String(user.email || decoded.email || '').trim().toLowerCase();
    const userName = String(user.displayName || decoded.name || '').trim();
    const userPhone = String(user.whatsapp || '').trim();

    if (!userEmail) {
      return send(res, 400, { message: 'User email is required to create WhatsApp order' });
    }

    let totalAmount = 0;
    const resolvedItems = [];
    const grantedCourseIdsMap = {};
    const purchasedKeys = [];
    const whatsappDisplayItems = [];

    for (const item of Array.from(uniqueMap.values())) {
      if (item.itemType === 'course') {
        const courseSnap = await admin.database().ref(`courses/${item.itemId}`).get();
        if (!courseSnap.exists()) {
          return send(res, 404, { message: `Course not found: ${item.itemId}` });
        }

        const course = courseSnap.val() || {};
        const resolvedPlan = resolvePlanFromEntity(course, item.planId);
        if (!resolvedPlan) {
          return send(res, 400, { message: `Pricing plan not found or invalid for course: ${item.itemId}` });
        }

        const enrollmentSnap = await admin.database().ref(`enrollments/${uid}/${item.itemId}`).get();
        if (enrollmentSnap.exists()) {
          return send(res, 400, { message: 'أنت مشترك بالفعل في أحد الكورسات المحددة.' });
        }

        const title = getEntityTitle(course);
        totalAmount += resolvedPlan.price;
        grantedCourseIdsMap[item.itemId] = true;
        purchasedKeys.push(`course:${item.itemId}__${resolvedPlan.planId}`);
        whatsappDisplayItems.push({ title });

        resolvedItems.push({
          id: item.itemId,
          itemType: 'course',
          title,
          price: resolvedPlan.price,
          priceText: resolvedPlan.priceText,
          planId: resolvedPlan.planId,
          planName: resolvedPlan.planName,
          badge: resolvedPlan.badge,
          note: resolvedPlan.note,
          features: resolvedPlan.features,
          hideStudyMaterial: !!resolvedPlan.hideStudyMaterial,
        });

        continue;
      }

      const diplomaSnap = await admin.database().ref(`diplomas/${item.itemId}`).get();
      if (!diplomaSnap.exists()) {
        return send(res, 404, { message: `Diploma not found: ${item.itemId}` });
      }

      const diploma = diplomaSnap.val() || {};
      const resolvedPlan = resolvePlanFromEntity(diploma, item.planId);
      if (!resolvedPlan) {
        return send(res, 400, { message: `Pricing plan not found or invalid for diploma: ${item.itemId}` });
      }

      const diplomaCourseIds = Object.keys(diploma.courseIds || {}).filter(Boolean);
      if (!diplomaCourseIds.length) {
        return send(res, 400, { message: `Diploma does not contain any courses: ${item.itemId}` });
      }

      totalAmount += resolvedPlan.price;
      diplomaCourseIds.forEach((courseId) => {
        grantedCourseIdsMap[courseId] = true;
      });
      purchasedKeys.push(`diploma:${item.itemId}__${resolvedPlan.planId}`);

      const title = getEntityTitle(diploma);
      whatsappDisplayItems.push({ title });

      resolvedItems.push({
        id: item.itemId,
        itemType: 'diploma',
        title,
        price: resolvedPlan.price,
        priceText: resolvedPlan.priceText,
        planId: resolvedPlan.planId,
        planName: resolvedPlan.planName,
        badge: resolvedPlan.badge,
        note: resolvedPlan.note,
        features: resolvedPlan.features,
        hideStudyMaterial: !!resolvedPlan.hideStudyMaterial,
        grantedCourseIds: diplomaCourseIds,
      });
    }

    if (!resolvedItems.length || totalAmount <= 0) {
      return send(res, 400, { message: 'No valid purchasable items were found.' });
    }

    const merchantOrderId = `wa_${uid}_${Date.now()}`;
    const order = {
      merchantOrderId,
      userId: uid,
      userEmail,
      userName,
      userPhone,
      language,
      amount: totalAmount,
      amountCents: Math.round(totalAmount * 100),
      currency: 'EGP',
      courseIds: grantedCourseIdsMap,
      purchasedKeys,
      items: resolvedItems,
      status: 'whatsapp_pending',
      paymentProvider: 'whatsapp',
      whatsappNumber: WHATSAPP_NUMBER,
      createdAt: Date.now(),
    };

    await admin.database().ref(`paymentOrders/${merchantOrderId}`).set(order);
    await admin.database().ref(`customers/${uid}`).update({
      email: userEmail,
      name: userName || null,
      whatsapp: userPhone || null,
      lastOrderAt: Date.now(),
    });

    const message = buildWhatsappMessage({
      email: userEmail,
      totalAmount,
      items: whatsappDisplayItems,
    });

    return send(res, 200, {
      merchantOrderId,
      whatsappUrl: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
    });
  } catch (error) {
    console.error('[whatsapp-create-order] ERROR:', error);
    return send(res, 500, { message: error?.message || 'FUNCTION_INVOCATION_FAILED' });
  }
};
