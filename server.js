require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const { startWorker } = require("./workers/appointmentWorker");

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });

  await startWorker();
});
