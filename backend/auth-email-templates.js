const BRAND_NAME = 'Mockly';
const SUPPORT_EMAIL = String(process.env.MOCKLY_SUPPORT_EMAIL || process.env.MOCKLY_EMAIL_REPLY_TO || 'support@mockly.in').trim();

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildShell = ({
    preheader,
    eyebrow,
    title,
    intro,
    accentLabel,
    accentValue,
    bodyHtml,
    footerNote
}) => {
    const safePreheader = escapeHtml(preheader);
    const safeEyebrow = escapeHtml(eyebrow);
    const safeTitle = escapeHtml(title);
    const safeIntro = escapeHtml(intro);
    const safeAccentLabel = escapeHtml(accentLabel);
    const safeAccentValue = escapeHtml(accentValue);
    const safeFooterNote = escapeHtml(footerNote);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#eef4f7;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef4f7;padding:24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid rgba(15,23,42,0.08);box-shadow:0 24px 60px rgba(15,23,42,0.12);">
                    <tr>
                        <td style="padding:32px 32px 18px;background:linear-gradient(135deg,#052e2b 0%,#0f766e 56%,#14b8a6 100%);color:#ecfeff;">
                            <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,0.16);font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${safeEyebrow}</div>
                            <h1 style="margin:18px 0 10px;font-size:32px;line-height:1.1;font-weight:800;color:#ffffff;">${safeTitle}</h1>
                            <p style="margin:0;font-size:16px;line-height:1.7;color:rgba(236,254,255,0.9);">${safeIntro}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 32px 12px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;border-radius:22px;background:linear-gradient(180deg,#f8fffe 0%,#effcf7 100%);border:1px solid rgba(15,118,110,0.14);">
                                <tr>
                                    <td style="padding:18px 20px 20px;">
                                        <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;color:#0f766e;margin-bottom:10px;">${safeAccentLabel}</div>
                                        <div style="font-size:34px;line-height:1;font-weight:800;letter-spacing:0.22em;color:#042f2e;">${safeAccentValue}</div>
                                    </td>
                                </tr>
                            </table>
                            ${bodyHtml}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:12px 32px 30px;">
                            <div style="padding-top:18px;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.7;color:#475569;">
                                <strong style="display:block;color:#0f172a;margin-bottom:6px;">${escapeHtml(BRAND_NAME)} support</strong>
                                <span>${safeFooterNote}</span><br>
                                <span>Need help? Reply to <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#0f766e;text-decoration:none;">${escapeHtml(SUPPORT_EMAIL)}</a>.</span>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

const buildParagraph = (text) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155;">${escapeHtml(text)}</p>`;

const buildBulletList = (items) => `
<ul style="margin:0 0 18px;padding-left:18px;color:#334155;">
    ${items.map((item) => `<li style="margin-bottom:8px;font-size:14px;line-height:1.6;">${escapeHtml(item)}</li>`).join('')}
</ul>`;

const buildVerificationOtpEmail = ({ name, otp, expiresInMinutes }) => {
    const displayName = String(name || 'Aspirant').trim() || 'Aspirant';
    const minutesText = `${Number(expiresInMinutes || 10)} minutes`;

    return {
        subject: 'Verify your Mockly account',
        text: [
            `Hi ${displayName},`,
            '',
            `Use OTP ${otp} to verify your Mockly account.`,
            `This OTP expires in ${minutesText}.`,
            '',
            `If you did not request this, you can ignore this email or contact ${SUPPORT_EMAIL}.`
        ].join('\n'),
        html: buildShell({
            preheader: `Your Mockly verification OTP is ${otp}.`,
            eyebrow: 'Account verification',
            title: `Verify your ${BRAND_NAME} account`,
            intro: `Hi ${displayName}, your prep dashboard is almost ready. Confirm your email with the OTP below to activate login, mock history, and personalized recommendations.`,
            accentLabel: 'Verification OTP',
            accentValue: otp,
            bodyHtml: [
                buildParagraph(`This code stays valid for ${minutesText}. Enter it in the verification screen to complete your signup.`),
                buildBulletList([
                    'Your account stays protected until the email owner confirms the OTP.',
                    'You only need to verify once on this email address.',
                    `If this was not you, simply ignore this email or contact ${SUPPORT_EMAIL}.`
                ])
            ].join(''),
            footerNote: 'You are receiving this because someone started a Mockly signup with this email address.'
        })
    };
};

const buildWelcomeEmail = ({ name }) => {
    const displayName = String(name || 'Aspirant').trim() || 'Aspirant';

    return {
        subject: 'Welcome to Mockly',
        text: [
            `Hi ${displayName},`,
            '',
            'Your Mockly account is verified and ready.',
            'You can now log in, launch mocks, track weak areas, and review your attempt history.',
            '',
            `Need help? Contact ${SUPPORT_EMAIL}.`
        ].join('\n'),
        html: buildShell({
            preheader: 'Your Mockly account is ready.',
            eyebrow: 'Welcome onboard',
            title: 'Your account is ready',
            intro: `Hi ${displayName}, you are now fully verified on ${BRAND_NAME}. Jump back in to continue mocks, track mistakes, and build a sharper exam strategy.`,
            accentLabel: 'Next best move',
            accentValue: 'Start a mock',
            bodyHtml: [
                buildParagraph('You now have access to login-protected mock launches, saved progress, and account recovery tools.'),
                buildBulletList([
                    'Launch personalized mocks from the same account every time.',
                    'Track recent attempts and identify weak sections faster.',
                    'Use forgot-password recovery whenever you need it.'
                ])
            ].join(''),
            footerNote: 'This confirmation was sent after your email verification completed successfully.'
        })
    };
};

const buildPasswordResetOtpEmail = ({ name, otp, expiresInMinutes }) => {
    const displayName = String(name || 'Aspirant').trim() || 'Aspirant';
    const minutesText = `${Number(expiresInMinutes || 10)} minutes`;

    return {
        subject: 'Reset your Mockly password',
        text: [
            `Hi ${displayName},`,
            '',
            `Use OTP ${otp} to reset your Mockly password.`,
            `This OTP expires in ${minutesText}.`,
            '',
            `If you did not request this, your account is still safe as long as you do not share this code. Contact ${SUPPORT_EMAIL} if needed.`
        ].join('\n'),
        html: buildShell({
            preheader: `Use ${otp} to reset your Mockly password.`,
            eyebrow: 'Password recovery',
            title: 'Reset your password',
            intro: `Hi ${displayName}, use the OTP below to create a new password for your ${BRAND_NAME} account and get back to your preparation quickly.`,
            accentLabel: 'Reset OTP',
            accentValue: otp,
            bodyHtml: [
                buildParagraph(`This reset code expires in ${minutesText}. For safety, only enter it on the Mockly password reset screen.`),
                buildBulletList([
                    'Do not share this OTP with anyone.',
                    'After resetting your password, use the new password for future logins.',
                    `If you did not request this, ignore the email and consider contacting ${SUPPORT_EMAIL}.`
                ])
            ].join(''),
            footerNote: 'You are receiving this because a Mockly password reset was requested for this email address.'
        })
    };
};

const buildPasswordChangedEmail = ({ name }) => {
    const displayName = String(name || 'Aspirant').trim() || 'Aspirant';

    return {
        subject: 'Your Mockly password was updated',
        text: [
            `Hi ${displayName},`,
            '',
            'Your Mockly password has been changed successfully.',
            `If you did not make this change, contact ${SUPPORT_EMAIL} immediately.`
        ].join('\n'),
        html: buildShell({
            preheader: 'Your Mockly password has been updated.',
            eyebrow: 'Security update',
            title: 'Password updated successfully',
            intro: `Hi ${displayName}, your ${BRAND_NAME} password was changed successfully. Your account is ready to use with the new password now.`,
            accentLabel: 'Status',
            accentValue: 'Updated',
            bodyHtml: [
                buildParagraph('If this change was made by you, there is nothing else to do.'),
                buildParagraph(`If this was not you, contact ${SUPPORT_EMAIL} immediately so we can help secure your account.`)
            ].join(''),
            footerNote: 'This alert was sent to confirm a password change on your Mockly account.'
        })
    };
};

module.exports = {
    buildVerificationOtpEmail,
    buildWelcomeEmail,
    buildPasswordResetOtpEmail,
    buildPasswordChangedEmail
};
