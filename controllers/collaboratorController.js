const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Invite = require("../models/Invite");
const User = require("../models/User");
const transporter = require("../utils/mailer");
const { generateInviteCollaboratorEmail } = require("../utils/emailTemplates");

exports.inviteCollaborator = async (req, res) => {
  try {
    const { email, department } = req.body;
    const adminId = req.user._id;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "Este e-mail já está em uso por um usuário ativo.",
      });
    }

    await Invite.deleteMany({ email, accepted: false });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; 

    await Invite.create({
      email,
      department,
      token,
      expiresAt,
      owner: adminId,
    });

    const inviteUrl = `${process.env.CLIENT_URL}/aceitar-convite?token=${token}&email=${email}`;

    await transporter.sendMail({
      from: `"PetCare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Convite para colaborar no PetCare",
      html: generateInviteCollaboratorEmail(inviteUrl),
    });

    res.json({ message: "Convite enviado com sucesso." });
  } catch (err) {
    console.error("Erro ao enviar convite:", err);
    res.status(500).json({ message: "Erro interno ao enviar convite." });
  }
};

exports.acceptInvite = async (req, res) => {
  try {
    const { token, email, name, password } = req.body;

    if (![token, email, name, password].every(Boolean)) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios." });
    }

    const invite = await Invite.findOne({
      token,
      email,
      expiresAt: { $gt: Date.now() },
      accepted: false,
    });

    if (!invite) {
      return res.status(400).json({ message: "Convite inválido ou expirado." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      department: invite.department,
      role: "collaborator",
      isVerified: true,
      owner: invite.owner,
    });

    invite.accepted = true;
    invite.acceptedAt = new Date();
    await invite.save();

    res.json({ message: "Conta criada com sucesso. Agora você pode fazer login." });
  } catch (err) {
    console.error("Erro ao aceitar convite:", err);
    res.status(500).json({ message: "Erro ao aceitar convite." });
  }
};

exports.getAllCollaborators = async (req, res) => {
  try {
    const collaborators = await User.find({
      role: "collaborator",
      owner: req.user._id,
    }).select("-password");

    res.json({ collaborators });
  } catch (err) {
    console.error("Erro ao listar colaboradores:", err);
    res.status(500).json({ message: "Erro ao listar colaboradores." });
  }
};

exports.deleteCollaborator = async (req, res) => {
  try {
    const { id } = req.params;

    const collaborator = await User.findOneAndDelete({
      _id: id,
      role: "collaborator",
      owner: req.user._id,
    });

    if (!collaborator) {
      return res.status(404).json({ message: "Colaborador não encontrado." });
    }

    res.json({ message: "Colaborador excluído com sucesso." });
  } catch (err) {
    console.error("Erro ao excluir colaborador:", err);
    res.status(500).json({ message: "Erro ao excluir colaborador." });
  }
};
