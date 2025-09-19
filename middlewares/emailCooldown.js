const cooldowns = new Map();
const EMAIL_COOLDOWN = 60; // segundos

module.exports = function emailCooldown(req, res, next) {
  const email = req.body.email;
  if (!email) return res.status(400).json({ message: "E-mail é obrigatório" });

  const now = Date.now();
  const lastRequest = cooldowns.get(email);

  if (lastRequest && now - lastRequest < EMAIL_COOLDOWN * 1000) {
    const retryAt = lastRequest + EMAIL_COOLDOWN * 1000;
    const wait = Math.ceil((retryAt - now) / 1000);
    return res.status(429).json({
      message: `Aguarde ${wait}s antes de solicitar outro e-mail de verificação`,
      retryAt, // timestamp em ms que o usuário poderá reenviar
    });
  }

  cooldowns.set(email, now);
  next();
};
