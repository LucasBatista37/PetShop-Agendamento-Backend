const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const serviceRoutes = require("./routes/service.routes");
const indexRoutes = require("./routes/index.routes");
const appointmentRoutes = require("./routes/appointment.routes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api", indexRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
  res.send("🚀 API do PetShop SaaS está no ar!");
});

module.exports = app;
