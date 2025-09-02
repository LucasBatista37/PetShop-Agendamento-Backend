const express = require("express");
const cors = require("cors");
const Sentry = require("@sentry/node");

const authRoutes = require("./routes/auth.routes");
const serviceRoutes = require("./routes/service.routes");
const indexRoutes = require("./routes/index.routes");
const appointmentRoutes = require("./routes/appointment.routes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const supportRoutes = require("./routes/support.routes.js");
const stripeRoutes = require("./routes/stripe.routes");
const stripeWebhook = require("./routes/stripe.webhook");

const app = express();

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

app.use(cors());

app.use("/api/stripe/webhook", stripeWebhook);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api", indexRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/stripe", stripeRoutes);

app.get("/", (req, res) => {
  res.send("🚀 API do PetShop SaaS está no ar!");
});

app.use(Sentry.Handlers.errorHandler());

module.exports = app;
