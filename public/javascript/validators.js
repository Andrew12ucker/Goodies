/* ============================================================
   validators.js - Form Validation Utilities - PRODUCTION v1.0
   Security-hardened validation functions for campaign data
   ============================================================ */

(function(root, factory) {
  'use strict';
  
  if (typeof module === 'object' && module.exports) {
    // Node.js/CommonJS
    module.exports = factory();
  } else {
    // Browser global
    root.GoodiesValidators = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  /* =========================
     VALIDATION RULES
     ========================= */
  
  const RULES = {
    TITLE_MIN_LENGTH: 5,
    TITLE_MAX_LENGTH: 100,
    DESCRIPTION_MIN_LENGTH: 50,
    DESCRIPTION_MAX_LENGTH: 5000,
    MIN_GOAL: 100,
    MAX_GOAL: 1000000,
    MESSAGE_MAX_LENGTH: 500
  };

  /* =========================
     SANITIZATION HELPERS
     ========================= */
  
  function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.trim();
  }

  function sanitizeNumber(value) {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  /* =========================
     CAMPAIGN VALIDATION
     ========================= */
  
  function validateCampaign(data) {
    const errors = {};
    
    // Title validation
    const title = sanitizeString(data.title);
    
    if (!title) {
      errors.title = 'Title is required';
    } else if (title.length < RULES.TITLE_MIN_LENGTH) {
      errors.title = `Title must be at least ${RULES.TITLE_MIN_LENGTH} characters`;
    } else if (title.length > RULES.TITLE_MAX_LENGTH) {
      errors.title = `Title must not exceed ${RULES.TITLE_MAX_LENGTH} characters`;
    }
    
    // Description validation
    const description = sanitizeString(data.description);
    
    if (!description) {
      errors.description = 'Description is required';
    } else if (description.length < RULES.DESCRIPTION_MIN_LENGTH) {
      errors.description = `Description must be at least ${RULES.DESCRIPTION_MIN_LENGTH} characters`;
    } else if (description.length > RULES.DESCRIPTION_MAX_LENGTH) {
      errors.description = `Description must not exceed ${RULES.DESCRIPTION_MAX_LENGTH} characters`;
    }
    
    // Goal validation
    const goal = sanitizeNumber(data.goal);
    
    if (goal === null || goal === undefined) {
      errors.goal = 'Funding goal is required';
    } else if (goal <= 0) {
      errors.goal = 'Funding goal must be greater than 0';
    } else if (goal < RULES.MIN_GOAL) {
      errors.goal = `Minimum funding goal is $${RULES.MIN_GOAL}`;
    } else if (goal > RULES.MAX_GOAL) {
      errors.goal = `Maximum funding goal is $${RULES.MAX_GOAL.toLocaleString()}`;
    }
    
    // Category validation
    if (!data.category || sanitizeString(data.category) === '') {
      errors.category = 'Category is required';
    }
    
    // Deadline validation
    if (!data.deadline) {
      errors.deadline = 'Deadline is required';
    } else {
      const deadlineDate = new Date(data.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (isNaN(deadlineDate.getTime())) {
        errors.deadline = 'Invalid deadline date';
      } else if (deadlineDate <= today) {
        errors.deadline = 'Deadline must be in the future';
      } else {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        
        if (deadlineDate > oneYearFromNow) {
          errors.deadline = 'Deadline cannot be more than 1 year away';
        }
      }
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors: errors
    };
  }

  /* =========================
     EMAIL VALIDATION
     ========================= */
  
  function validateEmail(email) {
    const sanitized = sanitizeString(email);
    
    if (!sanitized) {
      return { valid: false, error: 'Email is required' };
    }
    
    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(sanitized)) {
      return { valid: false, error: 'Please enter a valid email address' };
    }
    
    if (sanitized.length > 254) {
      return { valid: false, error: 'Email address is too long' };
    }
    
    return { valid: true, error: null };
  }

  /* =========================
     PASSWORD VALIDATION
     ========================= */
  
  function validatePassword(password) {
    const errors = [];
    
    if (!password || typeof password !== 'string') {
      return { valid: false, errors: ['Password is required'], strength: 0 };
    }
    
    // Length check
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters');
    }
    
    if (password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }
    
    // Complexity checks
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[^a-zA-Z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Calculate strength (0-4)
    let strength = 0;
    if (password.length >= 12) strength++;
    if (password.length >= 16) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) strength++;
    
    return {
      valid: errors.length === 0,
      errors: errors,
      strength: strength
    };
  }

  /* =========================
     DONATION VALIDATION
     ========================= */
  
  function validateDonation(data) {
    const errors = {};
    
    // Amount validation
    const amount = sanitizeNumber(data.amount);
    
    if (amount === null) {
      errors.amount = 'Donation amount is required';
    } else if (amount < 1) {
      errors.amount = 'Minimum donation is $1';
    } else if (amount > 100000) {
      errors.amount = 'Maximum donation is $100,000';
    }
    
    // Message validation (optional)
    if (data.message) {
      const message = sanitizeString(data.message);
      
      if (message.length > RULES.MESSAGE_MAX_LENGTH) {
        errors.message = `Message must not exceed ${RULES.MESSAGE_MAX_LENGTH} characters`;
      }
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors: errors
    };
  }

  /* =========================
     URL VALIDATION
     ========================= */
  
  function validateUrl(url) {
    const sanitized = sanitizeString(url);
    
    if (!sanitized) {
      return { valid: false, error: 'URL is required' };
    }
    
    try {
      const urlObject = new URL(sanitized);
      
      // Only allow http and https protocols
      if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
        return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
      }
      
      return { valid: true, error: null };
    } catch (e) {
      return { valid: false, error: 'Please enter a valid URL' };
    }
  }

  /* =========================
     FILE VALIDATION
     ========================= */
  
  function validateImageFile(file) {
    const errors = [];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (!file) {
      return { valid: false, errors: ['No file selected'] };
    }
    
    // Type validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      errors.push('File must be JPG, PNG, or WEBP format');
    }
    
    // Size validation
    if (file.size > MAX_SIZE) {
      errors.push('File size must be less than 5MB');
    }
    
    // Name length validation
    if (file.name.length > 255) {
      errors.push('File name is too long');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /* =========================
     EXPORT PUBLIC API
     ========================= */
  
  return {
    validateCampaign: validateCampaign,
    validateEmail: validateEmail,
    validatePassword: validatePassword,
    validateDonation: validateDonation,
    validateUrl: validateUrl,
    validateImageFile: validateImageFile,
    
    // Export rules for external use
    RULES: RULES
  };
});