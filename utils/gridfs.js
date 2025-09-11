const mongoose = require("mongoose");
const { GridFSBucket, ObjectId } = require("mongodb");
const fs = require("fs");

let bucket;

function getBucket() {
  if (!bucket) {
    if (!mongoose.connection.db) throw new Error("MongoDB não conectado");
    bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });
  }
  return bucket;
}

async function uploadFileToGridFS(file) {
  return new Promise((resolve, reject) => {
    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream(file.originalname, {
      contentType: file.mimetype,
    });

    fs.createReadStream(file.path)
      .pipe(uploadStream)
      .on("error", reject)
      .on("finish", () => {
        fs.unlinkSync(file.path);
        resolve(uploadStream.id);
      });
  });
}

async function downloadFileFromGridFS(fileId) {
  const bucket = getBucket();
  return new Promise((resolve, reject) => {
    const chunks = [];
    bucket
      .openDownloadStream(new ObjectId(fileId)) 
      .on("data", (chunk) => chunks.push(chunk))
      .on("end", () => resolve(Buffer.concat(chunks)))
      .on("error", reject);
  });
}

module.exports = { uploadFileToGridFS, downloadFileFromGridFS };
