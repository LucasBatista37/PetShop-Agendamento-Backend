const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const { redisConnection } = require("../utils/redis");
const Appointment = require("../models/Appointment");
const Service = require("../models/Service");
const csvParser = require("csv-parser");
const xlsx = require("xlsx");
const Grid = require("gridfs-stream");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

let gfs;
const conn = mongoose.connection;
conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

async function downloadFile(fileId) {
  return new Promise((resolve, reject) => {
    const tempPath = path.join(__dirname, `temp_${fileId}`);
    const writeStream = fs.createWriteStream(tempPath);

    const readStream = gfs.createReadStream({
      _id: mongoose.Types.ObjectId(fileId),
    });
    readStream.pipe(writeStream);

    readStream.on("error", reject);
    writeStream.on("finish", () => resolve(tempPath));
    writeStream.on("error", reject);
  });
}

async function startWorker() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("📦 MongoDB conectado com sucesso!");

    const worker = new Worker(
      "appointments",
      async (job) => {
        const { fileId, ownerId } = job.data;
        if (!fileId) throw new Error("job.data.fileId ausente");

        // Baixa o arquivo do GridFS
        const filePath = await downloadFile(fileId);

        let rows = [];
        const ext = path.extname(filePath).toLowerCase();
        if (ext === ".csv" || ext === ".txt") {
          rows = await new Promise((resolve, reject) => {
            const data = [];
            fs.createReadStream(filePath)
              .pipe(
                csvParser({
                  mapHeaders: ({ header }) => header.replace(/"/g, "").trim(),
                })
              )
              .on("data", (row) => data.push(row))
              .on("end", () => resolve(data))
              .on("error", reject);
          });
        } else if (ext === ".xlsx" || ext === ".xls") {
          const workbook = xlsx.readFile(filePath);
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
        }

        const results = [];
        for (const row of rows) {
          try {
            const baseName =
              row["Serviço Base"] || row["Servico"] || row["baseService"];
            if (!baseName?.toString().trim()) continue;

            const base = await Service.findOne({
              name: new RegExp(`^${baseName}$`, "i"),
            });
            if (!base) continue;

            const extraNames = String(row["Serviços Extras"] || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            const extras = await Service.find({ name: { $in: extraNames } });
            const total =
              base.price + extras.reduce((acc, e) => acc + e.price, 0);

            await Appointment.create({
              petName: row["Pet"] || "",
              species: row["Espécie"] || "",
              breed: row["Raça"] || "",
              notes: row["Notas"] || "",
              size: row["Porte"] || "",
              ownerName: row["Dono"] || "",
              ownerPhone: row["Telefone"] || "",
              baseService: base._id,
              extraServices: extras.map((e) => e._id),
              date: row["Data"] || "",
              time: row["Hora"] || "",
              status: row["Status"] || "Pendente",
              price: total,
              user: ownerId,
            });

            results.push(base._id);
          } catch (err) {
            console.error("❌ Erro ao processar linha:", err.message, row);
          }
        }

        fs.unlinkSync(filePath); 
        console.log(
          `🎉 Job ${job.id} processou ${results.length} agendamentos`
        );
        return { inseridos: results.length, ids: results };
      },
      { connection: redisConnection, removeOnComplete: true, removeOnFail: 50 }
    );

    worker.on("completed", (job) =>
      console.log(`✅ Job ${job.id} finalizado com sucesso!`)
    );
    worker.on("failed", (job, err) =>
      console.error(`💥 Job ${job.id} falhou:`, err)
    );

    console.log("👷 Worker de agendamentos iniciado...");
  } catch (err) {
    console.error("❌ Erro ao iniciar worker:", err);
    process.exit(1);
  }
}

module.exports = { startWorker };
