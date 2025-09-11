const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require("crypto");
const transporter = require("../utils/mailer");
const { validationResult } = require("express-validator");
const { generateVerificationEmail } = require("../utils/emailTemplates");
const { createUser } = require("../services/userService");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_USER = process.env.EMAIL_USER;
const BASE_URL = process.env.BASE_URL;
const CLIENT_URL = process.env.CLIENT_URL;

if (!JWT_SECRET) throw new Error("Variável JWT_SECRET não definida");
if (!EMAIL_USER) throw new Error("Variável EMAIL_USER não definida");
if (!BASE_URL) throw new Error("Variável BASE_URL não definida");
if (!CLIENT_URL) throw new Error("Variável CLIENT_URL não definida");

const mapStripeStatusToEnum = (subscription) => {
  if (subscription.trial_end && subscription.trial_end * 1000 > Date.now()) {
    return "trialing";
  }

  switch (subscription.status) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
    default:
      return "inactive";
  }
};

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, phone, password } = req.body;

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: "E-mail já cadastrado" });
    }

    const { user, emailToken } = await createUser({
      name,
      email,
      phone,
      password,
    });

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      trial_period_days: 30,
      payment_behavior: "allow_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    user.subscription = {
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
      status: mapStripeStatusToEnum(subscription), 
      currentPeriodStart: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000)
        : null,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    };

    console.log("Stripe subscription returned:", subscription);

    await user.save();

    const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${emailToken}&email=${email}`;

    await transporter.sendMail({
      from: `"PetCare" <${EMAIL_USER}>`,
      to: email,
      subject: "Confirme seu e-mail no PetCare",
      html: generateVerificationEmail(name, verifyUrl),
    });

    res.status(201).json({
      message:
        "Cadastro realizado com sucesso. Você ganhou 30 dias grátis! Verifique seu e-mail para ativar sua conta.",
    });
  } catch (err) {
    console.error("[REGISTER] Erro:", err);

    if (err.type === "StripeCardError" || err.type?.includes("Stripe")) {
      return res.status(400).json({ message: "Erro ao processar no Stripe." });
    }

    res.status(500).json({ message: "Erro no servidor." });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.query;
    const user = await User.findOne({ email, emailToken: token });

    if (!user) {
      return res.status(400).json({ message: "Token inválido ou expirado." });
    }

    user.emailToken = undefined;
    user.isVerified = true;
    await user.save();

    res.redirect(`${CLIENT_URL}/email-verificado`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao verificar e-mail" });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "Usuário não encontrado" });
    if (user.isVerified)
      return res.status(400).json({ message: "E-mail já foi verificado" });

    user.emailToken = crypto.randomBytes(32).toString("hex");
    await user.save();

    const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${user.emailToken}&email=${user.email}`;

    await transporter.sendMail({
      from: `"PetCare" <${EMAIL_USER}>`,
      to: email,
      subject: "Reenvio: Confirme seu e-mail no PetCare",
      html: generateVerificationEmail(user.name, verifyUrl),
    });

    res.json({ message: "E-mail de confirmação reenviado com sucesso." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao reenviar e-mail de verificação" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || !user.password) {
      return res.status(400).json({ message: "Credenciais inválidas." });
    }

    const validCredentials = await bcrypt.compare(password, user.password);

    if (!validCredentials || !user.isVerified) {
      return res
        .status(400)
        .json({ message: "Credenciais inválidas ou e-mail não verificado." });
    }

    const accessToken = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "15m",
    });

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_SECRET,
      {
        expiresIn: "30d",
      }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
      .json({
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar perfil" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar perfil" });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: "Usuário excluído com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao excluir usuário" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "É preciso informar senha atual e nova senha." });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Senha atual incorreta." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Senha alterada com sucesso." });
  } catch (err) {
    console.error("Erro em changePassword:", err);
    res.status(500).json({ message: "Erro ao alterar senha." });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email é obrigatório." });

  const user = await User.findOne({ email });
  if (!user)
    return res.status(404).json({ message: "Usuário não encontrado." });

  const token = crypto.randomBytes(20).toString("hex");
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000;
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}&email=${email}`;

  await transporter.sendMail({
    from: `"PetCare" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Redefinição de senha PetCare",
    html: generateResetPasswordEmail(user.name, resetUrl),
  });

  res.json({
    message: "Link de redefinição de senha enviado para seu e-mail.",
  });
};

exports.resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res
      .status(400)
      .json({ message: "Email, token e nova senha são obrigatórios." });
  }

  const user = await User.findOne({
    email,
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    return res.status(400).json({ message: "Token inválido ou expirado." });
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: "Senha redefinida com sucesso." });
};

exports.refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== token) return res.sendStatus(403);

    const newAccessToken = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "1m",
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("Erro ao renovar token:", err);
    res.sendStatus(403);
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
        const user = await User.findById(decoded.userId);
        if (user) {
          user.refreshToken = null;
          await user.save();
        }
      } catch (err) {
        console.warn("Token inválido ou expirado:", err.message);
      }
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });
    res.json({ message: "Logout realizado com sucesso." });
  } catch (err) {
    res.status(500).json({ message: "Erro ao sair da conta" });
  }
};
