const { getFirebaseAdmin } = require('./_lib/firebaseAdmin');
const { assertMockModeAllowed } = require('./_lib/paymobSecurity');


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
      grantedBy: 'paymob-mock',
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
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    assertMockModeAllowed();

    const merchantOrderId = String(req.query.merchantOrderId || '').trim();
    const status = String(req.query.status || 'paid').trim();

    if (!merchantOrderId) {
      return res.status(400).send('merchantOrderId is required');
    }

    const admin = getFirebaseAdmin();
    const orderRef = admin.database().ref(`paymentOrders/${merchantOrderId}`);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists()) {
      return res.status(404).send('Order not found');
    }

    const orderData = orderSnap.val() || {};

    if (status === 'paid') {
      if (orderData.status !== 'paid') {
        await grantCourses(admin, orderData);
      }

      await orderRef.update({
        status: 'paid',
        paidAt: Date.now(),
        transactionId: `mock_txn_${Date.now()}`,
        mockMode: true,
      });
    } else {
      await orderRef.update({
        status: 'failed',
        failedAt: Date.now(),
        transactionId: `mock_failed_${Date.now()}`,
        mockMode: true,
      });
    }

    return res.redirect(
      302,
      `/${resolveOrderLanguage(orderData)}/payment-result?merchantOrderId=${encodeURIComponent(merchantOrderId)}`
    );
  } catch (error) {
    console.error('[paymob-mock-complete] ERROR:', error);
    return res
      .status(error?.statusCode || 500)
      .send(error?.message || 'FUNCTION_INVOCATION_FAILED');
  }
};
