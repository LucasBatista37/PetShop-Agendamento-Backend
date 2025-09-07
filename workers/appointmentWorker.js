const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const { redisConnection } = require("../utils/redis");
const Appointment = require("../models/Appointment");
const Service = require("../models/Service");
const path = require("path");
const fs = require("fs");
const csvParser = require("csv-parser");
const xlsx = require("xlsx"); 
const dotenv = require("dotenv");
dotenv.config();

async function startWorker() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {});
    console.log("📦 MongoDB conectado com sucesso!");

    const worker = new Worker(
      "appointments",
      async (job) => {
        console.log(`📥 Processando job ${job.id}...`);
        const { filePath, ownerId } = job.data;
        console.log(`📂 Lendo arquivo: ${filePath}`);

        const results = [];
        const promises = [];

        const ext = path.extname(filePath).toLowerCase();

        let rows = [];

        if (ext === ".csv") {
          await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
              .pipe(
                csvParser({
                  mapHeaders: ({ header }) => header.replace(/"/g, "").trim(),
                  mapValues: ({ value }) => value.replace(/"/g, "").trim(),
                })
              )
              .on("headers", (headers) => console.log("📑 Headers lidos:", headers))
              .on("data", (row) => rows.push(row))
              .on("end", resolve)
              .on("error", reject);
          });
        } else if (ext === ".xlsx" || ext === ".xls") {
          const workbook = xlsx.readFile(filePath);
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
          console.log("📑 Headers lidos (Excel):", Object.keys(rows[0] || {}));
        } else {
          throw new Error("Formato de arquivo não suportado");
        }

        for (const row of rows) {
          const p = (async () => {
            try {
              const baseName = row["Serviço Base"]?.trim();
              if (!baseName) return console.warn("⚠️ Linha sem serviço base definido");

              const base = await Service.findOne({ name: new RegExp(`^${baseName}$`, "i") });
              if (!base) return console.warn(`⚠️ Serviço base não encontrado: ${baseName}`);

              const extraNames = (row["Serviços Extras"] || "")
                .split(",")
                .map((e) => e.trim())
                .filter(Boolean);

              const extras = await Service.find({ name: { $in: extraNames } });

              const total = base.price + extras.reduce((acc, e) => acc + e.price, 0);

              const appoint = await Appointment.create({
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

              results.push(appoint._id);
            } catch (err) {
              console.error("❌ Erro ao processar linha:", err.message);
            }
          })();
          promises.push(p);
        }

        await Promise.all(promises);
        console.log(`✅ Job ${job.id} concluído. Processadas ${results.length} linhas`);
        return { inseridos: results.length, ids: results };
      },
      { connection: redisConnection }
    );

    worker.on("completed", (job, result) => {
      console.log(`🎉 Job ${job.id} finalizado com sucesso! Resultado:`, result);
    });

    worker.on("failed", (job, err) => {
      console.error(`💥 Job ${job.id} falhou:`, err);
    });

    console.log("👷 Worker de agendamentos iniciado...");
  } catch (err) {
    console.error("❌ Erro ao iniciar worker:", err);
  }
}

startWorker();