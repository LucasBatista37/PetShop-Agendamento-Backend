require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const { startWorker } = require("./workers/appointmentWorker");
const { checkTrialEndingUsers } = require("./jobs/sendTrialEndingEmails");

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });

  await startWorker();

  await checkTrialEndingUsers();

  setInterval(async () => {
    await checkTrialEndingUsers();
    console.log("Teste finalizado!");
  }, 24 * 60 * 60 * 1000);
});
