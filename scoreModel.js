'use strict';

const { db } = require('./userModel');

async function listForStudent(studentId) {
  const { data, error } = await db
    .from('scores')
    .select('id, subject, activity, score, max_score, updated_at')
    .eq('student_id', studentId)
    .order('updated_at', { ascending: false })
    .limit(1000);

  if (error) throw error;
  return data;
}

async function upsert(record) {
  const { data, error } = await db
    .from('scores')
    .upsert(record, { onConflict: 'student_id,subject,activity' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function listAll({ subject }) {
  let request = db
    .from('scores')
    .select(`
      id, subject, activity, score, max_score, updated_at,
      student:users!scores_student_id_fkey(id, full_name, username, section)
    `)
    .order('updated_at', { ascending: false })
    .limit(2000);

  if (subject) request = request.eq('subject', subject);

  const { data, error } = await request;
  if (error) throw error;
  return data;
}

module.exports = { listForStudent, upsert, listAll };
