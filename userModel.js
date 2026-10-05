'use strict';

const { createClient } = require('@supabase/supabase-js');

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function findByUsername(username) {
  const { data, error } = await db
    .from('users')
    .select('id, username, full_name, role, section, password_hash')
    .eq('username', username)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findStudent(id) {
  const { data, error } = await db
    .from('users')
    .select('id, username, full_name, section')
    .eq('id', id)
    .eq('role', 'student')
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function searchStudents({ query, section }) {
  let request = db
    .from('users')
    .select('id, username, full_name, section')
    .eq('role', 'student')
    .order('full_name')
    .limit(200);

  if (section) request = request.eq('section', section);
  if (query) request = request.ilike('full_name', `%${query}%`);

  const { data, error } = await request;
  if (error) throw error;
  return data;
}

module.exports = { db, findByUsername, findStudent, searchStudents };
