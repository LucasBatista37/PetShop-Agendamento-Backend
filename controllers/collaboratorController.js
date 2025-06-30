const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const transporter = require("../utils/mailer");
const User = require("../models/User");

exports.inviteCollaborator = async (req, res) => {
  try {
    const { email } = req.body;
    const adminId = req.user._id;

    const token = crypto.randomBytes(32).toString("hex");

    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser.role === "collaborator") {
      return res.status(400).json({
        message: "Esse usuário já é colaborador.",
      });
    }

    if (existingUser && existingUser.role !== "collaborator") {
      return res.status(400).json({
        message:
          "Este e-mail já está em uso por um usuário ativo. O usuário precisa excluir sua conta antes de poder ser adicionado como colaborador.",
      });
    }

    await User.create({
      email,
      role: "collaborator",
      emailToken: token,
      owner: adminId,
    });

    const inviteUrl = `${process.env.CLIENT_URL}/aceitar-convite?token=${token}&email=${email}`;

    await transporter.sendMail({
      from: `"PetCare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Convite para colaborar no PetCare",
      html: `
        <p>Você foi convidado a colaborar no sistema PetCare.</p>
        <p><a href="${inviteUrl}">Clique aqui para aceitar o convite</a></p>
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

    const user = await User.findOne({ email, emailToken: token });
    if (!user)
      return res.status(400).json({ message: "Convite inválido ou expirado." });

    user.name = name;
    user.password = await bcrypt.hash(password, 10);
    user.emailToken = undefined;
    user.isVerified = true;

    await user.save();

    res.json({ message: "Convite aceito com sucesso." });
  } catch (err) {
    console.error(err);
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

    res.json({ collaborators });
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