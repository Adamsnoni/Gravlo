// src/utils/invoicePdf.js
// Generate a simple PDF invoice for a rent payment using jsPDF.
import { jsPDF } from 'jspdf';

function safeDate(value) {
  if (!value) return null;
  const d = value.toDate?.() ?? new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function generateInvoicePdf(payment) {
  if (!payment) return;

  const doc = new jsPDF();

  const paidDate = safeDate(payment.paidDate) || new Date();
  const createdAt = safeDate(payment.recordedAt) || paidDate;

  const propertyName = payment.propertyName || 'Rental Property';
  const propertyAddress = payment.propertyAddress || payment.address || '';
  const propertyType = payment.propertyType || payment.type || '';
  const buildingName = payment.propertyBuildingName ?? payment.buildingName;
  const unitNumber = payment.propertyUnitNumber ?? payment.unitNumber;
  const floor = payment.propertyFloor ?? payment.floor;
  const bedrooms = payment.propertyBedrooms ?? payment.bedrooms;
  const bathrooms = payment.propertyBathrooms ?? payment.bathrooms;
  const sqft = payment.propertySqft ?? payment.sqft;

  const tenantName = payment.tenantName || 'Tenant';
  const tenantEmail = payment.tenantEmail || '';

  const amount = payment.amount || 0;
  const method = payment.method || 'Online';
  const status = payment.status || 'paid';

  const invoiceNumber =
    payment.invoiceNumber ||
    `INV-${(payment.propertyId || '').slice(0, 4).toUpperCase()}-${(payment.id || '')
      .slice(-6)
      .toUpperCase()}`;

  let y = 20;

  doc.setFontSize(18);
  doc.text('LeaseEase Rent Invoice', 20, y);
  y += 8;

  doc.setFontSize(11);
  doc.text(`Invoice #: ${invoiceNumber}`, 20, y);
  y += 6;
  doc.text(`Invoice date: ${createdAt.toLocaleDateString()}`, 20, y);
  y += 10;

  // Tenant block
  doc.setFontSize(12);
  doc.text('Billed To:', 20, y);
  y += 6;
  doc.setFontSize(11);
  doc.text(tenantName, 20, y);
  y += 5;
  if (tenantEmail) {
    doc.text(tenantEmail, 20, y);
    y += 6;
  } else {
    y += 4;
  }

  // Property block
  doc.setFontSize(12);
  doc.text('Apartment Details:', 20, y);
  y += 6;
  doc.setFontSize(11);
  doc.text(propertyName, 20, y);
  y += 5;
  if (buildingName || unitNumber) {
    const unitParts = [];
    if (buildingName) unitParts.push(buildingName);
    if (unitNumber) unitParts.push(`Unit ${unitNumber}`);
    if (floor != null && floor !== '') unitParts.push(`Floor ${floor}`);
    if (unitParts.length) {
      doc.text(unitParts.join(' - '), 20, y);
      y += 5;
    }
  }
  if (propertyAddress) {
    doc.text(propertyAddress, 20, y);
    y += 5;
  }
  if (propertyType) {
    doc.text(`Type: ${propertyType}`, 20, y);
    y += 5;
  }
  const specs = [];
  if (bedrooms != null) specs.push(`${bedrooms} bedroom(s)`);
  if (bathrooms != null) specs.push(`${bathrooms} bathroom(s)`);
  if (sqft != null) specs.push(`${sqft} sqft`);
  if (specs.length) {
    doc.text(specs.join(' · '), 20, y);
    y += 6;
  } else {
    y += 4;
  }

  // Payment summary
  y += 4;
  doc.setFontSize(12);
  doc.text('Payment Summary:', 20, y);
  y += 7;
  doc.setFontSize(11);
  doc.text(`Amount: ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 20, y);
  y += 5;
  doc.text(`Status: ${status}`, 20, y);
  y += 5;
  doc.text(`Method: ${method}`, 20, y);
  y += 5;
  doc.text(`Paid on: ${paidDate.toLocaleDateString()}`, 20, y);
  y += 10;

  if (payment.notes) {
    doc.setFontSize(11);
    doc.text('Notes:', 20, y);
    y += 5;
    doc.text(String(payment.notes), 20, y);
    y += 5;
  }

  doc.setFontSize(9);
  doc.text(
    'Thank you for your payment. Keep this invoice for your records.',
    20,
    285 - 10,
  );

  const filename = `LeaseEase_Invoice_${invoiceNumber}.pdf`;
  doc.save(filename);
}

