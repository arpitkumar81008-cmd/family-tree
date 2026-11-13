/**
 * Client-side owner email notification helper (Firebase Spark / free-plan compatible).
 * - Uses EmailJS REST API when VITE_EMAILJS_* env vars are configured.
 * - Falls back to a pre-filled mailto: link and 1-click in-app approval URL.
 */

export function buildOwnerApprovalUrl(treeId, requesterUid) {
  if (typeof window === 'undefined' || !treeId || !requesterUid) return '';
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('tree', treeId);
  url.searchParams.set('approve', requesterUid);
  return url.toString();
}

export function buildJoinRequestMailtoUrl({
  ownerEmail = '',
  treeId,
  treeTitle = '',
  requesterName = '',
  requesterEmail = '',
  requestedRole = 'viewer',
  approvalUrl = ''
}) {
  const safeTitle = treeTitle || `Family Tree (${treeId})`;
  const safeRequester = requesterName || requesterEmail || 'A family member';
  const roleLabel = requestedRole === 'editor' ? 'Editor (can add/edit)' : 'Viewer (read-only)';
  const subject = `VanshVriksha: Access Request for ${safeTitle}`;
  const bodyLines = [
    `Hello,`,
    '',
    `${safeRequester}${requesterEmail ? ` (${requesterEmail})` : ''} has requested ${roleLabel} access to "${safeTitle}".`,
    '',
    `Click this link to review and approve in VanshVriksha:`,
    approvalUrl,
    '',
    `Tree ID: ${treeId}`
  ];
  const toPart = ownerEmail ? encodeURIComponent(ownerEmail.trim()) : '';
  return `mailto:${toPart}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
}

export function isEmailJsConfigured() {
  return Boolean(
    import.meta.env?.VITE_EMAILJS_SERVICE_ID &&
      import.meta.env?.VITE_EMAILJS_TEMPLATE_ID &&
      import.meta.env?.VITE_EMAILJS_PUBLIC_KEY
  );
}

export async function sendOwnerJoinRequestEmail({
  treeId,
  treeTitle = '',
  requesterUid,
  requesterName = '',
  requesterEmail = '',
  requestedRole = 'viewer',
  ownerEmail = ''
}) {
  const approvalUrl = buildOwnerApprovalUrl(treeId, requesterUid);
  const mailtoUrl = buildJoinRequestMailtoUrl({
    ownerEmail,
    treeId,
    treeTitle,
    requesterName,
    requesterEmail,
    requestedRole,
    approvalUrl
  });

  if (!isEmailJsConfigured() || typeof fetch !== 'function') {
    return {
      sent: false,
      method: 'mailto',
      approvalUrl,
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
          to_email: ownerEmail || import.meta.env.VITE_OWNER_NOTIFICATION_EMAIL || '',
          tree_id: treeId,
          tree_title: treeTitle || treeId,
          requester_name: requesterName || 'Family Member',
          requester_email: requesterEmail || 'Not provided',
          requested_role: requestedRole === 'editor' ? 'Editor' : 'Viewer',
          approval_url: approvalUrl
        }
      })
    });

    if (res.ok) {
      return {
        sent: true,
        method: 'emailjs',
        approvalUrl,
        mailtoUrl
      };
    }
  } catch (err) {
    console.warn('EmailJS notification failed, falling back to mailto:', err);
  }

  return {
    sent: false,
    method: 'mailto',
    approvalUrl,
    mailtoUrl
  };
}
