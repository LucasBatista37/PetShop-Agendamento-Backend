const Appointment = require("../models/Appointment");
const {
  startOfDay,
  isSameDay,
  addDays,
  format,
  parseISO,
} = require("date-fns");

exports.getStats = async (req, res) => {
  try {
    const userId = req.userId;
    const all = await Appointment.find({ user: userId }).populate(
      "baseService"
    );

    const today = startOfDay(new Date());

    const todayAppointments = all.filter((a) =>
      isSameDay(new Date(a.date), today)
    );

    const weekly = Array.from({ length: 7 }).map((_, i) => {
      const target = addDays(today, i);
      const count = all.filter((a) =>
        isSameDay(new Date(a.date), target)
      ).length;
      return {
        day: format(target, "EEE"),
        count,
      };
    });

    const statusMap = {};
    all.forEach((a) => {
      const status = a.status || "Desconhecido";
      statusMap[status] = (statusMap[status] || 0) + 1;
    });
    const statusCounts = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
    }));

    const byHourMap = {};
    all.forEach((a) => {
      const hour = a.time?.slice(0, 5) || "Desconhecido";
      byHourMap[hour] = (byHourMap[hour] || 0) + 1;
    });
    const byHour = Object.entries(byHourMap)
      .sort()
      .map(([hour, count]) => ({ hour, count }));

    const serviceMap = {};
    all.forEach((a) => {
      const name = a.baseService?.name || "Desconhecido";
      serviceMap[name] = (serviceMap[name] || 0) + 1;
    });
    const services = Object.entries(serviceMap).map(([service, count]) => ({
      service,
      count,
    }));

    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(today, i - 6);
      const count = all.filter((a) => isSameDay(new Date(a.date), date)).length;
      return {
        date: format(date, "dd/MM"),
        count,
      };
    });

    res.json({
      allAppointments: all,
      weekly,
      byHour,
      services,
      last7Days,
      statusCounts,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Erro ao gerar estatísticas do dashboard" });
  }
};
