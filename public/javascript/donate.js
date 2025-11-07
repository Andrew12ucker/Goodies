/* ============================================================
   donate.js - Donation Page Logic - PRODUCTION v1.0
   Security-hardened, production-ready donation module
   ============================================================ */

(function() {
  'use strict';

  // Ensure Goodies global exists
  if (!window.Goodies) {
    return;
  }

  const { API, Toast, formatCurrency, formatDate, daysRemaining, escapeHtml } = window.Goodies;
  
  let campaignData = null;
  let wsConnection = null;
  let pollInterval = null;
  const WS_RECONNECT_DELAY = 5000;
  const POLL_INTERVAL = 15000;
  const MAX_MESSAGE_LENGTH = 500;
  const MIN_DONATION = 1;
  const MAX_DONATION = 100000;

  /* =========================
     GET CAMPAIGN ID FROM URL
     ========================= */
  
  function getCampaignId() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    return id;
  }

  /* =========================
     LOAD CAMPAIGN DATA
     ========================= */
  
  async function loadCampaign() {
    const campaignId = getCampaignId();
    
    if (!campaignId) {
      Toast.error('No campaign specified. Please select a campaign to donate to.');
      showErrorState();
      return;
    }
    
    try {
      campaignData = await API.get(`/campaigns/${escapeHtml(campaignId)}`);
      renderCampaign(campaignData);
      await loadRecentDonations(campaignId);
      initializeWebSocket(campaignId);
    } catch (error) {
      Toast.error('Failed to load campaign');
      showLoadingState();
    }
  }

  function showErrorState() {
    const titleEl = document.getElementById('campaignTitle');
    const descEl = document.getElementById('campaignDesc');
    
    if (titleEl) {
      titleEl.textContent = 'No campaign selected';
      titleEl.style.color = '#e74c3c';
    }
    
    if (descEl) {
      descEl.innerHTML = '';
      const message = document.createElement('p');
      message.textContent = 'Please visit the ';
      const link = document.createElement('a');
      link.href = '/campaigns';
      link.textContent = 'campaigns page';
      message.appendChild(link);
      message.appendChild(document.createTextNode(' to select a campaign.'));
      descEl.appendChild(message);
    }
  }

  function showLoadingState() {
    const titleEl = document.getElementById('campaignTitle');
    const descEl = document.getElementById('campaignDesc');
    
    if (titleEl) {
      titleEl.innerHTML = '<div class="text-skeleton"></div>';
    }
    if (descEl) {
      descEl.innerHTML = '<div class="text-skeleton"></div>';
    }
  }

  /* =========================
     RENDER CAMPAIGN
     ========================= */
  
  function renderCampaign(campaign) {
    if (!campaign) {
      return;
    }

    // Title and Description - use textContent to prevent XSS
    const titleEl = document.getElementById('campaignTitle');
    const descEl = document.getElementById('campaignDesc');
    
    if (titleEl) titleEl.textContent = campaign.title || 'Untitled Campaign';
    if (descEl) descEl.textContent = campaign.description || 'No description provided';
    
    // Image - create element programmatically
    const imageContainer = document.getElementById('campaignImage');
    if (imageContainer) {
      imageContainer.innerHTML = ''; // Clear first
      
      if (campaign.image) {
        const img = document.createElement('img');
        img.src = campaign.image;
        img.alt = campaign.title || 'Campaign image';
        img.loading = 'lazy';
        imageContainer.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder-image';
        placeholder.textContent = 'No image';
        imageContainer.appendChild(placeholder);
      }
    }
    
    // Stats
    const currentAmountEl = document.getElementById('currentAmount');
    const goalAmountEl = document.getElementById('goalAmount');
    const backerCountEl = document.getElementById('backerCount');
    
    if (currentAmountEl) currentAmountEl.textContent = formatCurrency(campaign.currentAmount || 0);
    if (goalAmountEl) goalAmountEl.textContent = formatCurrency(campaign.goal || 0);
    if (backerCountEl) backerCountEl.textContent = String(campaign.backers || 0);
    
    // Progress Bar
    const progress = campaign.goal > 0 
      ? Math.min((campaign.currentAmount / campaign.goal) * 100, 100) 
      : 0;
      
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
      progressFill.setAttribute('aria-valuenow', String(Math.round(progress)));
    }
    
    if (progressText) {
      progressText.textContent = `${progress.toFixed(1)}% funded`;
    }
    
    // Days Remaining
    if (campaign.deadline) {
      const daysLeft = daysRemaining(campaign.deadline);
      const daysElement = document.getElementById('daysRemaining');
      
      if (daysElement) {
        const daysSpan = daysElement.querySelector('span');
        if (daysSpan) {
          daysSpan.textContent = daysLeft > 0 
            ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining` 
            : 'Campaign ended';
        }
      }
    }
  }

  /* =========================
     LOAD RECENT DONATIONS
     ========================= */
  
  async function loadRecentDonations(campaignId) {
    const listContainer = document.getElementById('recentDonationsList');
    if (!listContainer) return;
    
    try {
      const donations = await API.get(`/campaigns/${escapeHtml(campaignId)}/donations?limit=5`);
      
      if (!donations || donations.length === 0) {
        listContainer.innerHTML = '';
        const message = document.createElement('p');
        message.className = 'loading-text';
        message.textContent = 'No donations yet. Be the first!';
        listContainer.appendChild(message);
        return;
      }
      
      listContainer.innerHTML = '';
      donations.forEach(donation => {
        const item = createDonationElement(donation);
        listContainer.appendChild(item);
      });
      
    } catch (error) {
      listContainer.innerHTML = '';
      const message = document.createElement('p');
      message.className = 'loading-text';
      message.textContent = 'Unable to load recent donations';
      listContainer.appendChild(message);
    }
  }

  function createDonationElement(donation) {
    const item = document.createElement('div');
    item.className = 'donation-item';
    
    const name = document.createElement('strong');
    name.textContent = donation.anonymous ? 'Anonymous' : (donation.donorName || 'Anonymous');
    
    const details = document.createElement('p');
    details.textContent = `${formatCurrency(donation.amount || 0)} • ${formatDate(donation.createdAt)}`;
    
    item.appendChild(name);
    item.appendChild(details);
    
    if (donation.message) {
      const message = document.createElement('p');
      message.className = 'donation-message';
      message.textContent = `"${donation.message}"`;
      item.appendChild(message);
    }
    
    return item;
  }

  /* =========================
     WEBSOCKET FOR REAL-TIME UPDATES
     ========================= */
  
  function initializeWebSocket(campaignId) {
    // Only initialize if WebSocket is supported
    if (!('WebSocket' in window)) {
      startPolling(campaignId);
      return;
    }
    
    // Always use secure WebSocket in production
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'wss:';
    const wsUrl = `${protocol}//${window.location.host}/ws/campaigns/${campaignId}`;
    
    try {
      wsConnection = new WebSocket(wsUrl);
      
      wsConnection.onopen = () => {
        // Connection established - silent in production
      };
      
      wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'donation') {
            handleNewDonation(data.donation);
          } else if (data.type === 'progress') {
            updateProgress(data);
          }
        } catch (error) {
          // Parse error - fail silently
        }
      };
      
      wsConnection.onerror = () => {
        // Fallback to polling on WebSocket error
        startPolling(campaignId);
      };
      
      wsConnection.onclose = () => {
        // Attempt to reconnect after delay
        setTimeout(() => {
          if (document.visibilityState === 'visible') {
            initializeWebSocket(campaignId);
          }
        }, WS_RECONNECT_DELAY);
      };
      
    } catch (error) {
      startPolling(campaignId);
    }
  }

  function handleNewDonation(donation) {
    if (!donation) return;

    // Update stats
    if (campaignData) {
      campaignData.currentAmount = (campaignData.currentAmount || 0) + (donation.amount || 0);
      campaignData.backers = (campaignData.backers || 0) + 1;
      renderCampaign(campaignData);
    }
    
    // Add to recent donations
    const listContainer = document.getElementById('recentDonationsList');
    if (listContainer) {
      const newItem = createDonationElement({
        ...donation,
        createdAt: new Date().toISOString()
      });
      
      newItem.style.animation = 'fadeIn 0.5s ease';
      listContainer.insertBefore(newItem, listContainer.firstChild);
      
      // Keep only last 5
      const items = listContainer.querySelectorAll('.donation-item');
      if (items.length > 5) {
        items[items.length - 1].remove();
      }
    }
    
    Toast.success('New donation received! 🎉');
  }

  function updateProgress(data) {
    if (!data) return;

    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const currentAmountEl = document.getElementById('currentAmount');
    const backerCountEl = document.getElementById('backerCount');
    
    const progress = data.goal > 0 
      ? Math.min((data.currentAmount / data.goal) * 100, 100) 
      : 0;
    
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
      progressFill.setAttribute('aria-valuenow', String(Math.round(progress)));
    }
    
    if (progressText) {
      progressText.textContent = `${progress.toFixed(1)}% funded`;
    }
    
    if (currentAmountEl) {
      currentAmountEl.textContent = formatCurrency(data.currentAmount || 0);
    }
    
    if (backerCountEl) {
      backerCountEl.textContent = String(data.backers || 0);
    }
  }

  /* =========================
     POLLING FALLBACK
     ========================= */
  
  function startPolling(campaignId) {
    // Clear any existing interval
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    pollInterval = setInterval(async () => {
      try {
        const data = await API.get(`/campaigns/${escapeHtml(campaignId)}`);
        if (campaignData && data.currentAmount !== campaignData.currentAmount) {
          campaignData = data;
          renderCampaign(data);
        }
      } catch (error) {
        // Polling error - fail silently
      }
    }, POLL_INTERVAL);
  }

  /* =========================
     DONATION AMOUNT SELECTION
     ========================= */
  
  function initAmountButtons() {
    const amountButtons = document.querySelectorAll('.amount-btn');
    const amountInput = document.getElementById('amount');
    
    if (!amountInput) return;
    
    amountButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active from all
        amountButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active to clicked
        button.classList.add('active');
        
        // Set input value
        const amount = button.dataset.amount;
        if (amount) {
          amountInput.value = amount;
          amountInput.focus();
        }
      });
    });
    
    // Remove active when user types custom amount
    amountInput.addEventListener('input', () => {
      amountButtons.forEach(btn => btn.classList.remove('active'));
    });
    
    // Format on blur
    amountInput.addEventListener('blur', () => {
      const value = parseFloat(amountInput.value);
      if (!isNaN(value) && value > 0) {
        amountInput.value = value.toFixed(2);
      }
    });
  }

  /* =========================
     MESSAGE CHARACTER COUNT
     ========================= */
  
  function initMessageCounter() {
    const messageInput = document.getElementById('donationMessage');
    const counter = document.getElementById('messageCharCount');
    
    if (!messageInput || !counter) return;
    
    messageInput.addEventListener('input', () => {
      const length = messageInput.value.length;
      counter.textContent = String(length);
      
      if (length > MAX_MESSAGE_LENGTH) {
        counter.classList.add('error');
      } else if (length > MAX_MESSAGE_LENGTH * 0.9) {
        counter.classList.add('warning');
        counter.classList.remove('error');
      } else {
        counter.classList.remove('warning', 'error');
      }
    });
  }

  /* =========================
     DONATION SUBMISSION
     ========================= */
  
  async function handleDonation(provider) {
    const amountInput = document.getElementById('amount');
    const messageInput = document.getElementById('donationMessage');
    const anonymousCheckbox = document.getElementById('anonymousDonation');
    const feedbackElement = document.getElementById('donationFeedback');
    
    if (!amountInput || !feedbackElement) {
      return;
    }

    const amount = parseFloat(amountInput.value);
    
    // Validation
    if (!amount || isNaN(amount) || amount < MIN_DONATION) {
      feedbackElement.textContent = `Please enter a valid donation amount (minimum $${MIN_DONATION})`;
      feedbackElement.className = 'form-feedback error';
      feedbackElement.setAttribute('role', 'alert');
      amountInput.focus();
      return;
    }

    if (amount > MAX_DONATION) {
      feedbackElement.textContent = `Maximum donation amount is $${MAX_DONATION.toLocaleString()}`;
      feedbackElement.className = 'form-feedback error';
      feedbackElement.setAttribute('role', 'alert');
      amountInput.focus();
      return;
    }
    
    const campaignId = getCampaignId();
    if (!campaignId) {
      feedbackElement.textContent = 'Invalid campaign';
      feedbackElement.className = 'form-feedback error';
      feedbackElement.setAttribute('role', 'alert');
      return;
    }

    // Sanitize and limit message length
    let message = '';
    if (messageInput && messageInput.value.trim()) {
      message = messageInput.value.trim().substring(0, MAX_MESSAGE_LENGTH);
    }

    const donationData = {
      campaignId: campaignId,
      amount: amount,
      message: message,
      anonymous: anonymousCheckbox?.checked || false
    };
    
    try {
      feedbackElement.textContent = `Processing your ${provider} donation...`;
      feedbackElement.className = 'form-feedback';
      feedbackElement.setAttribute('role', 'status');
      
      const endpoint = provider === 'Stripe' 
        ? '/donations/stripe/session' 
        : '/donations/paypal/order';
      
      const response = await API.post(endpoint, donationData);
      
      // Redirect to payment provider
      if (response.url || response.approveLink) {
        window.location.href = response.url || response.approveLink;
      } else {
        throw new Error('No checkout URL received from server');
      }
      
    } catch (error) {
      feedbackElement.textContent = error.message || 'Failed to process donation. Please try again.';
      feedbackElement.className = 'form-feedback error';
      feedbackElement.setAttribute('role', 'alert');
      Toast.error('Failed to process donation');
    }
  }

  function initDonationButtons() {
    const stripeBtn = document.getElementById('donateStripe');
    const paypalBtn = document.getElementById('donatePayPal');
    
    if (stripeBtn) {
      stripeBtn.addEventListener('click', () => handleDonation('Stripe'));
    }
    
    if (paypalBtn) {
      paypalBtn.addEventListener('click', () => handleDonation('PayPal'));
    }
  }

  /* =========================
     CLEANUP
     ========================= */
  
  function cleanup() {
    // Close WebSocket connection
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.close();
    }
    
    // Clear polling interval
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  }

  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('pagehide', cleanup);

  /* =========================
     INITIALIZATION
     ========================= */
  
  function init() {
    loadCampaign();
    initAmountButtons();
    initMessageCounter();
    initDonationButtons();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();