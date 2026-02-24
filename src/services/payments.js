// src/services/payments.js
// Thin client to call your secure payment backend (Paystack).
// The backend should:
//  - Create the actual payment/checkout session with the gateway
//  - Verify webhooks
//  - Write a payment document into Firestore under the landlord's property
//    (users/{landlordId}/properties/{propertyId}/payments).

const API_BASE = import.meta.env.VITE_PAYMENTS_API_BASE;

export async function createCheckoutSession({
  gateway = 'paystack',
  landlordId,
  propertyId,
  propertyName,
  propertyAddress,
  propertyBuildingName,
  propertyUnitNumber,
  propertyFloor,
  tenantEmail,
  tenantName,
  amount,
  currency,
  successUrl,
  cancelUrl,
  metadata = {},
}) {
  if (!API_BASE) {
    throw new Error('Payments API base URL is not configured (VITE_PAYMENTS_API_BASE).');
  }

  const payload = {
    gateway,
    landlordId,
    propertyId,
    propertyName,
    propertyAddress,
    propertyBuildingName,
    propertyUnitNumber,
    propertyFloor,
    tenantEmail,
    tenantName,
    amount,
    currency,
    successUrl: successUrl || window.location.href,
    cancelUrl: cancelUrl || window.location.href,
    metadata,
  };

  const res = await fetch(`${API_BASE}/createCheckoutSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Unable to start payment. Please try again.');
  }

  if (data.url || data.checkoutUrl || data.redirectUrl) {
    window.location.href = data.url || data.checkoutUrl || data.redirectUrl;
    return data;
  }

  if (data.redirectUrl) {
    window.location.href = data.redirectUrl;
    return;
  }

  throw new Error('Payment session created but no redirect URL was returned.');
}

