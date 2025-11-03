// public/js/main.js

document.addEventListener('DOMContentLoaded', function () {
  /*** ACCOUNT SILHOUETTE LINK HANDLER ***/
  const accountLink = document.getElementById('account-link');
  if (accountLink) {
    // Check if the user is logged in (simple localStorage token check)
    const userToken = localStorage.getItem('token');

    if (userToken) {
      // If logged in, redirect icon to dashboard
      accountLink.setAttribute('href', '/dashboard.html');
      accountLink.title = 'Go to your account';
    } else {
      // If not logged in, link to login page
      accountLink.setAttribute('href', '/login.html');
      accountLink.title = 'Login or Sign Up';
    }
  }

  /*** START CAMPAIGN BUTTON HANDLER ***/
  const startBtn = document.getElementById('startCampaign');
  if (startBtn) {
    startBtn.addEventListener('click', function (e) {
      e.preventDefault(); // optional: stops default navigation
      console.log('Start a Campaign clicked');

      // Redirect user
      const target = startBtn.getAttribute('href') || 'create.html';
      window.location.href = target;
    });
  }
});

/* public/javascript/main.js
   Runs on pages to detect JWT in localStorage and update account silhouette behavior
*/
(function () {
  'use strict';

  function setLoggedInUI(user) {
    // Update all account links to point to dashboard
    const accountLinks = document.querySelectorAll('.account-link');
    accountLinks.forEach((a) => {
      a.setAttribute('href', '/dashboard.html');
      a.setAttribute('title', 'Account — View dashboard');
      a.classList.add('logged-in');
    });

    // Optionally show user email somewhere if a container exists
    const acctEl = document.querySelector('.account-email');
    if (acctEl && user && user.email) acctEl.textContent = user.email;
  }

  function setLoggedOutUI() {
    const accountLinks = document.querySelectorAll('.account-link');
    accountLinks.forEach((a) => {
      a.setAttribute('href', '/login.html');
      a.setAttribute('title', 'Sign in');
      a.classList.remove('logged-in');
    });
  }

  async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoggedOutUI();
      return;
    }

    // Try validating token by calling /api/auth/me
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });
      if (res.ok) {
        const body = await res.json();
        setLoggedInUI(body);
      } else {
        // token invalid or expired
        localStorage.removeItem('token');
        setLoggedOutUI();
      }
    } catch (err) {
      // network error — keep token but fallback to logged-out UI
      console.error('Auth check failed:', err);
      setLoggedOutUI();
    }
  }

  document.addEventListener('DOMContentLoaded', checkAuth);
})();

