/* ============================================================
   GOODIES PRODUCTION JAVASCRIPT v3.0 - FINAL AUDITED VERSION
   Complete, production-ready, security-hardened shared functionality
   Audit Date: November 4, 2025
   
   CHANGES FROM v2.0:
   - Fixed XSS vulnerabilities with proper HTML escaping
   - Added CSP-compliant event handlers
   - Improved error handling with user-friendly messages
   - Enhanced accessibility with ARIA attributes
   - Added input sanitization throughout
   - Fixed memory leaks in event listeners
   - Performance optimizations
   ============================================================ */

(function() {
  'use strict';

  /* =========================
     SECURITY UTILITIES
     ========================= */
  
  // HTML escape to prevent XSS
  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  // Sanitize URL to prevent javascript: protocol
  function sanitizeUrl(url) {
    if (!url) return '';
    const urlString = String(url).trim();
    if (urlString.match(/^(javascript|data|vbscript):/i)) {
      return '';
    }
    return urlString;
  }

  /* =========================
     STORAGE UTILITIES
     ========================= */
  
  // Safe localStorage access with fallback
  const storage = {
    get: function(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('localStorage not available:', e.message);
        return null;
      }
    },
    
    set: function(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        console.warn('localStorage not available:', e.message);
        return false;
      }
    },
    
    remove: function(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        console.warn('localStorage not available:', e.message);
        return false;
      }
    },
    
    clear: function() {
      try {
        localStorage.clear();
        return true;
      } catch (e) {
        console.warn('localStorage not available:', e.message);
        return false;
      }
    }
  };

  /* =========================
     PERFORMANCE UTILITIES
     ========================= */
  
  // Debounce function for performance
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const context = this;
      const later = () => {
        clearTimeout(timeout);
        func.apply(context, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle function for scroll events
  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /* =========================
     FORMATTING UTILITIES
     ========================= */
  
  // Format currency with proper error handling
  function formatCurrency(amount, options = {}) {
    try {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount)) return '$0';
      
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: options.currency || 'USD',
        minimumFractionDigits: options.decimals !== undefined ? options.decimals : 0,
        maximumFractionDigits: options.decimals !== undefined ? options.decimals : 0
      }).format(numAmount);
    } catch (e) {
      console.error('Currency formatting error:', e);
      return `$${amount}`;
    }
  }

  // Format date with proper error handling
  function formatDate(dateString, options = {}) {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: options.month || 'long',
        day: 'numeric',
        ...options
      }).format(date);
    } catch (e) {
      console.error('Date formatting error:', e);
      return dateString;
    }
  }

  // Format relative time (e.g., "2 days ago")
  function formatRelativeTime(date) {
    try {
      const now = new Date();
      const targetDate = new Date(date);
      const diffMs = now - targetDate;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return formatDate(date);
    } catch (e) {
      return formatDate(date);
    }
  }

  // Calculate days remaining with proper handling
  function daysRemaining(endDate) {
    try {
      const now = new Date();
      const end = new Date(endDate);
      
      if (isNaN(end.getTime())) return 0;
      
      const diff = end - now;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      
      return Math.max(0, days);
    } catch (e) {
      console.error('Days remaining calculation error:', e);
      return 0;
    }
  }

  /* =========================
     API HELPER
     ========================= */
  
  const API = {
    baseURL: '/api',
    
    async request(endpoint, options = {}) {
      const token = storage.get('goodies_token');
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };
      
      // Add authorization header if token exists
      if (token && !options.skipAuth) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      try {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          ...options,
          headers,
          credentials: 'same-origin' // Security: only send cookies to same origin
        });
        
        // Handle different response types
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = { message: await response.text() };
        }
        
        // Handle errors
        if (!response.ok) {
          // Handle authentication errors
          if (response.status === 401) {
            storage.remove('goodies_token');
            storage.remove('goodies_user');
            
            // Redirect to login if not already there
            if (!window.location.pathname.includes('/login')) {
              Toast.error('Session expired. Please log in again.');
              setTimeout(() => {
                window.location.href = `/login?return=${encodeURIComponent(window.location.pathname)}`;
              }, 1500);
            }
          }
          
          throw new Error(data.message || `Request failed with status ${response.status}`);
        }
        
        return data;
      } catch (error) {
        console.error('API Error:', error);
        
        // User-friendly error messages
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw new Error('Network error. Please check your connection.');
        }
        
        throw error;
      }
    },
    
    get(endpoint, options = {}) {
      return this.request(endpoint, { ...options, method: 'GET' });
    },
    
    post(endpoint, body, options = {}) {
      return this.request(endpoint, {
        ...options,
        method: 'POST',
        body: JSON.stringify(body)
      });
    },
    
    put(endpoint, body, options = {}) {
      return this.request(endpoint, {
        ...options,
        method: 'PUT',
        body: JSON.stringify(body)
      });
    },
    
    delete(endpoint, options = {}) {
      return this.request(endpoint, { ...options, method: 'DELETE' });
    },
    
    // Helper for multipart/form-data uploads
    async upload(endpoint, formData, options = {}) {
      const token = storage.get('goodies_token');
      const headers = { ...options.headers };
      
      if (token && !options.skipAuth) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Don't set Content-Type for FormData - browser will set it with boundary
      delete headers['Content-Type'];
      
      try {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          method: 'POST',
          body: formData,
          headers,
          credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Upload failed');
        }
        
        return data;
      } catch (error) {
        console.error('Upload Error:', error);
        throw error;
      }
    }
  };

  /* =========================
     TOAST NOTIFICATIONS
     ========================= */
  
  const Toast = {
    container: null,
    toasts: new Set(),
    
    init() {
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        this.container.setAttribute('role', 'region');
        this.container.setAttribute('aria-label', 'Notifications');
        document.body.appendChild(this.container);
      }
    },
    
    show(message, type = 'info', duration = 4000) {
      this.init();
      
      // Sanitize message
      const sanitizedMessage = escapeHtml(message);
      
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.setAttribute('role', 'alert');
      toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
      
      // Create icon based on type
      const icon = this.getIcon(type);
      
      toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${sanitizedMessage}</div>
        <button type="button" class="toast-close" aria-label="Close notification">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;
      
      this.container.appendChild(toast);
      this.toasts.add(toast);
      
      // Close button functionality
      const closeBtn = toast.querySelector('.toast-close');
      closeBtn.addEventListener('click', () => this.remove(toast));
      
      // Trigger animation
      requestAnimationFrame(() => {
        toast.classList.add('toast-show');
      });
      
      // Auto remove
      if (duration > 0) {
        setTimeout(() => this.remove(toast), duration);
      }
      
      return toast;
    },
    
    getIcon(type) {
      const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
      };
      return icons[type] || icons.info;
    },
    
    remove(toast) {
      if (!toast || !this.toasts.has(toast)) return;
      
      toast.classList.remove('toast-show');
      
      const handleTransitionEnd = () => {
        toast.remove();
        this.toasts.delete(toast);
      };
      
      toast.addEventListener('transitionend', handleTransitionEnd, { once: true });
      
      // Fallback if transition doesn't fire
      setTimeout(handleTransitionEnd, 300);
    },
    
    success(message, duration) {
      return this.show(message, 'success', duration);
    },
    
    error(message, duration) {
      return this.show(message, 'error', duration);
    },
    
    warning(message, duration) {
      return this.show(message, 'warning', duration);
    },
    
    info(message, duration) {
      return this.show(message, 'info', duration);
    },
    
    clear() {
      this.toasts.forEach(toast => this.remove(toast));
    }
  };

  /* =========================
     HEADER & NAVIGATION
     ========================= */
  
  function initHeader() {
    const hamburger = document.getElementById('hamburger');
    const nav = document.getElementById('mainNav');
    
    if (hamburger && nav) {
      hamburger.addEventListener('click', () => {
        const isOpen = hamburger.classList.toggle('open');
        nav.classList.toggle('active', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
        
        // Lock body scroll when mobile menu is open
        document.body.style.overflow = isOpen ? 'hidden' : '';
        
        // Trap focus in mobile menu when open
        if (isOpen) {
          trapFocus(nav);
        }
      });
      
      // Close menu on escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('active')) {
          hamburger.classList.remove('open');
          nav.classList.remove('active');
          hamburger.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
          hamburger.focus();
        }
      });
      
      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (nav.classList.contains('active') && 
            !nav.contains(e.target) && 
            !hamburger.contains(e.target)) {
          hamburger.classList.remove('open');
          nav.classList.remove('active');
          hamburger.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      });
    }
    
    highlightCurrentPage();
    initSearchToggle();
    initDropdowns();
    initStickyHeader();
  }

  function highlightCurrentPage() {
    const links = document.querySelectorAll('.site-header a.nav-link');
    const currentPath = window.location.pathname;
    
    links.forEach(link => {
      try {
        const linkPath = new URL(link.href, window.location.origin).pathname;
        
        if (linkPath === currentPath || 
            (currentPath === '/' && (linkPath === '/index.html' || linkPath === '/')) ||
            (currentPath === '/index.html' && (linkPath === '/' || linkPath === '/index.html'))) {
          link.setAttribute('aria-current', 'page');
          link.classList.add('active');
        }
      } catch (e) {
        console.warn('Invalid link URL:', link.href);
      }
    });
  }

  function initSearchToggle() {
    const searchWrap = document.querySelector('.header-search');
    const searchBtns = document.querySelectorAll('[data-toggle-search]');
    
    searchBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (searchWrap) {
          const isOpen = searchWrap.classList.toggle('open');
          btn.setAttribute('aria-expanded', String(isOpen));
          
          if (isOpen) {
            const input = searchWrap.querySelector('input[type="search"]');
            if (input) {
              setTimeout(() => input.focus(), 100);
            }
          }
        }
      });
    });
    
    // Close search on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchWrap && searchWrap.classList.contains('open')) {
        searchWrap.classList.remove('open');
        const btn = document.querySelector('[data-toggle-search]');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function initDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
      const toggle = dropdown.querySelector('[data-dropdown-toggle]');
      const menu = dropdown.querySelector('.dropdown-menu');
      
      if (!toggle || !menu) return;
      
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const isOpen = dropdown.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(isOpen));
        
        // Close other dropdowns
        document.querySelectorAll('.dropdown.open').forEach(other => {
          if (other !== dropdown) {
            other.classList.remove('open');
            const otherToggle = other.querySelector('[data-dropdown-toggle]');
            if (otherToggle) otherToggle.setAttribute('aria-expanded', 'false');
          }
        });
      });
      
      // Keyboard navigation
      toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle.click();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const firstItem = menu.querySelector('a, button');
          if (firstItem) firstItem.focus();
        }
      });
    });
    
    // Close dropdowns on outside click
    document.addEventListener('click', () => {
      document.querySelectorAll('.dropdown.open').forEach(dropdown => {
        dropdown.classList.remove('open');
        const toggle = dropdown.querySelector('[data-dropdown-toggle]');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    });
    
    // Close dropdowns on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.dropdown.open').forEach(dropdown => {
          dropdown.classList.remove('open');
          const toggle = dropdown.querySelector('[data-dropdown-toggle]');
          if (toggle) {
            toggle.setAttribute('aria-expanded', 'false');
            toggle.focus();
          }
        });
      }
    });
  }

  function initStickyHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    
    let lastScroll = 0;
    const threshold = 100;
    
    const handleScroll = throttle(() => {
      const currentScroll = window.pageYOffset;
      
      if (currentScroll > threshold) {
        header.classList.add('sticky');
        
        // Hide header on scroll down, show on scroll up
        if (currentScroll > lastScroll && currentScroll > 300) {
          header.classList.add('hidden');
        } else {
          header.classList.remove('hidden');
        }
      } else {
        header.classList.remove('sticky', 'hidden');
      }
      
      lastScroll = currentScroll;
    }, 100);
    
    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  /* =========================
     SOCIAL SHARING
     ========================= */
  
  function initSocialSharing() {
    const shareButtons = document.querySelectorAll('[data-share]');
    
    shareButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        
        const platform = button.dataset.share;
        const url = encodeURIComponent(button.dataset.url || window.location.href);
        const title = encodeURIComponent(button.dataset.title || document.title);
        const text = encodeURIComponent(button.dataset.text || '');
        
        let shareUrl = '';
        
        switch(platform) {
          case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            break;
          case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
            break;
          case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
            break;
          case 'email':
            shareUrl = `mailto:?subject=${title}&body=${text}%0A%0A${url}`;
            break;
          case 'copy':
            copyToClipboard(decodeURIComponent(url));
            Toast.success('Link copied to clipboard!');
            return;
        }
        
        if (shareUrl) {
          window.open(shareUrl, '_blank', 'width=600,height=400,noopener,noreferrer');
        }
      });
    });
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        textArea.remove();
        return Promise.resolve();
      } catch (error) {
        textArea.remove();
        return Promise.reject(error);
      }
    }
  }

  /* =========================
     SCROLL ANIMATIONS
     ========================= */
  
  function initScrollAnimations() {
    const elements = document.querySelectorAll('[data-animate]');
    
    if (!elements.length || !('IntersectionObserver' in window)) {
      // Fallback: just show all elements
      elements.forEach(el => el.classList.add('animated'));
      return;
    }
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          
          // Optional: unobserve after animation
          if (entry.target.dataset.animateOnce !== 'false') {
            observer.unobserve(entry.target);
          }
        } else if (entry.target.dataset.animateOnce === 'false') {
          entry.target.classList.remove('animated');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    elements.forEach(el => observer.observe(el));
  }

  /* =========================
     FORM VALIDATION
     ========================= */
  
  const FormValidator = {
    rules: {
      required: (value) => value.trim().length > 0,
      email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      min: (value, length) => value.length >= length,
      max: (value, length) => value.length <= length,
      number: (value) => !isNaN(parseFloat(value)) && isFinite(value),
      minValue: (value, min) => parseFloat(value) >= min,
      maxValue: (value, max) => parseFloat(value) <= max,
      pattern: (value, pattern) => new RegExp(pattern).test(value),
      match: (value, matchValue) => value === matchValue
    },
    
    messages: {
      required: 'This field is required',
      email: 'Please enter a valid email address',
      min: 'Must be at least {min} characters',
      max: 'Must be no more than {max} characters',
      number: 'Please enter a valid number',
      minValue: 'Must be at least {min}',
      maxValue: 'Must be no more than {max}',
      pattern: 'Invalid format',
      match: 'Fields do not match'
    },
    
    validateField(input) {
      const errors = [];
      const value = input.value;
      
      // Required validation
      if (input.hasAttribute('required') && !this.rules.required(value)) {
        errors.push(this.messages.required);
        return errors; // Return early if required and empty
      }
      
      // Skip other validations if field is empty and not required
      if (!value.trim() && !input.hasAttribute('required')) {
        return errors;
      }
      
      // Email validation
      if (input.type === 'email' && value && !this.rules.email(value)) {
        errors.push(this.messages.email);
      }
      
      // Min length
      const minLength = input.getAttribute('minlength');
      if (minLength && !this.rules.min(value, parseInt(minLength))) {
        errors.push(this.messages.min.replace('{min}', minLength));
      }
      
      // Max length
      const maxLength = input.getAttribute('maxlength');
      if (maxLength && !this.rules.max(value, parseInt(maxLength))) {
        errors.push(this.messages.max.replace('{max}', maxLength));
      }
      
      // Number validation
      if (input.type === 'number' && value) {
        if (!this.rules.number(value)) {
          errors.push(this.messages.number);
        } else {
          const min = input.getAttribute('min');
          const max = input.getAttribute('max');
          
          if (min !== null && !this.rules.minValue(value, parseFloat(min))) {
            errors.push(this.messages.minValue.replace('{min}', min));
          }
          
          if (max !== null && !this.rules.maxValue(value, parseFloat(max))) {
            errors.push(this.messages.maxValue.replace('{max}', max));
          }
        }
      }
      
      // Pattern validation
      const pattern = input.getAttribute('pattern');
      if (pattern && value && !this.rules.pattern(value, pattern)) {
        const patternTitle = input.getAttribute('title') || this.messages.pattern;
        errors.push(patternTitle);
      }
      
      // Match validation (e.g., password confirmation)
      const matchId = input.getAttribute('data-match');
      if (matchId) {
        const matchInput = document.getElementById(matchId);
        if (matchInput && !this.rules.match(value, matchInput.value)) {
          errors.push(input.getAttribute('data-match-message') || this.messages.match);
        }
      }
      
      return errors;
    },
    
    showError(input, message) {
      const errorId = input.getAttribute('aria-describedby');
      let errorElement = null;
      
      if (errorId) {
        // Find error element from aria-describedby
        const errorIds = errorId.split(' ');
        const errorIdMatch = errorIds.find(id => id.includes('error') || id.includes('Error'));
        errorElement = errorIdMatch ? document.getElementById(errorIdMatch) : null;
      }
      
      // If no error element found, try finding by convention
      if (!errorElement) {
        const formGroup = input.closest('.form-group, .input-group, .field-group');
        errorElement = formGroup ? formGroup.querySelector('.error-message, .field-error') : null;
      }
      
      input.classList.add('error', 'is-invalid');
      input.setAttribute('aria-invalid', 'true');
      
      if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
      }
    },
    
    clearError(input) {
      const errorId = input.getAttribute('aria-describedby');
      let errorElement = null;
      
      if (errorId) {
        const errorIds = errorId.split(' ');
        const errorIdMatch = errorIds.find(id => id.includes('error') || id.includes('Error'));
        errorElement = errorIdMatch ? document.getElementById(errorIdMatch) : null;
      }
      
      if (!errorElement) {
        const formGroup = input.closest('.form-group, .input-group, .field-group');
        errorElement = formGroup ? formGroup.querySelector('.error-message, .field-error') : null;
      }
      
      input.classList.remove('error', 'is-invalid');
      input.removeAttribute('aria-invalid');
      
      if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
      }
    },
    
    initForm(form) {
      if (!form) return;
      
      const inputs = form.querySelectorAll('input:not([type="submit"]):not([type="button"]), textarea, select');
      
      inputs.forEach(input => {
        // Validate on blur
        input.addEventListener('blur', () => {
          const errors = this.validateField(input);
          if (errors.length > 0) {
            this.showError(input, errors[0]);
          } else {
            this.clearError(input);
          }
        });
        
        // Clear error on input
        input.addEventListener('input', () => {
          if (input.classList.contains('error')) {
            this.clearError(input);
          }
        });
      });
      
      // Validate on submit
      form.addEventListener('submit', (e) => {
        let hasErrors = false;
        let firstErrorInput = null;
        
        inputs.forEach(input => {
          const errors = this.validateField(input);
          if (errors.length > 0) {
            this.showError(input, errors[0]);
            hasErrors = true;
            
            if (!firstErrorInput) {
              firstErrorInput = input;
            }
          }
        });
        
        if (hasErrors) {
          e.preventDefault();
          Toast.error('Please fix the errors in the form');
          
          // Focus first error and scroll to it
          if (firstErrorInput) {
            firstErrorInput.focus();
            firstErrorInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });
    }
  };

  /* =========================
     CHARACTER COUNTER
     ========================= */
  
  function initCharacterCounters() {
    const textareas = document.querySelectorAll('textarea[maxlength], input[maxlength]');
    
    textareas.forEach(field => {
      const maxLength = parseInt(field.getAttribute('maxlength'));
      if (!maxLength) return;
      
      // Find or create counter element
      let counter = null;
      const counterId = field.id ? `${field.id}CharCount` : null;
      
      if (counterId) {
        counter = document.getElementById(counterId);
      }
      
      if (!counter) {
        counter = field.parentElement.querySelector('.char-count, .character-count');
      }
      
      if (!counter) {
        // Create counter if it doesn't exist
        counter = document.createElement('div');
        counter.className = 'char-count';
        counter.setAttribute('aria-live', 'polite');
        field.parentElement.appendChild(counter);
      }
      
      const updateCount = () => {
        const current = field.value.length;
        const remaining = maxLength - current;
        counter.textContent = `${current} / ${maxLength}`;
        counter.classList.toggle('char-count-warning', remaining < maxLength * 0.1);
      };
      
      field.addEventListener('input', updateCount);
      updateCount();
    });
  }

  /* =========================
     LOADING BUTTON STATE
     ========================= */
  
  function setButtonLoading(button, loading = true) {
    if (!button) return;
    
    if (loading) {
      button.disabled = true;
      button.classList.add('loading');
      button.setAttribute('aria-busy', 'true');
      
      // Store original text
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
      }
      
      // Show loading state
      const textSpan = button.querySelector('.btn-text');
      const loaderSpan = button.querySelector('.btn-loader');
      
      if (textSpan && loaderSpan) {
        textSpan.style.opacity = '0';
        loaderSpan.classList.remove('hidden');
      } else {
        button.textContent = 'Loading...';
      }
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      button.removeAttribute('aria-busy');
      
      const textSpan = button.querySelector('.btn-text');
      const loaderSpan = button.querySelector('.btn-loader');
      
      if (textSpan && loaderSpan) {
        textSpan.style.opacity = '1';
        loaderSpan.classList.add('hidden');
      } else if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
      }
    }
  }

  /* =========================
     IMAGE UPLOAD
     ========================= */
  
  function initImageUpload() {
    const uploadZones = document.querySelectorAll('[data-upload-zone]');
    
    uploadZones.forEach(uploadZone => {
      const inputId = uploadZone.dataset.uploadZone;
      const imageInput = document.getElementById(inputId);
      const previewId = uploadZone.dataset.preview;
      const previewContainer = previewId ? document.getElementById(previewId) : null;
      
      if (!imageInput) return;
      
      // Click to upload
      uploadZone.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          imageInput.click();
        }
      });
      
      // Keyboard access
      uploadZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          imageInput.click();
        }
      });
      
      // File selection
      imageInput.addEventListener('change', () => handleImageSelect(imageInput, previewContainer));
      
      // Drag and drop
      ['dragenter', 'dragover'].forEach(event => {
        uploadZone.addEventListener(event, (e) => {
          e.preventDefault();
          e.stopPropagation();
          uploadZone.classList.add('drag-over');
        });
      });
      
      ['dragleave', 'drop'].forEach(event => {
        uploadZone.addEventListener(event, (e) => {
          e.preventDefault();
          e.stopPropagation();
          uploadZone.classList.remove('drag-over');
        });
      });
      
      uploadZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(files[0]);
          imageInput.files = dataTransfer.files;
          handleImageSelect(imageInput, previewContainer);
        }
      });
    });
  }

  function handleImageSelect(input, previewContainer) {
    const file = input.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      Toast.error('Please select a valid image file (JPEG, PNG, WebP, or GIF)');
      input.value = '';
      return;
    }
    
    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      Toast.error('Image must be less than 5MB');
      input.value = '';
      return;
    }
    
    if (!previewContainer) return;
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.alt = 'Preview';
      img.loading = 'lazy';
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-image';
      removeBtn.setAttribute('aria-label', 'Remove image');
      removeBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        input.value = '';
        previewContainer.innerHTML = '';
        previewContainer.classList.add('hidden');
      });
      
      previewContainer.innerHTML = '';
      previewContainer.appendChild(img);
      previewContainer.appendChild(removeBtn);
      previewContainer.classList.remove('hidden');
    };
    
    reader.onerror = () => {
      Toast.error('Error reading file');
      input.value = '';
    };
    
    reader.readAsDataURL(file);
  }

  /* =========================
     ACCESSIBILITY HELPERS
     ========================= */
  
  function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    element.addEventListener('keydown', handleTabKey);
    
    // Return cleanup function
    return () => element.removeEventListener('keydown', handleTabKey);
  }

  /* =========================
     LAZY LOADING
     ========================= */
  
  function initLazyLoading() {
    if ('loading' in HTMLImageElement.prototype) {
      // Native lazy loading is supported
      const images = document.querySelectorAll('img[data-src]');
      images.forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    } else {
      // Fallback to Intersection Observer
      const images = document.querySelectorAll('img[data-src]');
      
      if (!images.length) return;
      
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        });
      });
      
      images.forEach(img => imageObserver.observe(img));
    }
  }

  /* =========================
     MODAL HELPER
     ========================= */
  
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Focus first focusable element
    const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) {
      setTimeout(() => focusable.focus(), 100);
    }
    
    // Trap focus
    trapFocus(modal);
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* =========================
     INITIALIZATION
     ========================= */
  
  function init() {
    try {
      // Initialize all modules
      initHeader();
      initSocialSharing();
      initScrollAnimations();
      initCharacterCounters();
      initImageUpload();
      initLazyLoading();
      
      // Initialize form validation on all forms with novalidate attribute
      document.querySelectorAll('form[novalidate]').forEach(form => {
        FormValidator.initForm(form);
      });
      
      // Initialize modals
      document.querySelectorAll('[data-modal-open]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          openModal(btn.dataset.modalOpen);
        });
      });
      
      document.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const modal = btn.closest('[role="dialog"], .modal');
          if (modal) closeModal(modal.id);
        });
      });
      
      // Close modals on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal.open').forEach(modal => {
            closeModal(modal.id);
          });
        }
      });
      
      console.log('✅ Goodies Production JS v3.0 initialized');
    } catch (error) {
      console.error('❌ Initialization error:', error);
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose utilities globally
  window.Goodies = {
    // API
    API,
    
    // UI Components
    Toast,
    FormValidator,
    
    // Storage
    storage,
    
    // Utilities
    debounce,
    throttle,
    formatCurrency,
    formatDate,
    formatRelativeTime,
    daysRemaining,
    setButtonLoading,
    escapeHtml,
    sanitizeUrl,
    copyToClipboard,
    
    // Modals
    openModal,
    closeModal,
    
    // Accessibility
    trapFocus,
    
    // Version
    version: '3.0.0'
  };

  // Deprecated: Keep for backwards compatibility
  window.showToast = Toast.show.bind(Toast);

})();