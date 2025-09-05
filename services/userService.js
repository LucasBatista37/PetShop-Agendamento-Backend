const bcrypt = require("bcryptjs");
const User = require("../models/User");
const crypto = require("crypto");

async function createUser({
  name,
  email,
  phone,
  password,
  department,
  role = "admin",
  owner = null,
  isVerified = false,
  pendingInvitation = false,
  skipEmailToken = false,   
}) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const emailToken = skipEmailToken
    ? null
    : crypto.randomBytes(32).toString("hex");

  const userData = {
    name,
    email,
    phone,
    password: hashedPassword,
    department,
    role,
    owner,
    isVerified,
    pendingInvitation,
  };

  if (!skipEmailToken) {
    userData.emailToken = emailToken;
  }

  const user = await User.create(userData);

  return { user, emailToken };
}

module.exports = { createUser };
