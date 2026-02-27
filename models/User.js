const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String },
    password: { type: String },
    isVerified: { type: Boolean, default: false },
    emailToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    role: {
      type: String,
      enum: ["admin", "collaborator"],
      default: "admin",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    refreshToken: { type: String },
    invitedBy: { type: String },
    pendingInvitation: { type: Boolean, default: false },
    inviteExpires: { type: Date },
    inviteAcceptedAt: { type: Date },
    department: { type: String, trim: true },
    subscription: {
      stripeCustomerId: { type: String, default: null },
      stripeSubscriptionId: { type: String, default: null },
      status: {
        type: String,
        enum: ["inactive", "trialing", "active", "past_due", "canceled"],
        default: "inactive",
      },
      currentPeriodStart: { type: Date, default: null },
      currentPeriodEnd: { type: Date, default: null },
    },
    appointmentsSortOrder: {
      type: String,
      enum: ["asc", "desc"],
      default: "asc",
    },
    order: { type: Number, default: 0 },
    customUrl: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    isUrlActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
