const express = require("express");
const { protect, authorize } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/multer");
const controller = require("../controllers/practitioner.controller");

const router = express.Router();

/* =====================================================
   PRACTITIONER ROUTES
===================================================== */

router.use(protect);
router.use(authorize("practitioner"));


// The route MUST have 'protect' to populate req.user
router.patch(
  "/onboarding",
  protect, // <--- Add this if it was missing!
  upload.single("license"),
  controller.onboardPractitioner
);
router.get("/dashboard", controller.getPractitionerDashboard);

router
  .route("/me")
  .get(controller.getPractitionerData)
  .put(controller.updatePractitionerProfile);

router.post("/availability", controller.updateAvailability);
router.post("/diagnoses", controller.submitDiagnosis);
router.post("/prescriptions", controller.issuePrescription);

router.post('/confirm-service', controller.confirmServiceDone);

module.exports = router;