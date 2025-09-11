const cron = require("node-cron");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const { generateTrialEndingEmail } = require("../utils/emailTemplates");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true", 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendTrialEndingEmail(user) {
  const html = generateTrialEndingEmail(user.name);

  await transporter.sendMail({
    from: `"PetCare" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: "Seu trial está acabando! Ative sua assinatura",
    html,
  });
}

async function checkTrialEndingUsers() {
  const now = new Date();

  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + 3);

  const users = await User.find({
    "subscription.status": "trialing",
    "subscription.currentPeriodEnd": {
      $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
      $lte: new Date(targetDate.setHours(23, 59, 59, 999)),
    },
  });

  for (const user of users) {
    try {
      await sendTrialEndingEmail(user);
      console.log(`[TRIAL EMAIL] Enviado para: ${user.email}`);
    } catch (err) {
      console.error(`[TRIAL EMAIL] Erro ao enviar para ${user.email}:`, err.message);
    }
  }
}

cron.schedule("0 9 * * *", () => {
  console.log("[CRON] Verificando trials próximos do fim...");
  checkTrialEndingUsers();
});

module.exports = { checkTrialEndingUsers };
