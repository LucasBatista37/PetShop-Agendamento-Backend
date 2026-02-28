const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Invite = require("../models/Invite");
const User = require("../models/User");
const transporter = require("../utils/mailer");
const { createUser } = require("../services/userService");
const { generateInviteCollaboratorEmail } = require("../utils/emailTemplates");

const getOwnerId = require("../utils/getOwnerId");

exports.inviteCollaborator = async (req, res) => {
  try {
    const { email, department, role, permissions } = req.body;
    const adminId = getOwnerId(req.user);

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
      role: role && role === "admin" ? "admin" : "collaborator",
      permissions: permissions || {},
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
    res.status(500).json({ message: "Erro interno ao enviar convite." });
  }
};

exports.acceptInvite = async (req, res) => {
  try {
    const { token, email, name, password } = req.body;

    if (![token, email, name, password].every(Boolean)) {
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios." });
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

    const { user } = await createUser({
      name,
      email,
      password,
      department: invite.department,
      role: invite.role || "collaborator",
      permissions: invite.permissions || {},
      owner: invite.owner,
      isVerified: true,
      pendingInvitation: false,
      skipEmailToken: true,
    });

    user.inviteAcceptedAt = new Date();
    user.invitedBy = invite.owner ? invite.owner.toString() : undefined;
    user.emailToken = undefined;
    await user.save();

    invite.accepted = true;
    invite.acceptedAt = new Date();
    await invite.save();

    res.json({
      message: "Conta criada com sucesso. Agora você pode fazer login.",
    });
  } catch (err) {
    console.error("💥 Erro ao aceitar convite:", err);
    res.status(500).json({ message: "Erro ao aceitar convite." });
  }
};

exports.getAllCollaborators = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const ownerId = getOwnerId(req.user);

    const query = { owner: ownerId };

    const totalItems = await User.countDocuments(query);

    const totalPages = Math.ceil(totalItems / limit);
    const currentPage = Math.min(Math.max(parseInt(page), 1), totalPages || 1);

    const collaborators = await User.find(query)
      .select("-password")
      .skip((currentPage - 1) * limit)
      .limit(parseInt(limit))
      .sort({ order: 1, createdAt: -1 })
      .lean();

    // Add distinction flag
    collaborators.forEach(c => {
      c.isPromotedAdmin = c.role === 'admin';
    });

    res.json({
      collaborators,
      pagination: {
        totalItems,
        totalPages,
        currentPage,
        rowsPerPage: parseInt(limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Erro ao listar colaboradores." });
  }
};

exports.updateCollaborator = async (req, res) => {
  try {
    const { id } = req.params;
    const { department, phone, role, permissions } = req.body;

    const collaborator = await User.findOne({
      _id: id,
      owner: getOwnerId(req.user),
    });

    if (!collaborator) {
      return res.status(404).json({ message: "Colaborador não encontrado." });
    }

    if (department !== undefined) collaborator.department = department;
    if (phone !== undefined) collaborator.phone = phone;
    if (role !== undefined && (role === "admin" || role === "collaborator")) {
      collaborator.role = role;
    }
    if (permissions !== undefined) {
      // Merge permissions instead of just overriding entirely, to support partial updates
      collaborator.permissions = {
        ...collaborator.permissions,
        ...permissions,
      };
    }

    await collaborator.save();

    const updated = collaborator.toObject();
    delete updated.password;

    res.json({
      message: "Colaborador atualizado com sucesso.",
      collaborator: updated
    });
  } catch (err) {
    console.error("Erro ao atualizar colaborador:", err);
    res.status(500).json({ message: "Erro ao atualizar colaborador." });
  }
};

exports.deleteCollaborator = async (req, res) => {
  try {
    const { id } = req.params;

    const collaborator = await User.findOneAndDelete({
      _id: id,
      owner: getOwnerId(req.user),
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

exports.reorderCollaborators = async (req, res) => {
  try {
    const { collaborators } = req.body;
    const ownerId = getOwnerId(req.user);

    // Use Promise.all to update all in parallel
    await Promise.all(
      collaborators.map(async (item) => {
        await User.findOneAndUpdate(
          { _id: item._id, owner: ownerId },
          { order: item.order }
        );
      })
    );

    res.json({ message: "Ordem atualizada com sucesso." });
  } catch (err) {
    console.error("Erro ao reordenar colaboradores:", err);
    res.status(500).json({ message: "Erro ao reordenar colaboradores." });
  }
};
