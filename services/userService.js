const bcrypt = require("bcryptjs");
const User = require("../models/User");
const crypto = require("crypto");

async function createUser({ name, email, phone, password, department, role = "user", owner = null, verified = false }) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const emailToken = crypto.randomBytes(32).toString("hex");

  const user = await User.create({
    name,
    email,
    phone,
    password: hashedPassword,
    department,
    role,
    owner,
    emailToken,
    isVerified: verified,
  });

  return { user, emailToken };
}

module.exports = { createUser };
