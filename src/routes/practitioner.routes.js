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

router.patch(
  "/onboarding",
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

module.exports = router;