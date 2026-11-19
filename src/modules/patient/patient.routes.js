const express = require('express')
const router = express.Router()
const controller = require('./patient.controller')
const authenticate = require('../../middlewares/auth.middleware')
const authorize = require('../../middlewares/role.middleware')

// Require authentication across all patient module endpoints
router.use(authenticate)

// Role authorization policies:
// - patientAuth: Patient operations (and SUPER_ADMIN oversight)
// - clinicalAuth: Strictly authorized clinical management roles (PRACTITIONER, CLINIC_ADMIN, SUPER_ADMIN)
const patientAuth = authorize('PATIENT', 'SUPER_ADMIN')
const clinicalAuth = authorize('SUPER_ADMIN', 'CLINIC_ADMIN', 'PRACTITIONER')

router.get('/profile', controller.getPatientProfile)
router.put('/profile', patientAuth, controller.updatePatientProfile)
router.get('/appointments', controller.getPatientAppointments)
router.post('/appointments', patientAuth, controller.createAppointment)
router.put('/appointments/:id/reschedule', patientAuth, controller.rescheduleAppointment)
router.put('/appointments/:id/cancel', patientAuth, controller.cancelAppointment)
router.get('/practitioners', controller.getPractitioners)
router.get('/care-team', controller.getCareTeam)
router.get('/clinic-users', controller.getPatientClinicUsers)
router.get('/messages', controller.getCareTeamMessages)
router.post('/messages', patientAuth, controller.sendCareTeamMessage)
router.get('/invoices', controller.getPatientInvoices)

// Treatment Plans & Clinical Goals (Only authorized clinical roles can create, edit, or delete)
router.get('/treatment-plans', controller.getTreatmentPlans)
router.post('/treatment-plans', clinicalAuth, controller.createTreatmentPlan)
router.put('/treatment-plans/:id', clinicalAuth, controller.updateTreatmentPlan)
router.delete('/treatment-plans/:id', clinicalAuth, controller.deleteTreatmentPlan)

// Prescribed Exercises
router.get('/exercises', controller.getPrescribedExercises)
router.post('/exercises', clinicalAuth, controller.createPrescribedExercise)
router.put('/exercises/:id/toggle', patientAuth, controller.togglePrescribedExercise)
router.delete('/exercises/:id', clinicalAuth, controller.deletePrescribedExercise)

// Visual Progress & Clinical Outcomes
router.get('/progress-outcomes', controller.getProgressOutcomes)
router.post('/outcome-measures', clinicalAuth, controller.createOutcomeMeasure)
router.put('/outcome-measures/:id', clinicalAuth, controller.updateOutcomeMeasure)
router.delete('/outcome-measures/:id', clinicalAuth, controller.deleteOutcomeMeasure)
router.post('/progress-trends', clinicalAuth, controller.createProgressTrend)
router.put('/progress-trends/:id', clinicalAuth, controller.updateProgressTrend)
router.delete('/progress-trends/:id', clinicalAuth, controller.deleteProgressTrend)

// Forms & Documents Center
router.get('/forms-documents', controller.getFormsAndDocuments)
router.post('/forms/:id/submit', patientAuth, controller.submitPatientForm)
router.post('/documents', patientAuth, controller.uploadPatientDocument)
router.delete('/documents/:id', patientAuth, controller.deletePatientDocument)
router.get('/documents/:id/download', controller.downloadPatientDocument)

// Funding, NDIS & Claims Accounts
router.get('/funding-claims', controller.getFundingAndClaims)
router.post('/claims', patientAuth, controller.createPatientClaim)
router.put('/claims/:id', patientAuth, controller.updatePatientClaim)
router.delete('/claims/:id', patientAuth, controller.deletePatientClaim)
router.post('/funding-accounts', patientAuth, controller.createFundingAccount)
router.put('/funding-accounts/:id', patientAuth, controller.updateFundingAccount)

// Health Record Sharing
router.get('/health-sharing', controller.getHealthShares)
router.post('/health-sharing/grant', patientAuth, controller.grantHealthShare)
router.put('/health-sharing/:id/approve', patientAuth, controller.approveHealthShareRequest)
router.put('/health-sharing/:id/deny', patientAuth, controller.denyHealthShareRequest)
router.delete('/health-sharing/:id/revoke', patientAuth, controller.revokeHealthShare)

// Patient Invoices
router.get('/invoices', controller.getPatientInvoices)
router.post('/invoices/:id/pay', patientAuth, controller.payPatientInvoice)
router.post('/invoices', patientAuth, controller.createPatientInvoice)
router.delete('/invoices/:id', patientAuth, controller.deletePatientInvoice)

// Preferences & Security Settings
router.get('/preferences', controller.getPatientPreferences)
router.put('/preferences', patientAuth, controller.updatePatientPreferences)
router.get('/security/devices', controller.getTrustedDevices)
router.delete('/security/devices/:key', patientAuth, controller.revokeTrustedDevice)
router.get('/family-profiles', controller.getFamilyProfiles)
router.get('/achievements', controller.getPatientAchievements)
router.put('/achievements', patientAuth, controller.updatePatientAchievements)
router.post('/ai-assistant', patientAuth, controller.askAiRecoveryAssistant)

module.exports = router
