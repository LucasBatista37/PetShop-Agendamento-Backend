const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require("crypto");
const transporter = require("../utils/mailer");
const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "E-mail já cadastrado" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const emailToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      name,
      email,
      phone,
      password: hashed,
      emailToken,
    });

    const verifyUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${emailToken}&email=${email}`;

    await transporter.sendMail({
      from: `"PetCare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Confirme seu e-mail no PetCare",
      html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #4f46e5;">Olá, ${name}!</h2>
      <p>Obrigado por se cadastrar no <strong>PetCare</strong>.</p>
      <p>Para ativar sua conta, clique no botão abaixo:</p>
      <p style="text-align: center;">
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Confirmar E-mail
        </a>
      </p>
      <p>Ou copie e cole este link no seu navegador:</p>
      <p style="word-break: break-all;">${verifyUrl}</p>
      <hr style="margin: 24px 0;" />
      <p style="font-size: 12px; color: #888;">
        Se você não se registrou no PetCare, pode ignorar este e-mail.
      </p>
    </div>
  `,
    });

    res.status(201).json({
      message:
        "Cadastro realizado. Verifique seu e-mail para ativar sua conta.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor" });
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

    res.redirect(`${process.env.CLIENT_URL}/email-verificado`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao verificar e-mail" });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "E-mail já foi verificado" });
    }

    user.emailToken = crypto.randomBytes(32).toString("hex");
    await user.save();

    const verifyUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${user.emailToken}&email=${user.email}`;

    await transporter.sendMail({
      from: `"PetCare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reenvio: Confirme seu e-mail no PetCare",
      html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #4f46e5;">Olá, ${name}!</h2>
      <p>Obrigado por se cadastrar no <strong>PetCare</strong>.</p>
      <p>Para ativar sua conta, clique no botão abaixo:</p>
      <p style="text-align: center;">
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Confirmar E-mail
        </a>
      </p>
      <p>Ou copie e cole este link no seu navegador:</p>
      <p style="word-break: break-all;">${verifyUrl}</p>
      <hr style="margin: 24px 0;" />
      <p style="font-size: 12px; color: #888;">
        Se você não se registrou no PetCare, pode ignorar este e-mail.
      </p>
    </div>
  `,
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

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Credenciais inválidas" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "E-mail não verificado. Verifique sua caixa de entrada.",
      });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
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
    const user = await User.findById(req.userId).select("-password");
    if (!user)
      return res.status(404).json({ message: "Usuário não encontrado" });
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
      req.userId,
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
    await User.findByIdAndDelete(req.userId);
    res.json({ message: "Usuário excluído com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao excluir usuário" });
  }
};
