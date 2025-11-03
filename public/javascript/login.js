/* public/javascript/login.js
   Handles login form submission for /login.html
*/
(function () {
  'use strict';

  const form = document.getElementById('loginForm');
  const msg = document.getElementById('message');
  const submitBtn = document.getElementById('submitBtn');

  function setMessage(text, cls) {
    msg.textContent = text;
    msg.className = cls || '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('', '');
    submitBtn.disabled = true;

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const body = await res.json();
        if (body && body.token) {
          localStorage.setItem('token', body.token);
          setMessage('Signed in successfully. Redirecting…', 'success');
          // Give main.js a moment to pick up the token, then go to dashboard
          setTimeout(() => (window.location.href = '/dashboard.html'), 700);
          return;
        }
        setMessage('Login succeeded but no token returned.', 'error');
        return;
      }

      if (res.status === 403) {
        setMessage('Email not verified. Check server logs or your inbox for the verification link.', 'error');
      } else {
        const body = await res.json().catch(() => ({}));
        setMessage(body.message || 'Invalid credentials', 'error');
      }
    } catch (err) {
      console.error('Login error:', err);
      setMessage('Network error. Check console for details.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  }

  if (form) form.addEventListener('submit', handleSubmit);
})();
