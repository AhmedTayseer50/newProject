const { getFirebaseAdmin } = require('./_lib/firebaseAdmin');
const {
  assertProtectedPaymobCallback,
  getTransactionObject,
} = require('./_lib/paymobSecurity');

function boolify(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

function resolveOrderLanguage(orderData) {
  return String(orderData?.language || 'ar').trim().toLowerCase() === 'en' ? 'en' : 'ar';
}


function resolveEnrollmentAccess(orderData, courseId) {
  const items = Array.isArray(orderData?.items) ? orderData.items : [];
  const relatedItems = items.filter((item) => {
    if (item?.itemType === 'course' && String(item?.id || '') === courseId) {
      return true;
    }

    const grantedCourseIds = Array.isArray(item?.grantedCourseIds)
      ? item.grantedCourseIds.map((id) => String(id || ''))
      : [];

    return grantedCourseIds.includes(courseId);
  });

  // لو مفيش معلومات عن الخطة، نخلي السلوك القديم: المادة العلمية متاحة.
  if (!relatedItems.length) {
    return { hideStudyMaterial: false };
  }

  // لو الطالب حصل على نفس الكورس من أكتر من عنصر، خطة واحدة تسمح بالمادة تكفي للسماح.
  const hideStudyMaterial = relatedItems.every((item) => item?.hideStudyMaterial === true);
  const sourceItem = relatedItems[0] || {};

  return {
    hideStudyMaterial,
    planId: sourceItem.planId || null,
    planName: sourceItem.planName || null,
    itemType: sourceItem.itemType || null,
    orderItemId: sourceItem.id || null,
  };
}

async function grantCourses(admin, orderData) {
  const uid = orderData.userId;
  const courseIdsObj = orderData.courseIds || {};
  const courseIds = Object.keys(courseIdsObj);

  for (const courseId of courseIds) {
    const access = resolveEnrollmentAccess(orderData, courseId);

    await admin.database().ref(`enrollments/${uid}/${courseId}`).set({
      grantedAt: Date.now(),
      grantedBy: 'paymob-callback',
      hideStudyMaterial: !!access.hideStudyMaterial,
      planId: access.planId,
      planName: access.planName,
      itemType: access.itemType,
      orderItemId: access.orderItemId,
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

    assertProtectedPaymobCallback(req, txn);

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
        await grantCourses(admin, orderData);
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

    const redirectBase = `/${resolveOrderLanguage(orderData)}/payment-result`;
    const redirectUrl = `${redirectBase}?merchantOrderId=${encodeURIComponent(
      merchantOrderId
    )}`;

    if (req.method === 'GET') {
      return res.redirect(302, redirectUrl);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[paymob-callback] ERROR:', error);
    return res
      .status(error?.statusCode || 500)
      .send(error?.message || 'FUNCTION_INVOCATION_FAILED');
  }
};
