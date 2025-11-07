/* ============================================================
   create.js - Multi-Step Campaign Creation - PRODUCTION v1.0
   Security-hardened, production-ready campaign creation module
   ============================================================ */

(function() {
  'use strict';

  // Ensure Goodies global exists
  if (!window.Goodies) {
    return;
  }

  const { API, Toast, setButtonLoading, storage, escapeHtml } = window.Goodies;
  
  let currentStep = 1;
  let uploadedImage = null;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  /* =========================
     STEP NAVIGATION
     ========================= */
  
  function updateStep(step) {
    if (step < 1 || step > 4) {
      return;
    }

    currentStep = step;
    
    // Update progress steps
    document.querySelectorAll('.step').forEach((el, idx) => {
      const stepNumber = idx + 1;
      
      if (stepNumber < step) {
        el.classList.add('completed');
        el.classList.remove('active');
      } else if (stepNumber === step) {
        el.classList.add('active');
        el.classList.remove('completed');
      } else {
        el.classList.remove('active', 'completed');
      }
    });
    
    // Update form steps
    document.querySelectorAll('.form-step').forEach((el, idx) => {
      if (idx + 1 === step) {
        el.classList.add('active');
        el.setAttribute('aria-hidden', 'false');
      } else {
        el.classList.remove('active');
        el.setAttribute('aria-hidden', 'true');
      }
    });
    
    // Update progress bar
    const progress = (step / 4) * 100;
    const progressBar = document.querySelector('[role="progressbar"]');
    
    if (progressBar) {
      progressBar.setAttribute('aria-valuenow', step);
      progressBar.setAttribute('aria-label', `Step ${step} of 4`);
      
      const progressFill = progressBar.querySelector('.progress-bar-fill');
      if (progressFill) {
        progressFill.style.width = `${progress}%`;
      }
    }
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Focus on first input in new step
    setTimeout(() => {
      const activeStep = document.querySelector('.form-step.active');
      if (activeStep) {
        const firstInput = activeStep.querySelector('input, textarea, select');
        if (firstInput && !firstInput.disabled) {
          firstInput.focus();
        }
      }
    }, 300);
  }

  function validateStep(step) {
    let isValid = true;
    
    if (step === 1) {
      const title = document.getElementById('title');
      const category = document.getElementById('category');
      
      if (!title || !title.value.trim()) {
        Toast.error('Please enter a campaign title');
        if (title) title.focus();
        isValid = false;
      } else if (title.value.trim().length < 5) {
        Toast.error('Campaign title must be at least 5 characters');
        title.focus();
        isValid = false;
      } else if (title.value.trim().length > 100) {
        Toast.error('Campaign title must not exceed 100 characters');
        title.focus();
        isValid = false;
      } else if (!category || !category.value) {
        Toast.error('Please select a category');
        if (category) category.focus();
        isValid = false;
      }
    }
    
    if (step === 2) {
      const description = document.getElementById('description');
      const goal = document.getElementById('goal');
      const deadline = document.getElementById('deadline');
      
      if (!description || !description.value.trim()) {
        Toast.error('Please enter a description');
        if (description) description.focus();
        isValid = false;
      } else if (description.value.trim().length < 50) {
        Toast.error('Description must be at least 50 characters');
        description.focus();
        isValid = false;
      } else if (description.value.trim().length > 5000) {
        Toast.error('Description must not exceed 5000 characters');
        description.focus();
        isValid = false;
      } else if (!goal || !goal.value || parseFloat(goal.value) < 100) {
        Toast.error('Goal must be at least $100');
        if (goal) goal.focus();
        isValid = false;
      } else if (parseFloat(goal.value) > 1000000) {
        Toast.error('Goal cannot exceed $1,000,000');
        goal.focus();
        isValid = false;
      } else if (!deadline || !deadline.value) {
        Toast.error('Please select a deadline');
        if (deadline) deadline.focus();
        isValid = false;
      } else {
        // Check deadline is in future
        const deadlineDate = new Date(deadline.value);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        if (deadlineDate < tomorrow) {
          Toast.error('Deadline must be at least tomorrow');
          deadline.focus();
          isValid = false;
        }
        
        // Check deadline is not more than 1 year away
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        if (deadlineDate > oneYearFromNow) {
          Toast.error('Deadline cannot be more than 1 year away');
          deadline.focus();
          isValid = false;
        }
      }
    }
    
    if (step === 3) {
      if (!uploadedImage) {
        Toast.error('Please upload a campaign image');
        const uploadInput = document.getElementById('imageUploadInput');
        if (uploadInput) uploadInput.focus();
        isValid = false;
      }
    }
    
    if (step === 4) {
      const termsCheckbox = document.getElementById('termsAccept');
      if (!termsCheckbox || !termsCheckbox.checked) {
        Toast.error('You must accept the terms and conditions');
        if (termsCheckbox) termsCheckbox.focus();
        isValid = false;
      }
    }
    
    return isValid;
  }

  function initStepNavigation() {
    // Next buttons
    document.querySelectorAll('[data-next-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (validateStep(currentStep)) {
          updatePreview();
          updateStep(currentStep + 1);
        }
      });
    });
    
    // Previous buttons
    document.querySelectorAll('[data-prev-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        updateStep(currentStep - 1);
      });
    });
  }

  /* =========================
     IMAGE UPLOAD
     ========================= */
  
  function validateImageFile(file) {
    // Check file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      Toast.error('Please upload a valid image file (JPG, PNG, or WEBP)');
      return false;
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
      Toast.error(`Image must be less than ${sizeMB}MB`);
      return false;
    }
    
    // Additional check: file name length
    if (file.name.length > 255) {
      Toast.error('File name is too long');
      return false;
    }
    
    return true;
  }

  function initImageUpload() {
    const uploadZone = document.getElementById('uploadZone');
    const imageInput = document.getElementById('imageUploadInput');
    const preview = document.getElementById('imagePreview');
    
    if (!uploadZone || !imageInput || !preview) {
      return;
    }
    
    // Handle file selection
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      
      if (file && validateImageFile(file)) {
        uploadedImage = file;
        displayImagePreview(file, preview, uploadZone);
        Toast.success('Image uploaded successfully');
      } else {
        imageInput.value = ''; // Clear invalid selection
      }
    });
    
    // Drag and drop support
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });
    
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('drag-over');
    });
    
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      
      const file = e.dataTransfer?.files?.[0];
      if (file && validateImageFile(file)) {
        uploadedImage = file;
        imageInput.files = e.dataTransfer.files; // Update input
        displayImagePreview(file, preview, uploadZone);
        Toast.success('Image uploaded successfully');
      }
    });
  }

  function displayImagePreview(file, preview, uploadZone) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target.result;
      
      // Use textContent for alt to prevent XSS
      const img = document.createElement('img');
      img.src = result;
      img.alt = 'Campaign preview';
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-image';
      removeBtn.setAttribute('aria-label', 'Remove image');
      removeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>`;
      
      preview.innerHTML = '';
      preview.appendChild(img);
      preview.appendChild(removeBtn);
      preview.classList.remove('hidden');
      uploadZone.classList.add('hidden');
      
      // Attach remove handler
      removeBtn.addEventListener('click', () => {
        uploadedImage = null;
        const imageInput = document.getElementById('imageUploadInput');
        if (imageInput) imageInput.value = '';
        preview.classList.add('hidden');
        preview.innerHTML = '';
        uploadZone.classList.remove('hidden');
        Toast.info('Image removed');
      });
    };
    
    reader.onerror = () => {
      Toast.error('Failed to read image file');
    };
    
    reader.readAsDataURL(file);
  }

  /* =========================
     PREVIEW UPDATE
     ========================= */
  
  function updatePreview() {
    const titleEl = document.getElementById('title');
    const categoryEl = document.getElementById('category');
    const descriptionEl = document.getElementById('description');
    const goalEl = document.getElementById('goal');
    const deadlineEl = document.getElementById('deadline');
    
    // Use textContent instead of innerHTML to prevent XSS
    const previewTitle = document.getElementById('previewTitle');
    const previewCategory = document.getElementById('previewCategory');
    const previewDescription = document.getElementById('previewDescription');
    const previewGoal = document.getElementById('previewGoal');
    const previewDeadline = document.getElementById('previewDeadline');
    
    if (previewTitle && titleEl) {
      previewTitle.textContent = titleEl.value || 'Campaign Title';
    }
    
    if (previewCategory && categoryEl) {
      previewCategory.textContent = categoryEl.options[categoryEl.selectedIndex]?.text || 'Category';
    }
    
    if (previewDescription && descriptionEl) {
      previewDescription.textContent = descriptionEl.value || 'Description will appear here';
    }
    
    if (previewGoal && goalEl) {
      const goalValue = parseFloat(goalEl.value) || 0;
      previewGoal.textContent = `$${goalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    if (previewDeadline && deadlineEl && deadlineEl.value) {
      const date = new Date(deadlineEl.value);
      previewDeadline.textContent = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    // Update preview image if uploaded
    if (uploadedImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewImage = document.getElementById('previewImage');
        if (previewImage) {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.alt = 'Campaign preview';
          previewImage.innerHTML = '';
          previewImage.appendChild(img);
        }
      };
      reader.readAsDataURL(uploadedImage);
    }
  }

  /* =========================
     FORM SUBMISSION
     ========================= */
  
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!validateStep(4)) return;
    
    const submitBtn = document.getElementById('submitBtn');
    const feedback = document.getElementById('formFeedback');
    
    if (!submitBtn || !feedback) {
      return;
    }

    // Check authentication at submission time
    const token = storage.get('goodies_token');
    if (!token) {
      feedback.textContent = 'Please log in to create a campaign';
      feedback.className = 'form-feedback error';
      feedback.setAttribute('role', 'alert');
      Toast.error('Authentication required. Please log in.');
      
      setTimeout(() => {
        if (confirm('You need to be logged in to create a campaign. Go to login page?')) {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
      }, 1000);
      return;
    }

    const titleEl = document.getElementById('title');
    const categoryEl = document.getElementById('category');
    const descriptionEl = document.getElementById('description');
    const goalEl = document.getElementById('goal');
    const deadlineEl = document.getElementById('deadline');

    if (!titleEl || !categoryEl || !descriptionEl || !goalEl || !deadlineEl) {
      Toast.error('Form validation failed');
      return;
    }

    const formData = new FormData();
    formData.append('title', titleEl.value.trim());
    formData.append('category', categoryEl.value);
    formData.append('description', descriptionEl.value.trim());
    formData.append('goal', parseFloat(goalEl.value));
    formData.append('deadline', deadlineEl.value);
    
    if (uploadedImage) {
      formData.append('image', uploadedImage);
    }
    
    setButtonLoading(submitBtn, true);
    feedback.textContent = '';
    feedback.className = 'form-feedback';
    
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create campaign');
      }
      
      feedback.textContent = 'Campaign created successfully!';
      feedback.className = 'form-feedback success';
      feedback.setAttribute('role', 'status');
      Toast.success('Campaign created successfully!');
      
      // Redirect after short delay
      setTimeout(() => {
        window.location.href = data.campaignId ? `/campaign/${data.campaignId}` : '/dashboard';
      }, 1500);
      
    } catch (error) {
      feedback.textContent = error.message || 'Failed to create campaign';
      feedback.className = 'form-feedback error';
      feedback.setAttribute('role', 'alert');
      Toast.error(error.message || 'Failed to create campaign');
    } finally {
      setButtonLoading(submitBtn, false);
    }
  }

  /* =========================
     CHARACTER COUNTER
     ========================= */
  
  function initCharacterCounter() {
    const description = document.getElementById('description');
    const charCount = document.getElementById('charCount');
    const maxChars = 5000;
    
    if (description && charCount) {
      description.addEventListener('input', () => {
        const remaining = maxChars - description.value.length;
        charCount.textContent = `${description.value.length} / ${maxChars}`;
        
        if (remaining < 100) {
          charCount.classList.add('warning');
        } else {
          charCount.classList.remove('warning');
        }
        
        if (remaining < 0) {
          charCount.classList.add('error');
        } else {
          charCount.classList.remove('error');
        }
      });
    }
  }

  /* =========================
     GOAL FORMATTING
     ========================= */
  
  function initGoalFormatting() {
    const goalInput = document.getElementById('goal');
    
    if (goalInput) {
      goalInput.addEventListener('blur', () => {
        const value = parseFloat(goalInput.value);
        if (!isNaN(value) && value > 0) {
          goalInput.value = value.toFixed(2);
        }
      });
    }
  }

  /* =========================
     INITIALIZATION
     ========================= */
  
  function init() {
    const form = document.getElementById('createCampaignForm');
    if (!form) {
      return;
    }
    
    // Initialize components
    initStepNavigation();
    initImageUpload();
    initCharacterCounter();
    initGoalFormatting();
    
    // Form submission
    form.addEventListener('submit', handleSubmit);
    
    // Set minimum date for deadline (tomorrow)
    const deadline = document.getElementById('deadline');
    if (deadline) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      deadline.min = tomorrow.toISOString().split('T')[0];
      
      // Set maximum date (1 year from now)
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      deadline.max = maxDate.toISOString().split('T')[0];
    }
    
    // Initialize first step
    updateStep(1);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();