const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require("crypto");
const transporter = require("../utils/mailer");

const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_USER = process.env.EMAIL_USER;
const BASE_URL = process.env.BASE_URL;
const CLIENT_URL = process.env.CLIENT_URL;

if (!JWT_SECRET) throw new Error("Variável JWT_SECRET não definida");
if (!EMAIL_USER) throw new Error("Variável EMAIL_USER não definida");
if (!BASE_URL) throw new Error("Variável BASE_URL não definida");
if (!CLIENT_URL) throw new Error("Variável CLIENT_URL não definida");

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "E-mail já cadastrado" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const emailToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      name,
      email,
      phone,
      password: hashed,
      emailToken,
    });

    const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${emailToken}&email=${email}`;

    await transporter.sendMail({
      from: `"PetCare" <${EMAIL_USER}>`,
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

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "E-mail já foi verificado" });
    }

    user.emailToken = crypto.randomBytes(32).toString("hex");
    await user.save();

    const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${user.emailToken}&email=${user.email}`;

    await transporter.sendMail({
      from: `"PetCare" <${EMAIL_USER}>`,
      to: email,
      subject: "Reenvio: Confirme seu e-mail no PetCare",
      html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4f46e5;">Olá, ${user.name}!</h2>
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
    html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
          <h2 style="color:#4f46e5;">Olá, ${user.name}!</h2>
          <p>Recebemos um pedido para redefinir sua senha.</p>
          <p>Clique no link abaixo para criar uma nova senha (válido por 1 hora):</p>
          <p><a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Redefinir Senha</a></p>
          <p>Ou copie e cole este link no navegador:</p>
          <p style="word-break:break-all;">${resetUrl}</p>
          <hr style="margin:24px 0;"/>
          <p style="font-size:12px;color:#888;">Se você não solicitou, ignore este e-mail.</p>
        </div>
      `,
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
      expiresIn: "15m",
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("Erro ao renovar token:", err);
    res.sendStatus(403);
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
      const user = await User.findById(decoded.userId);
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.json({ message: "Logout realizado com sucesso." });
  } catch (err) {
    console.error("Erro no logout:", err);
    res.status(500).json({ message: "Erro ao sair da conta" });
  }
};
