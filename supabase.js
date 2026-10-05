 import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

  const supabase = createClient('https://aqrikftxotdtmbjgcdre.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcmlrZnR4b3RkdG1iamdjZHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODY2ODgsImV4cCI6MjEwNjc2MjY4OH0.tufhB1AGfWRkBhyitX4OLWMSvCdOCQIaD2SrUhtHW_M')

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert('Login failed: ' + error.message)
    } else {
      alert('Login successful!')
      window.location.href = 'studentDashboard.html'
    }

  const { data, error } = await supabase.auth.signInWithPassword({
  email: emailInput,
  password: passwordInput
})

})
