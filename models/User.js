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
    },
    refreshToken: { type: String },
    invitedBy: { type: String },
    pendingInvitation: { type: Boolean, default: false },
    inviteExpires: { type: Date },
    inviteAcceptedAt: { type: Date },
    department: { type: String, trim: true },
    subscription: {
      stripeCustomerId: { type: String },
      stripeSubscriptionId: { type: String },
      status: { type: String, default: "inactive" },
      currentPeriodEnd: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
