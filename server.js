require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const { startWorker } = require("./workers/appointmentWorker");
const { checkTrialEndingUsers } = require("./jobs/sendTrialEndingEmails");

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    });

    startWorker()
      .then(() => console.log("✅ Worker de agendamentos iniciado"))
      .catch((err) => console.error("❌ Erro ao iniciar worker:", err));

    checkTrialEndingUsers()
      .then(() => console.log("📨 Verificação de trials executada na inicialização"))
      .catch((err) => console.error("❌ Erro ao verificar trials:", err));

    setInterval(async () => {
      try {
        await checkTrialEndingUsers();
        console.log("📨 Verificação diária de trials concluída");
      } catch (err) {
        console.error("❌ Erro ao executar verificação diária de trials:", err);
      }
    }, 24 * 60 * 60 * 1000);

  } catch (err) {
    console.error("❌ Erro ao iniciar servidor:", err);
    process.exit(1); 
  }
})();
