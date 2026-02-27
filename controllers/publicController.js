const User = require("../models/User");
const Appointment = require("../models/Appointment");

exports.getPublicSchedule = async (req, res) => {
    try {
        const { customUrl } = req.params;
        const { date } = req.query; // YYYY-MM-DD

        // 1. Encontrar o usuário através da URL customizada
        const petshopUser = await User.findOne({ customUrl, isUrlActive: true });

        if (!petshopUser) {
            return res.status(404).json({ message: "Pet Shop não encontrado ou URL inativa." });
        }

        const ownerId = petshopUser._id;

        // Se não tiver data, apenas retornamos os detalhes básicos do pet shop
        if (!date) {
            return res.json({
                name: petshopUser.name,
                phone: petshopUser.phone,
                // poderíamos retornar logo e outras infos se existisse
            });
        }

        // 2. Buscar agendamentos na data específica
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        const dayAppts = await Appointment.find({
            user: ownerId,
            date: { $gte: startDate, $lte: endDate },
            status: { $ne: "cancelado" }, // ignora cancelados (assumo que existam)
        });

        // 3. Calcular horários disponíveis
        const MAX_PER_HOUR = 3; // Lógica atual de limite por horário
        const availableSlots = [];

        // Gerar slots das 08:00 às 18:00 (intervalo de 30 min)
        for (let h = 8; h <= 18; h++) {
            for (let m of [0, 30]) {
                // Ignora 18:30
                if (h === 18 && m === 30) continue;

                const hour = String(h).padStart(2, "0");
                const minute = String(m).padStart(2, "0");
                const timeString = `${hour}:${minute}`;

                const apptsAtTime = dayAppts.filter((a) => a.time === timeString);

                if (apptsAtTime.length < MAX_PER_HOUR) {
                    availableSlots.push(timeString);
                }
            }
        }

        res.json({
            name: petshopUser.name,
            phone: petshopUser.phone,
            date,
            availableSlots
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erro ao carregar agenda." });
    }
};
