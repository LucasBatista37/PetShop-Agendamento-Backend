const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const fileName = Date.now() + ext;
    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".csv", ".xlsx"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Apenas arquivos CSV ou XLSX são permitidos!"), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
