const Sentry = require('@sentry/node');
require('dotenv').config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

module.exports = Sentry;
  