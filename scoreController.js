'use strict';

const { z } = require('zod');
const { findStudent } = require('../models/userModel');
const scores = require('../models/scoreModel');

const scoreSchema = z.object({
  studentId: z.string().uuid(),
  subject: z.string().trim().min(1).max(100),
  activity: z.string().trim().min(1).max(100),
  score: z.number().min(0).max(100000),
  maxScore: z.number().positive().max(100000)
}).refine((value) => value.score <= value.maxScore, {
  message: 'Score cannot exceed the maximum score.'
});

async function getStudentScores(req, res, next) {
  try {
    const studentId = req.params.studentId;
    if (req.user.role === 'student' && req.user.sub !== studentId) {
      return res.status(403).json({ error: 'You can only view your own records.' });
    }
    res.json(await scores.listForStudent(studentId));
  } catch (err) {
    next(err);
  }
}

async function updateScore(req, res, next) {
  try {
    const parsed = scoreSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid score data.' });

    const student = await findStudent(parsed.data.studentId);
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const record = await scores.upsert({
      student_id: parsed.data.studentId,
      subject: parsed.data.subject,
      activity: parsed.data.activity,
      score: parsed.data.score,
      max_score: parsed.data.maxScore,
      updated_by: req.user.sub,
      updated_at: new Date().toISOString()
    });

    res.status(200).json(record);
  } catch (err) {
    next(err);
  }
}

async function report(req, res, next) {
  try {
    const subject = typeof req.query.subject === 'string' ? req.query.subject.trim().slice(0, 100) : '';
    res.json(await scores.listAll({ subject }));
  } catch (err) {
    next(err);
  }
}

module.exports = { getStudentScores, updateScore, report };
