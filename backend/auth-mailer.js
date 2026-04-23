const nodemailer = require('nodemailer');
const {
    buildVerificationOtpEmail,
    buildWelcomeEmail,
    buildPasswordResetOtpEmail,
    buildPasswordChangedEmail
} = require('./auth-email-templates');

const toSafeString = (value) => String(value || '').trim();

const EMAIL_TRANSPORT = toSafeString(process.env.MOCKLY_EMAIL_TRANSPORT).toLowerCase();
const EMAIL_HOST = toSafeString(process.env.MOCKLY_EMAIL_HOST);
const EMAIL_PORT = Number.parseInt(toSafeString(process.env.MOCKLY_EMAIL_PORT), 10) || 587;
const EMAIL_SECURE = ['1', 'true', 'yes', 'on'].includes(toSafeString(process.env.MOCKLY_EMAIL_SECURE).toLowerCase());
const EMAIL_USER = toSafeString(process.env.MOCKLY_EMAIL_USER);
const EMAIL_PASSWORD = toSafeString(process.env.MOCKLY_EMAIL_PASSWORD);
const EMAIL_FROM = toSafeString(process.env.MOCKLY_EMAIL_FROM || process.env.MOCKLY_EMAIL_USER);
const EMAIL_REPLY_TO = toSafeString(process.env.MOCKLY_EMAIL_REPLY_TO || process.env.MOCKLY_SUPPORT_EMAIL);

const previewMailbox = [];
let transporter = null;

const isStreamTransport = () => EMAIL_TRANSPORT === 'stream';

const isEmailConfigured = () => {
    if (isStreamTransport()) return true;
    return Boolean(EMAIL_HOST && EMAIL_USER && EMAIL_PASSWORD && EMAIL_FROM);
};

const getTransporter = () => {
    if (transporter) return transporter;

    if (isStreamTransport()) {
        transporter = nodemailer.createTransport({
            streamTransport: true,
            newline: 'unix',
            buffer: true
        });
        return transporter;
    }

    if (!isEmailConfigured()) {
        throw new Error('Email delivery is not configured. Add MOCKLY_EMAIL_HOST, MOCKLY_EMAIL_PORT, MOCKLY_EMAIL_USER, MOCKLY_EMAIL_PASSWORD, and MOCKLY_EMAIL_FROM to .env.');
    }

    transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_SECURE,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASSWORD
        }
    });

    return transporter;
};

const recordPreview = ({ to, subject, text, html }) => {
    previewMailbox.push({
        to: toSafeString(to).toLowerCase(),
        subject: toSafeString(subject),
        text: toSafeString(text),
        html: toSafeString(html),
        sentAt: new Date().toISOString()
    });

    while (previewMailbox.length > 50) {
        previewMailbox.shift();
    }
};

const sendMail = async ({ to, subject, text, html }) => {
    const safeTo = toSafeString(to);
    if (!safeTo) {
        throw new Error('Cannot send email without a recipient.');
    }

    const transport = getTransporter();
    const info = await transport.sendMail({
        from: EMAIL_FROM,
        replyTo: EMAIL_REPLY_TO || undefined,
        to: safeTo,
        subject,
        text,
        html
    });

    recordPreview({ to: safeTo, subject, text, html });

    return info;
};

const sendVerificationOtpEmail = async ({ to, name, otp, expiresInMinutes }) => {
    const template = buildVerificationOtpEmail({ name, otp, expiresInMinutes });
    return sendMail({
        to,
        subject: template.subject,
        text: template.text,
        html: template.html
    });
};

const sendWelcomeEmail = async ({ to, name }) => {
    const template = buildWelcomeEmail({ name });
    return sendMail({
        to,
        subject: template.subject,
        text: template.text,
        html: template.html
    });
};

const sendPasswordResetOtpEmail = async ({ to, name, otp, expiresInMinutes }) => {
    const template = buildPasswordResetOtpEmail({ name, otp, expiresInMinutes });
    return sendMail({
        to,
        subject: template.subject,
        text: template.text,
        html: template.html
    });
};

const sendPasswordChangedEmail = async ({ to, name }) => {
    const template = buildPasswordChangedEmail({ name });
    return sendMail({
        to,
        subject: template.subject,
        text: template.text,
        html: template.html
    });
};

const getLatestEmailPreview = (recipient) => {
    const safeRecipient = toSafeString(recipient).toLowerCase();
    for (let index = previewMailbox.length - 1; index >= 0; index -= 1) {
        const item = previewMailbox[index];
        if (!safeRecipient || item.to === safeRecipient) {
            return item;
        }
    }
    return null;
};

const clearEmailPreviews = () => {
    previewMailbox.length = 0;
};

module.exports = {
    isEmailConfigured,
    sendVerificationOtpEmail,
    sendWelcomeEmail,
    sendPasswordResetOtpEmail,
    sendPasswordChangedEmail,
    getLatestEmailPreview,
    clearEmailPreviews
};
