'use strict';

const { z } = require('zod');
const { findStudent, searchStudents } = require('../models/userModel');
const attendance = require('../models/attendanceModel');

const markSchema = z.object({
  studentId: z.string().uuid(),
  subject: z.string().trim().min(1).max(100),
  activity: z.string().trim().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['present', 'absent', 'late', 'excused'])
});

async function getStudentAttendance(req, res, next) {
  try {
    const studentId = req.params.studentId;
    if (req.user.role === 'student' && req.user.sub !== studentId) {
      return res.status(403).json({ error: 'You can only view your own records.' });
    }
    res.json(await attendance.listForStudent(studentId));
  } catch (err) {
    next(err);
  }
}

async function markAttendance(req, res, next) {
  try {
    const parsed = markSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid attendance data.' });

    const student = await findStudent(parsed.data.studentId);
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const record = await attendance.upsert({
      student_id: parsed.data.studentId,
      subject: parsed.data.subject,
      activity: parsed.data.activity,
      attendance_date: parsed.data.date,
      status: parsed.data.status,
      marked_by: req.user.sub
    });

    res.status(200).json(record);
  } catch (err) {
    next(err);
  }
}

async function search(req, res, next) {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
    const section = typeof req.query.section === 'string' ? req.query.section.trim().slice(0, 80) : '';
    res.json(await searchStudents({ query, section }));
  } catch (err) {
    next(err);
  }
}

async function report(req, res, next) {
  try {
    const subject = typeof req.query.subject === 'string' ? req.query.subject.trim().slice(0, 100) : '';
    const section = typeof req.query.section === 'string' ? req.query.section.trim().slice(0, 80) : '';
    res.json(await attendance.listAll({ subject, section }));
  } catch (err) {
    next(err);
  }
}

module.exports = { getStudentAttendance, markAttendance, search, report };
