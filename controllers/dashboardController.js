const Appointment = require("../models/Appointment");
const { startOfDay, addDays, format, isSameDay } = require("date-fns");
const getOwnerId = require("../utils/getOwnerId");

exports.getStats = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const today = startOfDay(new Date());

    const allAppointments = await Appointment.find({ user: ownerId })
      .populate("baseService")
      .populate("extraServices");

    const totalRevenue = allAppointments.reduce((sum, a) => {
      const extrasPrice =
        a.extraServices?.reduce((acc, e) => acc + (e.price || 0), 0) || 0;
      return sum + (a.baseService?.price || 0) + extrasPrice;
    }, 0);

    const statusMap = {};
    allAppointments.forEach((a) => {
      const status = a.status || "Desconhecido";
      statusMap[status] = (statusMap[status] || 0) + 1;
    });
    const statusCounts = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
    }));

    const serviceMap = {};
    allAppointments.forEach((a) => {
      const name = a.baseService?.name || "Desconhecido";
      serviceMap[name] = (serviceMap[name] || 0) + 1;
    });
    const services = Object.entries(serviceMap).map(([service, count]) => ({
      service,
      count,
    }));

    const byHourMap = {};
    allAppointments.forEach((a) => {
      const hour = a.time?.slice(0, 5) || "Desconhecido";
      byHourMap[hour] = (byHourMap[hour] || 0) + 1;
    });
    const byHour = Object.entries(byHourMap).map(([hour, count]) => ({
      hour,
      count,
    }));
    const peakHourData = byHour.reduce(
      (prev, curr) => (curr.count > prev.count ? curr : prev),
      { hour: null, count: 0 }
    );
    const peakHour = peakHourData.hour;

    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(today, i - 6);
      const count = allAppointments.filter((a) =>
        isSameDay(new Date(a.date), date)
      ).length;
      return { date: format(date, "dd/MM"), count };
    });

    res.json({
      totalRevenue,
      totalAppointments: allAppointments.length,
      peakHour,
      statusCounts,
      services,
      last7Days,
      allAppointments, 
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Erro ao gerar estatísticas do dashboard" });
  }
};
