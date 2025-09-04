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
  isVerified = false, // padronizado com schema
}) {
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
    isVerified,
  });

  return { user, emailToken };
}

module.exports = { createUser };
