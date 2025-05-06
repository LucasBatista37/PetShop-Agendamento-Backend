const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const appointmentMiddleware = require('../middlewares/appointmentMiddleware');
const {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment
} = require('../controllers/appointmentController');

// All routes protected
router.use(authMiddleware);

router.post('/', createAppointment);
router.get('/', getAllAppointments);
router.get('/:id', appointmentMiddleware, getAppointmentById);
router.put('/:id', appointmentMiddleware, updateAppointment);
router.delete('/:id', appointmentMiddleware, deleteAppointment);

module.exports = router;