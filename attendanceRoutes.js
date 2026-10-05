'use strict';

const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const controller = require('../controllers/attendanceController');

const router = express.Router();

router.get('/students', authenticate, requireRole('teacher'), controller.search);
router.get('/report', authenticate, requireRole('teacher'), controller.report);
router.get('/:studentId', authenticate, controller.getStudentAttendance);
router.post('/mark', authenticate, requireRole('teacher'), controller.markAttendance);

module.exports = router;
