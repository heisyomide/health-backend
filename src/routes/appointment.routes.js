const express = require('express');
const router = express.Router();
const { 
    getMyAppointments, 
    getAppointment, 
    rescheduleAppointment, 
    cancelAppointment,
    bookAppointment,
      getPractitionerAppointments,
  completeAppointment
} = require('../controllers/appointment.controller');
const { protect, authorize } = require('../middlewares/auth.middleware'); // Your auth middleware

router.use(protect); // Protect all routes

router.route('/')
    .get(getMyAppointments)
    .post(bookAppointment);

router.route('/:id')
    .get(getAppointment);

router.patch('/:id/reschedule', rescheduleAppointment);
router.patch('/:id/cancel', cancelAppointment);

// Ensure only practitioners can access these specific views
router.get("/", authorize("practitioner"), getPractitionerAppointments);
router.patch("/:id/complete", authorize("practitioner"), completeAppointment);


module.exports = router;