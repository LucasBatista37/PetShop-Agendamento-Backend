const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: "Usuário não encontrado" });

    req.user = user;
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) return res.status(401).json({ message: "Refresh token não fornecido" });

      try {
        const decodedRefresh = jwt.verify(refreshToken, REFRESH_SECRET);
        const user = await User.findById(decodedRefresh.userId);

        if (!user || user.refreshToken !== refreshToken) {
          return res.status(403).json({ message: "Refresh token inválido" });
        }

        const newAccessToken = jwt.sign({ userId: user._id }, JWT_SECRET, {
          expiresIn: "15m",
        });

        res.setHeader("x-access-token", newAccessToken);

        req.user = user;
        return next();
      } catch (refreshErr) {
        console.error("Erro no refreshToken:", refreshErr);
        return res.status(403).json({ message: "Refresh token inválido ou expirado" });
      } 
    }

    console.error("Erro na autenticação:", err);
    return res.status(401).json({ message: "Token inválido" });
  }
};
