const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    petName: { type: String, required: true, trim: true },
    species: { type: String, required: true, enum: ["Cachorro", "Gato"] },
    breed: { type: String, trim: true },
    notes: { type: String, trim: true },
    price: { type: Number },
    size: {
      type: String,
      required: true,
      enum: ["Pequeno", "Medio", "Grande"],
    },
    ownerName: { type: String, required: true, trim: true },
    ownerPhone: { type: String, trim: true },
    baseService: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    extraServices: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
    date: { type: Date, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pendente", "Confirmado", "Cancelado", "Finalizado"],
      default: "Pendente",
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
