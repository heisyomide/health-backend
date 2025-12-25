const express = require('express');
const router = express.Router();
const { 
    getMyAppointments, 
    getAppointment, 
    rescheduleAppointment, 
    cancelAppointment,
    bookAppointment 
} = require('../controllers/appointment.controller');
const { protect } = require('../middleware/auth'); // Your auth middleware

router.use(protect); // Protect all routes

router.route('/')
    .get(getMyAppointments)
    .post(bookAppointment);

router.route('/:id')
    .get(getAppointment);

router.patch('/:id/reschedule', rescheduleAppointment);
router.patch('/:id/cancel', cancelAppointment);

module.exports = router;