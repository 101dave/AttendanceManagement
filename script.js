'use strict';

const $ = (selector, root = document) => root.querySelector(selector);

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem('attendanceSession') || 'null');
  } catch {
    return null;
  }
}

function setMessage(element, text, isError = false) {
  if (!element) return;
  element.textContent = text;
  element.style.color = isError ? '#c62828' : '';
}

async function api(url, options = {}) {
  const session = getSession();
  const headers = { ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

function cell(value) {
  const td = document.createElement('td');
  td.textContent = value == null ? '' : String(value);
  return td;
}

function appendRow(tbody, values) {
  const row = document.createElement('tr');
  values.forEach((value) => row.appendChild(cell(value)));
  tbody.appendChild(row);
}

function attendancePercent(records) {
  const counted = records.filter((row) => ['present', 'late', 'absent'].includes(row.status));
  if (!counted.length) return null;
  const attended = counted.filter((row) => ['present', 'late'].includes(row.status)).length;
  return Math.round((attended / counted.length) * 100);
}

async function loadStudent(session) {
  const [attendance, scores] = await Promise.all([
    api(`/api/attendance/${encodeURIComponent(session.user.id)}`),
    api(`/api/scores/${encodeURIComponent(session.user.id)}`)
  ]);

  $('[data-user-name]').textContent = session.user.fullName;
  $('[data-attendance-body]').replaceChildren();
  $('[data-scores-body]').replaceChildren();

  attendance.forEach((row) => appendRow($('[data-attendance-body]'), [
    row.attendance_date, row.subject, row.activity, row.status
  ]));
  scores.forEach((row) => appendRow($('[data-scores-body]'), [
    row.subject, row.activity, `${row.score} / ${row.max_score}`
  ]));

  const percent = attendancePercent(attendance);
  $('[data-attendance-percent]').textContent = percent === null ? 'No records' : `${percent}%`;
  // Example passing threshold; change to your institution's policy.
  $('[data-pass-status]').textContent = percent === null ? 'Not available' : percent >= 75 ? 'Pass' : 'Fail';
}

function csvEscape(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename, rows, columns) {
  const lines = [
    columns.map((column) => csvEscape(column.label)).join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(column.get(row))).join(','))
  ];
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function loadTeacherReport() {
  const [attendance, scores] = await Promise.all([
    api('/api/attendance/report'),
    api('/api/scores/report')
  ]);

  const tbody = $('[data-report-body]');
  tbody.replaceChildren();

  attendance.forEach((row) => appendRow(tbody, [
    row.student?.full_name, row.student?.section, row.subject, row.activity,
    row.status, row.attendance_date
  ]));

  scores.forEach((row) => appendRow(tbody, [
    row.student?.full_name, row.student?.section, row.subject, row.activity,
    `${row.score} / ${row.max_score}`, row.updated_at
  ]));

  $('[data-export="attendance"]').onclick = () => downloadCsv('attendance.csv', attendance, [
    { label: 'Student', get: (r) => r.student?.full_name },
    { label: 'Username', get: (r) => r.student?.username },
    { label: 'Section', get: (r) => r.student?.section },
    { label: 'Subject', get: (r) => r.subject },
    { label: 'Activity', get: (r) => r.activity },
    { label: 'Date', get: (r) => r.attendance_date },
    { label: 'Status', get: (r) => r.status }
  ]);

  $('[data-export="scores"]').onclick = () => downloadCsv('scores.csv', scores, [
    { label: 'Student', get: (r) => r.student?.full_name },
    { label: 'Username', get: (r) => r.student?.username },
    { label: 'Section', get: (r) => r.student?.section },
    { label: 'Subject', get: (r) => r.subject },
    { label: 'Activity', get: (r) => r.activity },
    { label: 'Score', get: (r) => r.score },
    { label: 'Maximum score', get: (r) => r.max_score }
  ]);
}

function showDashboard(session) {
  $('.login-panel')?.classList.add('hidden');
  $('[data-dashboard]')?.classList.remove('hidden');
  $('[data-logout]')?.classList.remove('hidden');
  if (document.body.dataset.page === 'student') {
    loadStudent(session).catch((error) => setMessage($('.message'), error.message, true));
  } else {
    loadTeacherReport().catch((error) => setMessage($('[data-teacher-message]'), error.message, true));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  root.dataset.theme = localStorage.getItem('attendanceTheme') || 'light';

  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('attendanceTheme', root.dataset.theme);
    });
  });

  document.querySelectorAll('[data-logout]').forEach((button) => {
    button.addEventListener('click', () => {
      sessionStorage.removeItem('attendanceSession');
      location.reload();
    });
  });

  const form = $('[data-login-form]');
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = $('.message', form);
      const formData = new FormData(form);

      try {
        const result = await api('/api/login', {
          method: 'POST',
          body: JSON.stringify({
            username: formData.get('username'),
            password: formData.get('password'),
            role: form.dataset.role
          })
        });
        sessionStorage.setItem('attendanceSession', JSON.stringify(result));
        showDashboard(result);
      } catch (error) {
        setMessage(message, error.message, true);
      }
    });
  }

  const existing = getSession();
  const page = document.body.dataset.page;
  if (existing && page && existing.user.role === page) showDashboard(existing);
  else if (existing && page && existing.user.role !== page) sessionStorage.removeItem('attendanceSession');

  const searchForm = $('[data-search-form]');
  searchForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = new FormData(searchForm);
    const params = new URLSearchParams({
      q: String(values.get('q') || ''),
      section: String(values.get('section') || '')
    });

    try {
      const students = await api(`/api/attendance/students?${params}`);
      const select = $('[data-student-select]');
      select.replaceChildren(new Option('Select a student', ''));
      students.forEach((student) => {
        select.add(new Option(`${student.full_name} (${student.section || 'No section'})`, student.id));
      });
    } catch (error) {
      setMessage($('[data-teacher-message]'), error.message, true);
    }
  });

  const attendanceForm = $('[data-attendance-form]');
  attendanceForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(attendanceForm));
    values.studentId = $('[data-student-select]').value;
    try {
      await api('/api/attendance/mark', { method: 'POST', body: JSON.stringify(values) });
      setMessage($('[data-teacher-message]'), 'Attendance saved.');
      await loadTeacherReport();
    } catch (error) {
      setMessage($('[data-teacher-message]'), error.message, true);
    }
  });

  const scoreForm = $('[data-score-form]');
  scoreForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(scoreForm));
    values.studentId = $('[data-student-select]').value;
    values.score = Number(values.score);
    values.maxScore = Number(values.maxScore);
    try {
      await api('/api/scores/update', { method: 'POST', body: JSON.stringify(values) });
      setMessage($('[data-teacher-message]'), 'Score saved.');
      await loadTeacherReport();
    } catch (error) {
      setMessage($('[data-teacher-message]'), error.message, true);
    }
  });
});
