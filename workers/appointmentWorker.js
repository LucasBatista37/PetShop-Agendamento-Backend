const { Worker } = require("bullmq");
const { redisConnection } = require("../utils/redis");
const XLSX = require("xlsx");
const fs = require("fs");
const Appointment = require("../models/Appointment");
const Service = require("../models/Service");

new Worker(
  "appointments",
  async job => {
    const { filePath, ownerId } = job.data;

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);

    const validAppointments = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      job.updateProgress(((i + 1) / rows.length) * 100);

      try {
        if (!row.petName || !row.ownerName || !row.baseService || !row.date || !row.time) {
          throw new Error("Campos obrigatórios ausentes");
        }

        const base = await Service.findById(row.baseService);
        if (!base) throw new Error("Serviço base inválido");

        const extras = row.extraServices
          ? await Service.find({ _id: { $in: row.extraServices.split(",") } })
          : [];

        const total = base.price + extras.reduce((acc, e) => acc + e.price, 0);

        validAppointments.push({
          petName: row.petName,
          species: row.species || "",
          breed: row.breed || "",
          notes: row.notes || "",
          size: row.size || "",
          ownerName: row.ownerName,
          ownerPhone: row.ownerPhone || "",
          baseService: base._id,
          extraServices: extras.map(e => e._id),
          date: new Date(row.date),
          time: row.time,
          status: row.status || "Pendente",
          price: total,
          user: ownerId,
        });
      } catch (err) {
        errors.push({ line: i + 2, error: err.message });
      }
    }

    if (validAppointments.length > 0) {
      await Appointment.insertMany(validAppointments, { ordered: false });
    }

    fs.unlinkSync(filePath);

    return {
      inserted: validAppointments.length,
      errors,
    };
  },
  { connection: redisConnection }
);
