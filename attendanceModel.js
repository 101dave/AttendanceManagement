'use strict';

const { db } = require('./userModel');

async function listForStudent(studentId) {
  const { data, error } = await db
    .from('attendance')
    .select('id, student_id, subject, activity, attendance_date, status')
    .eq('student_id', studentId)
    .order('attendance_date', { ascending: false })
    .limit(1000);

  if (error) throw error;
  return data;
}

async function upsert(record) {
  const { data, error } = await db
    .from('attendance')
    .upsert(record, { onConflict: 'student_id,subject,activity,attendance_date' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function listAll({ subject, section }) {
  let request = db
    .from('attendance')
    .select(`
      id, subject, activity, attendance_date, status,
      student:users!attendance_student_id_fkey(id, full_name, username, section)
    `)
    .order('attendance_date', { ascending: false })
    .limit(2000);

  if (subject) request = request.eq('subject', subject);
  if (section) request = request.eq('student.section', section);

  const { data, error } = await request;
  if (error) throw error;
  return data;
}

module.exports = { listForStudent, upsert, listAll };
