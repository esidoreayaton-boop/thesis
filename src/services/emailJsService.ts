import emailjs from '@emailjs/browser';

// ─────────────────────────────────────────────────────────────────────────────
// EmailJS Service – Barangay Pianing Smart System
// Service ID: service_6nk2ylj (Configured)
// ─────────────────────────────────────────────────────────────────────────────

export interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

const DEFAULT_CONFIG: EmailJsConfig = {
  serviceId: 'service_6nk2ylj',
  templateId: 'template_barangay', // Replace with your EmailJS Template ID (e.g. template_xxxxxxx)
  publicKey: 'mD2qC6wMh5kXjU9Za'   // Replace with your EmailJS Public Key from Account > API Keys
};

// Retrieve configuration (allows dynamic setting via Settings tab or localStorage)
export function getEmailJsConfig(): EmailJsConfig {
  try {
    const saved = localStorage.getItem('emailjs_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        serviceId: parsed.serviceId || DEFAULT_CONFIG.serviceId,
        templateId: parsed.templateId || DEFAULT_CONFIG.templateId,
        publicKey: parsed.publicKey || DEFAULT_CONFIG.publicKey,
      };
    }
  } catch {}
  return DEFAULT_CONFIG;
}

export function saveEmailJsConfig(config: Partial<EmailJsConfig>) {
  const current = getEmailJsConfig();
  const updated = { ...current, ...config };
  localStorage.setItem('emailjs_config', JSON.stringify(updated));
  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Send Method (supports both @emailjs/browser SDK and REST API fallback)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendEmailNotification(params: {
  to_name: string;
  to_email: string;
  subject: string;
  message: string;
  barangay?: string;
  status?: string;
  request_code?: string;
  document_type?: string;
}): Promise<{ success: boolean; message: string }> {
  const config = getEmailJsConfig();

  if (!params.to_email || !params.to_email.includes('@')) {
    console.warn('[EmailJS] Invalid or missing recipient email address:', params.to_email);
    return { success: false, message: 'Invalid recipient email address' };
  }

  const templateParams = {
    to_name: params.to_name || 'Resident',
    to_email: params.to_email.trim().toLowerCase(),
    recipient_email: params.to_email.trim().toLowerCase(),
    subject: params.subject,
    message: params.message,
    barangay: params.barangay || 'Barangay Pianing',
    status: params.status || 'Active',
    request_code: params.request_code || 'N/A',
    document_type: params.document_type || 'Barangay Document',
    date: new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
    from_name: 'Barangay Pianing Administration',
    reply_to: 'admin@barangay.gov.ph'
  };

  try {
    // 1. Primary: Use @emailjs/browser
    const response = await emailjs.send(
      config.serviceId,
      config.templateId,
      templateParams,
      config.publicKey
    );
    console.log('✅ [EmailJS] Email dispatched successfully:', response.status, response.text);
    return { success: true, message: 'Email sent successfully via EmailJS!' };
  } catch (sdkError: any) {
    console.warn('⚠️ [EmailJS SDK] SDK send error, trying REST API fallback...', sdkError?.text || sdkError?.message);

    // 2. Fallback: Direct EmailJS REST endpoint
    try {
      const restRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: config.serviceId,
          template_id: config.templateId,
          user_id: config.publicKey,
          template_params: templateParams,
        })
      });

      if (restRes.ok) {
        console.log('✅ [EmailJS REST] Email dispatched successfully!');
        return { success: true, message: 'Email sent via EmailJS REST API!' };
      } else {
        const errorText = await restRes.text();
        console.warn('❌ [EmailJS REST] Error response:', errorText);
        return {
          success: false,
          message: `EmailJS response: ${errorText || 'Check your Template ID and Public Key'}`
        };
      }
    } catch (restError: any) {
      console.error('❌ [EmailJS] Dispatch failed:', restError);
      return { success: false, message: restError?.message || 'Email delivery failed' };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Specific Automated Trigger Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Send Account Approval Email when Admin verifies resident
 */
export async function sendResidentApprovalEmail(resident: {
  name: string;
  email: string;
  barangay?: string;
}) {
  return sendEmailNotification({
    to_name: resident.name,
    to_email: resident.email,
    subject: `✅ Your Barangay ${resident.barangay || 'Pianing'} Account is Approved & Verified`,
    message: `Mabuhay ${resident.name}! Your Barangay resident account has been reviewed and officially VERIFIED by the Barangay Administration. You can now log in to the portal to request Barangay Clearances, Residency Certificates, and access health appointments online.`,
    status: 'Verified',
    barangay: resident.barangay || 'Pianing'
  });
}

/**
 * 2. Send Correction / Resubmission Notice when Admin flags ID discrepancy
 */
export async function sendResidentCorrectionEmail(applicant: {
  name: string;
  email: string;
  barangay?: string;
  reason: string;
}) {
  return sendEmailNotification({
    to_name: applicant.name,
    to_email: applicant.email,
    subject: `⚠️ Notice: ID Correction / Resubmission Required for Your Account Application`,
    message: `Hello ${applicant.name}, your account registration for Barangay ${applicant.barangay || 'Pianing'} requires revision before it can be verified. Discrepancy details: "${applicant.reason}". Please log in to your portal account to resubmit a clear copy of your valid Government ID.`,
    status: 'Needs Correction',
    barangay: applicant.barangay || 'Pianing'
  });
}

/**
 * 3. Send Document Status Update (Ready for Pickup, Approved, Completed)
 */
export async function sendDocumentReadyEmail(doc: {
  resident_name: string;
  resident_email?: string;
  document_type: string;
  request_code: string;
  status: string;
  barangay?: string;
}) {
  if (!doc.resident_email) return { success: false, message: 'No email attached to document' };

  let statusMsg = '';
  if (doc.status === 'Ready for Pickup') {
    statusMsg = `Your requested ${doc.document_type} (Tracking Code: ${doc.request_code}) is now PRINTED and READY FOR PICKUP at the Barangay Hall. Please bring a valid ID and the required processing fee when claiming.`;
  } else if (doc.status === 'Completed') {
    statusMsg = `Your ${doc.document_type} (Tracking Code: ${doc.request_code}) has been officially claimed and marked as COMPLETED. Thank you!`;
  } else {
    statusMsg = `Your ${doc.document_type} (Tracking Code: ${doc.request_code}) is now in status: ${doc.status}.`;
  }

  return sendEmailNotification({
    to_name: doc.resident_name,
    to_email: doc.resident_email,
    subject: `📄 [Barangay Pianing] Update on ${doc.document_type} (${doc.request_code})`,
    message: statusMsg,
    status: doc.status,
    request_code: doc.request_code,
    document_type: doc.document_type,
    barangay: doc.barangay || 'Pianing'
  });
}
