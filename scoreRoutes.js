'use strict';

const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const controller = require('../controllers/scoreController');

const router = express.Router();

router.get('/report', authenticate, requireRole('teacher'), controller.report);
router.get('/:studentId', authenticate, controller.getStudentScores);
router.post('/update', authenticate, requireRole('teacher'), controller.updateScore);

module.exports = router;
