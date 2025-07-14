const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser"); 

const Sentry = require("@sentry/node");

const authRoutes = require("./routes/auth.routes");
const serviceRoutes = require("./routes/service.routes");
const indexRoutes = require("./routes/index.routes");
const appointmentRoutes = require("./routes/appointment.routes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const supportRoutes = require("./routes/support.routes.js");
const collaboratorRoutes = require("./routes/collaborator.js");

const app = express();

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

app.use(
  cors({
    origin: process.env.CLIENT_URL, 
    credentials: true, 
  })
);

app.use(express.json());
app.use(cookieParser()); 

app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api", indexRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/collaborators", collaboratorRoutes);

app.get("/", (req, res) => {
  res.send("🚀 API do PetShop SaaS está no ar!");
});

app.use(Sentry.Handlers.errorHandler());

module.exports = app;
