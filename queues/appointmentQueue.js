const { Worker, Queue } = require("bullmq");
const mongoose = require("mongoose");
const { redisConnection } = require("../utils/redis");
const Appointment = require("../models/Appointment");
const Service = require("../models/Service");
const { downloadFileFromGridFS } = require("../utils/gridfs");
const csvParser = require("csv-parser");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const queue = new Queue("appointments", { connection: redisConnection });

function detectFormatByHeader(buffer) {
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return ".xlsx";
  if (
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  )
    return ".xls";
  return ".csv";
}

async function parseFileBuffer(buffer) {
  let ext = detectFormatByHeader(buffer);
  if (ext === ".csv" || ext === ".txt") {
    return new Promise((resolve, reject) => {
      const rows = [];
      const stream = require("stream");
      const readable = new stream.Readable();
      readable._read = () => {};
      readable.push(buffer);
      readable.push(null);

      readable
        .pipe(
          csvParser({
            mapHeaders: ({ header }) =>
              header ? header.replace(/"/g, "").trim() : header,
            mapValues: ({ value }) =>
              typeof value === "string"
                ? value.replace(/"/g, "").trim()
                : value,
          })
        )
        .on("data", (data) => rows.push(data))
        .on("end", () => resolve(rows))
        .on("error", (err) => reject(err));
    });
  } else if (ext === ".xlsx" || ext === ".xls") {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(sheet, { defval: "" });
  } else {
    throw new Error("Formato de arquivo não suportado");
  }
}

const worker = new Worker(
  "appointments",
  async (job) => {
    const { fileId, ownerId } = job.data;
    if (!fileId) throw new Error("job.data.fileId ausente");

    const buffer = await downloadFileFromGridFS(fileId);
    const rows = await parseFileBuffer(buffer);
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
        const total = base.price + extras.reduce((acc, e) => acc + e.price, 0);

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

    console.log(`🎉 Job ${job.id} processou ${results.length} agendamentos`);
    return { inseridos: results.length, ids: results };
  },
  { connection: redisConnection, lockDuration: 60000 }
);

worker.on("completed", (job) => console.log(`✅ Job ${job.id} finalizado!`));
worker.on("failed", (job, err) =>
  console.error(`💥 Job ${job.id} falhou:`, err)
);

module.exports = { queue, worker };
