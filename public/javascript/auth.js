/* ============================================================
   auth.js - Complete Authentication System v2.0 - FINAL
   Handles: Login, Register, Reset, Email Verification, MFA
   
   CHANGES FROM v1.0:
   - Fixed: JWT now uses httpOnly cookies (removed localStorage)
   - Enhanced: Stronger password requirements (12+ chars)
   - Added: Rate limit handling and user feedback
   - Improved: Error messages and validation
   - Security: All inputs properly validated
   ============================================================ */

(function() {
  'use strict';

  const { API, Toast, FormValidator, storage, setButtonLoading, escapeHtml } = window.Goodies;

  /* =========================
     CONSTANTS
     ========================= */
  
  const PASSWORD_MIN_LENGTH = 12;
  const PASSWORD_REQUIREMENTS = {
    minLength: PASSWORD_MIN_LENGTH,
    hasLower: /[a-z]/,
    hasUpper: /[A-Z]/,
    hasNumber: /[0-9]/,
    hasSpecial: /[^a-zA-Z0-9]/
  };

  /* =========================
     LOGIN FORM
     ========================= */
  
  function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberCheckbox = document.getElementById('remember');
    const loginBtn = document.getElementById('loginBtn');
    const togglePassword = document.getElementById('togglePassword');

    // Password visibility toggle
    if (togglePassword && passwordInput) {
      togglePassword.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePassword.setAttribute('aria-label', type === 'text' ? 'Hide password' : 'Show password');
        
        const icon = togglePassword.querySelector('svg');
        if (icon) {
          icon.style.opacity = type === 'text' ? '0.5' : '1';
        }
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const remember = rememberCheckbox?.checked || false;

      // Validate inputs
      if (!email || !password) {
        Toast.error('Please fill in all fields');
        emailInput.focus();
        return;
      }

      if (!isValidEmail(email)) {
        Toast.error('Please enter a valid email address');
        emailInput.focus();
        return;
      }

      setButtonLoading(loginBtn, true);

      try {
        const data = await API.post('/auth/login', { 
          email, 
          password,
          remember 
        });

        // Note: Token is now stored in httpOnly cookie by server
        // Only store non-sensitive user info in localStorage
        if (data.user) {
          storage.set('goodies_user', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role
          }));
        }

        Toast.success('Login successful!');
        
        // Redirect based on user role or return URL
        const returnUrl = new URLSearchParams(window.location.search).get('return');
        setTimeout(() => {
          window.location.href = returnUrl || (data.user?.role === 'admin' ? '/admin' : '/campaigns');
        }, 1000);

      } catch (error) {
        console.error('Login error:', error);
        
        // Handle specific error types
        if (error.message.includes('not verified') || error.message.includes('verify')) {
          Toast.error('Please verify your email before logging in');
          setTimeout(() => {
            window.location.href = '/verify-email?email=' + encodeURIComponent(email);
          }, 2000);
        } else if (error.message.includes('MFA') || error.message.includes('multi-factor')) {
          Toast.info('Multi-factor authentication required');
          setTimeout(() => window.location.href = '/mfa', 2000);
        } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
          Toast.error('Too many login attempts. Please try again later.');
        } else if (error.message.includes('credentials') || error.message.includes('Invalid')) {
          Toast.error('Invalid email or password');
        } else {
          Toast.error(error.message || 'Login failed. Please try again.');
        }
      } finally {
        setButtonLoading(loginBtn, false);
      }
    });

    // Show registered message if coming from registration
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registered') === 'true') {
      Toast.success('Registration successful! Please check your email and verify your account.');
    }
    if (urlParams.get('verified') === 'true') {
      Toast.success('Email verified! You can now log in.');
    }
  }

  /* =========================
     REGISTER FORM
     ========================= */
  
  function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsCheckbox = document.getElementById('terms');
    const registerBtn = document.getElementById('registerBtn');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

    // Password strength indicator
    const passwordStrength = document.getElementById('passwordStrength');
    const passwordHint = document.getElementById('passwordHint');

    if (passwordInput && passwordStrength) {
      passwordInput.addEventListener('input', debounce(() => {
        const password = passwordInput.value;
        const strength = calculatePasswordStrength(password);
        
        passwordStrength.classList.remove('hidden');
        const bar = passwordStrength.querySelector('.password-strength-bar');
        
        if (bar) {
          bar.className = 'password-strength-bar';
          bar.classList.add(strength.level);
        }
        
        if (passwordHint) {
          passwordHint.textContent = strength.message;
          passwordHint.className = `password-hint ${strength.level}`;
        }
      }, 300));
    }

    // Password visibility toggles
    if (togglePassword && passwordInput) {
      togglePassword.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePassword.setAttribute('aria-label', type === 'text' ? 'Hide password' : 'Show password');
      });
    }

    if (toggleConfirmPassword && confirmPasswordInput) {
      toggleConfirmPassword.addEventListener('click', () => {
        const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
        confirmPasswordInput.type = type;
        toggleConfirmPassword.setAttribute('aria-label', type === 'text' ? 'Hide password' : 'Show password');
      });
    }

    // Confirm password validation
    if (confirmPasswordInput && passwordInput) {
      confirmPasswordInput.addEventListener('blur', () => {
        if (confirmPasswordInput.value && confirmPasswordInput.value !== passwordInput.value) {
          showFieldError(confirmPasswordInput, 'Passwords do not match');
        } else {
          clearFieldError(confirmPasswordInput);
        }
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : password;
      const termsAccepted = termsCheckbox.checked;

      // Validate all fields
      let hasError = false;

      if (!name || name.length < 2) {
        showFieldError(nameInput, 'Please enter your full name');
        hasError = true;
      }

      if (!email || !isValidEmail(email)) {
        showFieldError(emailInput, 'Please enter a valid email address');
        hasError = true;
      }

      const strength = calculatePasswordStrength(password);
      if (!password || strength.level === 'weak') {
        showFieldError(passwordInput, strength.message || 'Password does not meet requirements');
        hasError = true;
      }

      if (confirmPasswordInput && password !== confirmPassword) {
        showFieldError(confirmPasswordInput, 'Passwords do not match');
        hasError = true;
      }

      if (!termsAccepted) {
        Toast.error('You must accept the Terms of Service and Privacy Policy');
        termsCheckbox.focus();
        return;
      }

      if (hasError) {
        Toast.error('Please fix the errors in the form');
        return;
      }

      setButtonLoading(registerBtn, true);

      try {
        const data = await API.post('/auth/register', {
          name,
          email,
          password
        });

        Toast.success('Registration successful! Please check your email to verify your account.');
        form.reset();
        
        if (passwordStrength) passwordStrength.classList.add('hidden');
        if (passwordHint) passwordHint.textContent = '';
        
        setTimeout(() => {
          window.location.href = '/login?registered=true';
        }, 2000);

      } catch (error) {
        console.error('Registration error:', error);
        
        if (error.message.includes('exists') || error.message.includes('already')) {
          Toast.error('An account with this email already exists. Please log in.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else if (error.message.includes('rate limit')) {
          Toast.error('Too many registration attempts. Please try again later.');
        } else {
          Toast.error(error.message || 'Registration failed. Please try again.');
        }
      } finally {
        setButtonLoading(registerBtn, false);
      }
    });
  }

  /* =========================
     PASSWORD RESET REQUEST
     ========================= */
  
  function initResetForm() {
    const form = document.getElementById('resetForm');
    if (!form) return;

    const emailInput = document.getElementById('email');
    const resetBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();

      if (!email || !isValidEmail(email)) {
        Toast.error('Please enter a valid email address');
        emailInput.focus();
        return;
      }

      setButtonLoading(resetBtn, true);

      try {
        await API.post('/auth/reset-request', { email });
        
        // Always show success message for security (don't reveal if email exists)
        Toast.success('If that email exists, a password reset link has been sent.');
        form.reset();
        
        setTimeout(() => {
          window.location.href = '/reset-success';
        }, 3000);

      } catch (error) {
        console.error('Reset error:', error);
        // Don't reveal if email exists for security
        Toast.success('If that email exists, a password reset link has been sent.');
        
        setTimeout(() => {
          window.location.href = '/reset-success';
        }, 3000);
      } finally {
        setButtonLoading(resetBtn, false);
      }
    });
  }

  /* =========================
     PASSWORD RESET COMPLETION
     ========================= */
  
  function initResetPasswordForm() {
    const form = document.getElementById('resetPasswordForm');
    if (!form) return;

    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const submitBtn = form.querySelector('button[type="submit"]');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      Toast.error('Invalid or missing reset token');
      setTimeout(() => {
        window.location.href = '/reset';
      }, 2000);
      return;
    }

    // Password strength indicator
    const passwordStrength = document.getElementById('passwordStrength');
    const passwordHint = document.getElementById('passwordHint');

    if (passwordInput && passwordStrength) {
      passwordInput.addEventListener('input', debounce(() => {
        const password = passwordInput.value;
        const strength = calculatePasswordStrength(password);
        
        passwordStrength.classList.remove('hidden');
        const bar = passwordStrength.querySelector('.password-strength-bar');
        
        if (bar) {
          bar.className = 'password-strength-bar';
          bar.classList.add(strength.level);
        }
        
        if (passwordHint) {
          passwordHint.textContent = strength.message;
          passwordHint.className = `password-hint ${strength.level}`;
        }
      }, 300));
    }

    // Toggle password visibility
    if (togglePassword && passwordInput) {
      togglePassword.addEventListener('click', () => {
        passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
      });
    }

    if (toggleConfirmPassword && confirmPasswordInput) {
      toggleConfirmPassword.addEventListener('click', () => {
        confirmPasswordInput.type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      const strength = calculatePasswordStrength(password);
      if (strength.level === 'weak') {
        Toast.error(strength.message || 'Password does not meet requirements');
        passwordInput.focus();
        return;
      }

      if (password !== confirmPassword) {
        Toast.error('Passwords do not match');
        confirmPasswordInput.focus();
        return;
      }

      setButtonLoading(submitBtn, true);

      try {
        await API.post('/auth/reset-password', { token, password });
        
        Toast.success('Password reset successful! You can now log in.');
        
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);

      } catch (error) {
        console.error('Reset password error:', error);
        
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          Toast.error('Reset link has expired. Please request a new one.');
          setTimeout(() => {
            window.location.href = '/reset';
          }, 2000);
        } else {
          Toast.error(error.message || 'Failed to reset password. Please try again.');
        }
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  }

  /* =========================
     EMAIL VERIFICATION
     ========================= */
  
  function initEmailVerification() {
    const verifyMessage = document.getElementById('verifyMessage');
    const verifyContainer = document.getElementById('verifyContainer');
    
    if (!verifyMessage) return;

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      if (verifyMessage) {
        verifyMessage.textContent = 'No verification token provided.';
        verifyMessage.className = 'verify-message error';
      }
      return;
    }

    verifyEmail(token, verifyMessage, verifyContainer);
  }

  async function verifyEmail(token, messageElement, containerElement) {
    try {
      // Show loading state
      if (messageElement) {
        messageElement.textContent = 'Verifying your email...';
        messageElement.className = 'verify-message loading';
      }

      const data = await API.post('/auth/verify-email', { token });
      
      if (messageElement) {
        messageElement.textContent = '✅ Your email has been verified successfully!';
        messageElement.className = 'verify-message success';
      }

      Toast.success('Email verified! Redirecting to login...');
      
      setTimeout(() => {
        window.location.href = '/login?verified=true';
      }, 2000);

    } catch (error) {
      console.error('Verification error:', error);
      
      if (messageElement) {
        messageElement.textContent = '❌ Verification failed: ' + (error.message || 'Invalid or expired token');
        messageElement.className = 'verify-message error';
      }

      Toast.error('Email verification failed');

      // Show option to resend
      if (containerElement) {
        const resendBtn = document.createElement('button');
        resendBtn.textContent = 'Request New Verification Email';
        resendBtn.className = 'btn btn-primary';
        resendBtn.addEventListener('click', () => {
          window.location.href = '/resend-verification';
        });
        containerElement.appendChild(resendBtn);
      }
    }
  }

  /* =========================
     PASSWORD STRENGTH CALCULATOR
     ========================= */
  
  function calculatePasswordStrength(password) {
    if (!password) {
      return { 
        level: 'weak', 
        message: '',
        score: 0
      };
    }

    // Check length first
    if (password.length < PASSWORD_MIN_LENGTH) {
      return {
        level: 'weak',
        message: `❌ Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
        score: 0
      };
    }

    let score = 0;
    const feedback = [];

    // Check required character types
    const hasLower = PASSWORD_REQUIREMENTS.hasLower.test(password);
    const hasUpper = PASSWORD_REQUIREMENTS.hasUpper.test(password);
    const hasNumber = PASSWORD_REQUIREMENTS.hasNumber.test(password);
    const hasSpecial = PASSWORD_REQUIREMENTS.hasSpecial.test(password);

    if (!hasLower) feedback.push('lowercase letter');
    if (!hasUpper) feedback.push('uppercase letter');
    if (!hasNumber) feedback.push('number');
    if (!hasSpecial) feedback.push('special character');

    if (feedback.length > 0) {
      return {
        level: 'weak',
        message: `❌ Password must include: ${feedback.join(', ')}`,
        score: 1
      };
    }

    // All requirements met - now score strength
    score = 3; // Base score for meeting requirements

    // Length bonuses
    if (password.length >= 16) score += 2;
    else if (password.length >= 14) score += 1;

    // Variety bonuses
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= 12) score += 2;
    else if (uniqueChars >= 8) score += 1;

    // Check for common patterns (penalties)
    const commonPatterns = [
      /(.)\1{2,}/, // Repeated characters (aaa, 111)
      /012|123|234|345|456|567|678|789|890/, // Sequential numbers
      /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i, // Sequential letters
      /password|admin|user|login|welcome/i // Common words
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) score--;
    }

    // Determine level based on score
    if (score < 4) {
      return {
        level: 'medium',
        message: '⚠️ Password is okay, but could be stronger',
        score: score
      };
    } else if (score >= 6) {
      return {
        level: 'strong',
        message: '✅ Excellent! Strong password',
        score: score
      };
    } else {
      return {
        level: 'strong',
        message: '✅ Good! Strong password',
        score: score
      };
    }
  }

  /* =========================
     AUTH STATE MANAGEMENT
     ========================= */
  
  function updateAuthState() {
    const userStr = storage.get('goodies_user');
    const user = userStr ? JSON.parse(userStr) : null;

    const accountLinks = document.querySelectorAll('.account-link, .header-icon-btn[href="/login"]');
    const userNameDisplays = document.querySelectorAll('.user-name');
    const authButtons = document.querySelectorAll('[data-auth-required]');
    
    if (user) {
      // User is logged in
      accountLinks.forEach(link => {
        link.href = user.role === 'admin' ? '/admin' : '/campaign-dashboard';
        link.title = `Account: ${escapeHtml(user.name || user.email)}`;
      });

      // Update user name displays
      userNameDisplays.forEach(el => {
        el.textContent = user.name || user.email.split('@')[0];
      });

      // Show auth-required elements
      authButtons.forEach(btn => {
        btn.classList.remove('hidden');
      });

    } else {
      // User is logged out
      accountLinks.forEach(link => {
        link.href = '/login';
        link.title = 'Sign in';
      });

      // Hide auth-required elements
      authButtons.forEach(btn => {
        btn.classList.add('hidden');
      });
    }
  }

  /* =========================
     LOGOUT
     ========================= */
  
  function initLogout() {
    const logoutBtns = document.querySelectorAll('[data-logout], #logoutBtn, .logout-btn');
    
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Disable button during logout
        btn.disabled = true;

        try {
          // Call server logout to clear httpOnly cookie
          await API.post('/auth/logout');
        } catch (error) {
          console.warn('Logout API call failed:', error);
          // Continue with client-side logout even if server call fails
        }

        // Clear local storage
        storage.remove('goodies_user');
        
        Toast.success('Logged out successfully');
        
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
      });
    });
  }

  /* =========================
     PROTECTED ROUTE CHECK
     ========================= */
  
  function checkProtectedRoute() {
    const protectedPages = [
      '/campaigns',
      '/create',
      '/campaign-dashboard',
      '/dashboard',
      '/admin',
      '/donate'
    ];
    
    const currentPath = window.location.pathname;
    
    // Check if current page requires authentication
    const requiresAuth = protectedPages.some(page => currentPath.startsWith(page));
    
    if (requiresAuth) {
      const userStr = storage.get('goodies_user');
      
      if (!userStr) {
        Toast.error('Please log in to access this page');
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        setTimeout(() => {
          window.location.href = `/login?return=${returnUrl}`;
        }, 1500);
        return false;
      }

      // Check admin access
      if (currentPath.startsWith('/admin')) {
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') {
          Toast.error('Access denied. Admin privileges required.');
          setTimeout(() => {
            window.location.href = '/campaigns';
          }, 1500);
          return false;
        }
      }
    }
    
    return true;
  }

  /* =========================
     HELPER FUNCTIONS
     ========================= */
  
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function showFieldError(input, message) {
    if (!input) return;
    
    input.classList.add('error', 'is-invalid');
    input.setAttribute('aria-invalid', 'true');
    
    const formGroup = input.closest('.form-group, .input-group, .field-group');
    if (formGroup) {
      let errorElement = formGroup.querySelector('.error-message, .field-error, .invalid-feedback');
      if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        formGroup.appendChild(errorElement);
      }
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
    }
  }

  function clearFieldError(input) {
    if (!input) return;
    
    input.classList.remove('error', 'is-invalid');
    input.removeAttribute('aria-invalid');
    
    const formGroup = input.closest('.form-group, .input-group, .field-group');
    if (formGroup) {
      const errorElement = formGroup.querySelector('.error-message, .field-error, .invalid-feedback');
      if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
      }
    }
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /* =========================
     SESSION TIMEOUT WARNING
     ========================= */
  
  function initSessionTimeout() {
    const SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days
    const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before expiry
    
    const userStr = storage.get('goodies_user');
    if (!userStr) return;

    const loginTime = storage.get('goodies_login_time');
    if (!loginTime) {
      storage.set('goodies_login_time', Date.now().toString());
      return;
    }

    const elapsed = Date.now() - parseInt(loginTime);
    const remaining = SESSION_TIMEOUT - elapsed;

    if (remaining <= 0) {
      // Session expired
      storage.remove('goodies_user');
      storage.remove('goodies_login_time');
      Toast.warning('Your session has expired. Please log in again.');
      setTimeout(() => {
        window.location.href = '/login?expired=true';
      }, 2000);
    } else if (remaining <= WARNING_TIME) {
      // Show warning
      Toast.warning('Your session will expire soon. Please save your work.');
    }
  }

  /* =========================
     INITIALIZATION
     ========================= */
  
  function init() {
    try {
      // Initialize forms based on page
      initLoginForm();
      initRegisterForm();
      initResetForm();
      initResetPasswordForm();
      initEmailVerification();
      
      // Update auth state
      updateAuthState();
      
      // Initialize logout
      initLogout();
      
      // Check protected routes
      checkProtectedRoute();

      // Check session timeout
      initSessionTimeout();

      // Update login time on activity
      const userStr = storage.get('goodies_user');
      if (userStr) {
        ['click', 'keydown', 'scroll'].forEach(event => {
          document.addEventListener(event, debounce(() => {
            storage.set('goodies_login_time', Date.now().toString());
          }, 60000), { once: false, passive: true }); // Update once per minute max
        });
      }
      
      console.log('✅ Auth system initialized');
    } catch (error) {
      console.error('❌ Auth initialization error:', error);
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging (only in development)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.GoodiesAuth = {
      updateAuthState,
      calculatePasswordStrength,
      checkProtectedRoute
    };
  }

})();