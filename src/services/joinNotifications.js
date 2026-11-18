/**
 * Client-side owner email notification helper (Firebase Spark / free-plan compatible).
 * - Security: Never sends or embeds dynamic/client-controlled approval URLs in emails
 *   to prevent phishing/link-substitution attacks. Owners always open the trusted
 *   app origin directly (https://vanshvriksha.web.app) to review Pending Access Requests.
 */

const TRUSTED_APP_ORIGIN = 'https://vanshvriksha.web.app';

function sanitizeId(value) {
  return String(value || '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 128);
}

function sanitizeText(value, maxLen = 120) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/**
 * Builds a pre-filled `mailto:` URL instructing the tree owner to review a join request
 * via the trusted application origin.
 *
 * @param {{
 *   ownerEmail?: string,
 *   treeId?: string,
 *   treeTitle?: string,
 *   requesterName?: string,
 *   requesterEmail?: string,
 *   requestedRole?: 'viewer' | 'editor'
 * }} [options={}]
 * @returns {string}
 */
export function buildJoinRequestMailtoUrl({
  ownerEmail = '',
  treeId,
  treeTitle = '',
  requesterName = '',
  requesterEmail = '',
  requestedRole = 'viewer'
} = {}) {
  const safeTreeId = sanitizeId(treeId);
  const safeTitle = sanitizeText(treeTitle, 120) || `Family Tree (${safeTreeId})`;
  const safeRequester =
    sanitizeText(requesterName, 80) || sanitizeText(requesterEmail, 120) || 'A family member';
  const safeEmail = sanitizeText(requesterEmail, 120);
  const roleLabel = requestedRole === 'editor' ? 'Editor (can add/edit)' : 'Viewer (read-only)';
  const subject = `VanshVriksha: Access Request for ${safeTitle}`;
  const bodyLines = [
    'Hello,',
    '',
    `${safeRequester}${safeEmail ? ` (${safeEmail})` : ''} has requested ${roleLabel} access to "${safeTitle}".`,
    '',
    `To review and approve safely, open ${TRUSTED_APP_ORIGIN} directly (or your saved bookmark), sign in as owner, and open "Share & Family Access" -> "Pending Access Requests".`,
    '',
    `Tree ID: ${safeTreeId}`
  ];
  const toPart = ownerEmail ? encodeURIComponent(sanitizeText(ownerEmail, 160)) : '';
  return `mailto:${toPart}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
}

/**
 * Checks whether EmailJS environment variables are configured for automated client-side emails.
 *
 * @returns {boolean}
 */
export function isEmailJsConfigured() {
  return Boolean(
    import.meta.env?.VITE_EMAILJS_SERVICE_ID &&
      import.meta.env?.VITE_EMAILJS_TEMPLATE_ID &&
      import.meta.env?.VITE_EMAILJS_PUBLIC_KEY
  );
}

/**
 * Sends a join-request notification to the tree owner via EmailJS if configured,
 * always returning a fallback `mailtoUrl`.
 *
 * @param {{
 *   treeId?: string,
 *   treeTitle?: string,
 *   requesterUid?: string,
 *   requesterName?: string,
 *   requesterEmail?: string,
 *   requestedRole?: 'viewer' | 'editor',
 *   ownerEmail?: string
 * }} [options={}]
 * @returns {Promise<{ sent: boolean, method: 'emailjs' | 'mailto', mailtoUrl: string }>}
 */
export async function sendOwnerJoinRequestEmail({
  treeId,
  treeTitle = '',
  requesterUid,
  requesterName = '',
  requesterEmail = '',
  requestedRole = 'viewer',
  ownerEmail = ''
} = {}) {
  const safeTreeId = sanitizeId(treeId);
  const safeRequesterUid = sanitizeId(requesterUid);
  const mailtoUrl = buildJoinRequestMailtoUrl({
    ownerEmail,
    treeId: safeTreeId,
    treeTitle,
    requesterName,
    requesterEmail,
    requestedRole
  });

  if (!isEmailJsConfigured() || typeof fetch !== 'function') {
    return {
      sent: false,
      method: 'mailto',
      mailtoUrl
    };
  }

  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: import.meta.env.VITE_EMAILJS_SERVICE_ID,
        template_id: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        user_id: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: sanitizeText(
            ownerEmail || import.meta.env.VITE_OWNER_NOTIFICATION_EMAIL || '',
            160
          ),
          tree_id: safeTreeId,
          tree_title: sanitizeText(treeTitle, 120) || safeTreeId,
          requester_uid: safeRequesterUid,
          requester_name: sanitizeText(requesterName, 80) || 'Family Member',
          requester_email: sanitizeText(requesterEmail, 120) || 'Not provided',
          requested_role: requestedRole === 'editor' ? 'Editor' : 'Viewer'
        }
      })
    });

    if (res.ok) {
      return {
        sent: true,
        method: 'emailjs',
        mailtoUrl
      };
    }
  } catch (err) {
    console.warn('EmailJS notification failed, falling back to mailto:', err);
  }

  return {
    sent: false,
    method: 'mailto',
    mailtoUrl
  };
}
