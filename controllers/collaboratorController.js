const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const transporter = require("../utils/mailer");
const User = require("../models/User");

exports.inviteCollaborator = async (req, res) => {
  try {
    const { email, department } = req.body;
    const adminId = req.user._id;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.role === "collaborator") {
        return res.status(400).json({
          message: "Esse usuário já é colaborador.",
        });
      }
      return res.status(400).json({
        message:
          "Este e-mail já está em uso por um usuário ativo. O usuário precisa excluir sua conta antes de poder ser adicionado como colaborador.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expirationDate = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await User.create({
      email,
      department,
      role: "collaborator",
      emailToken: token,
      inviteExpires: expirationDate,
      pendingInvitation: true,
      owner: adminId,
    });

    const inviteUrl = `${process.env.CLIENT_URL}/aceitar-convite?token=${token}&email=${email}`;

    await transporter.sendMail({
      from: `"PetCare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Convite para colaborar no PetCare",
      html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #4f46e5;">Olá!</h2>
      <p>Você foi convidado para colaborar no sistema <strong>PetCare</strong>.</p>
      <p>Para aceitar o convite, clique no botão abaixo:</p>
      <p style="text-align: center;">
        <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Aceitar Convite
        </a>
      </p>
      <p>Ou copie e cole este link no seu navegador:</p>
      <p style="word-break: break-all;">${inviteUrl}</p>
      <hr style="margin: 24px 0;" />
      <p style="font-size: 12px; color: #888;">
        Se você não esperava esse convite, pode ignorar este e-mail.
      </p>
    </div>
  `,
    });

    res.json({ message: "Convite enviado com sucesso para novo colaborador." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao enviar convite." });
  }
};

exports.acceptInvite = async (req, res) => {
  try {
    const { token, email, name, password } = req.body;

    if (![email, token, name, password].every(Boolean)) {
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios." });
    }

    const user = await User.findOne({
      email,
      emailToken: token,
      inviteExpires: { $gt: Date.now() },
      pendingInvitation: true,
    });

    if (!user) {
      return res.status(400).json({ message: "Convite inválido ou expirado." });
    }

    user.name = name;
    user.password = await bcrypt.hash(password, 10);
    user.emailToken = undefined;
    user.isVerified = true;
    user.pendingInvitation = false;
    user.inviteAcceptedAt = new Date();

    await user.save();

    res.json({
      message: "Convite aceito com sucesso. Agora você pode fazer login.",
    });
  } catch (err) {
    console.error("Erro ao aceitar convite:", err);
    res.status(500).json({ message: "Erro ao aceitar convite." });
  }
};

exports.getAllCollaborators = async (req, res) => {
  try {
    const adminId = req.user._id;

    const collaborators = await User.find({
      role: "collaborator",
      owner: adminId,
    }).select(
      "-password -emailToken -resetPasswordToken -resetPasswordExpires"
    );

    const enriched = collaborators.map((c) => {
      const status = c.pendingInvitation
        ? "Pendente"
        : c.inviteAcceptedAt
        ? "Ativo"
        : "Indefinido";

      return {
        ...c.toObject(),
        status,
      };
    });

    res.json({ collaborators: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao listar colaboradores" });
  }
};

exports.deleteCollaborator = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { id } = req.params;

    const collaborator = await User.findOneAndDelete({
      _id: id,
      owner: adminId,
      role: "collaborator",
    });

    if (!collaborator) {
      return res.status(404).json({ message: "Colaborador não encontrado" });
    }

    res.json({ message: "Colaborador excluído com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao excluir colaborador" });
  }
};
