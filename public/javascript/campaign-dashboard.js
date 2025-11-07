/* ============================================================
   campaign-dashboard.js - Campaign Management Dashboard
   ============================================================ */

(function() {
  'use strict';

  // Ensure Goodies global exists
  if (!window.Goodies) {
    console.error('Goodies global object not found');
    return;
  }

  const { API, Toast, formatCurrency, formatDate, storage, setButtonLoading } = window.Goodies;
  
  let campaigns = [];
  let currentFilter = 'all';
  let currentCampaign = null;

  /* =========================
     AUTHENTICATION CHECK
     ========================= */
  
  function checkAuth() {
    const token = storage.get('goodies_token');
    if (!token) {
      Toast.error('Please log in to access your dashboard');
      setTimeout(() => window.location.href = '/login', 2000);
      return false;
    }
    return true;
  }

  /* =========================
     LOAD CAMPAIGNS
     ========================= */
  
  async function loadCampaigns(status = null) {
    try {
      const endpoint = status && status !== 'all' 
        ? `/campaigns/my/campaigns?status=${status}`
        : '/campaigns/my/campaigns';
      
      const data = await API.get(endpoint);
      campaigns = data.campaigns || [];
      
      updateCounts();
      renderCampaigns();
      
    } catch (error) {
      console.error('Error loading campaigns:', error);
      Toast.error('Failed to load campaigns');
      
      document.getElementById('loadingState').classList.add('hidden');
      document.getElementById('emptyState').classList.remove('hidden');
    }
  }

  /* =========================
     UPDATE COUNTS
     ========================= */
  
  function updateCounts() {
    const counts = {
      all: campaigns.length,
      draft: campaigns.filter(c => c.status === 'draft').length,
      active: campaigns.filter(c => c.status === 'active').length,
      paused: campaigns.filter(c => c.status === 'paused').length,
      completed: campaigns.filter(c => c.status === 'completed').length
    };
    
    Object.keys(counts).forEach(status => {
      const badge = document.getElementById(`count${status.charAt(0).toUpperCase() + status.slice(1)}`);
      if (badge) badge.textContent = counts[status];
    });
  }

  /* =========================
     RENDER CAMPAIGNS
     ========================= */
  
  function renderCampaigns() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const grid = document.getElementById('campaignsGrid');
    
    loadingState.classList.add('hidden');
    
    // Filter campaigns based on current filter
    const filtered = currentFilter === 'all' 
      ? campaigns 
      : campaigns.filter(c => c.status === currentFilter);
    
    if (filtered.length === 0) {
      emptyState.classList.remove('hidden');
      grid.classList.add('hidden');
      return;
    }
    
    emptyState.classList.add('hidden');
    grid.classList.remove('hidden');
    grid.innerHTML = '';
    
    filtered.forEach(campaign => {
      const card = createCampaignCard(campaign);
      grid.appendChild(card);
    });
  }

  /* =========================
     CREATE CAMPAIGN CARD
     ========================= */
  
  function createCampaignCard(campaign) {
    const template = document.getElementById('campaignCardTemplate');
    const card = template.content.cloneNode(true);
    
    const cardElement = card.querySelector('.campaign-card');
    cardElement.setAttribute('data-campaign-id', campaign._id);
    
    // Status badge
    const statusBadge = card.querySelector('.campaign-status-badge');
    statusBadge.textContent = campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1);
    statusBadge.className = `campaign-status-badge status-${campaign.status}`;
    
    // Image
    const img = card.querySelector('.campaign-card-image img');
    img.src = campaign.image || '/assets/placeholder-campaign.jpg';
    img.alt = campaign.title;
    
    // Title and category
    card.querySelector('.campaign-title').textContent = campaign.title;
    card.querySelector('.campaign-category').textContent = campaign.category;
    
    // Stats
    card.querySelector('.stat-value').textContent = formatCurrency(campaign.currentAmount || 0);
    card.querySelector('.stat-goal').textContent = formatCurrency(campaign.goal || 0);
    card.querySelector('.stat-backers').textContent = campaign.backers || 0;
    
    // Progress
    const progress = campaign.goal > 0 
      ? Math.min((campaign.currentAmount / campaign.goal) * 100, 100) 
      : 0;
    
    const progressFill = card.querySelector('.progress-fill');
    progressFill.style.width = `${progress}%`;
    
    const progressText = card.querySelector('.progress-text');
    progressText.textContent = `${progress.toFixed(1)}% funded`;
    
    // Days remaining
    const daysRemaining = calculateDaysRemaining(campaign.deadline);
    card.querySelector('.days-remaining').textContent = daysRemaining > 0 
      ? `${daysRemaining} days left` 
      : 'Ended';
    
    // Views
    card.querySelector('.views-count').textContent = `${campaign.views || 0} views`;
    
    // Buttons
    card.querySelector('.view-btn').addEventListener('click', () => viewCampaign(campaign));
    card.querySelector('.edit-btn').addEventListener('click', () => editCampaign(campaign));
    card.querySelector('.analytics-btn').addEventListener('click', () => showAnalytics(campaign));
    
    return card;
  }

  /* =========================
     CAMPAIGN ACTIONS
     ========================= */
  
  function viewCampaign(campaign) {
    window.open(`/donate?id=${campaign._id}`, '_blank');
  }

  function editCampaign(campaign) {
    currentCampaign = campaign;
    
    // Populate form
    document.getElementById('editCampaignId').value = campaign._id;
    document.getElementById('editTitle').value = campaign.title;
    document.getElementById('editDescription').value = campaign.description;
    document.getElementById('editGoal').value = campaign.goal;
    document.getElementById('editDeadline').value = campaign.deadline.split('T')[0];
    document.getElementById('editCategory').value = campaign.category;
    
    // Update character count
    document.getElementById('editCharCount').textContent = campaign.description.length;
    
    // Show modal
    document.getElementById('editModal').classList.remove('hidden');
  }

  async function showAnalytics(campaign) {
    try {
      const analytics = await API.get(`/campaigns/${campaign._id}/analytics`);
      
      // Populate analytics data
      document.getElementById('analyticsViews').textContent = analytics.views || 0;
      document.getElementById('analyticsBackers').textContent = analytics.backers || 0;
      document.getElementById('analyticsRaised').textContent = formatCurrency(analytics.currentAmount || 0);
      document.getElementById('analyticsConversion').textContent = `${analytics.conversionRate || 0}%`;
      
      document.getElementById('analyticsCurrentAmount').textContent = formatCurrency(analytics.currentAmount || 0);
      document.getElementById('analyticsGoal').textContent = formatCurrency(analytics.goal || 0);
      document.getElementById('analyticsPercentage').textContent = `${analytics.progressPercentage.toFixed(1)}%`;
      
      const progressFill = document.getElementById('analyticsProgressFill');
      progressFill.style.width = `${Math.min(analytics.progressPercentage, 100)}%`;
      
      document.getElementById('analyticsComments').textContent = analytics.comments || 0;
      document.getElementById('analyticsUpdates').textContent = analytics.updates || 0;
      document.getElementById('analyticsShares').textContent = analytics.shares || 0;
      document.getElementById('analyticsFavorites').textContent = analytics.favorites || 0;
      
      // Show modal
      document.getElementById('analyticsModal').classList.remove('hidden');
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      Toast.error('Failed to load analytics');
    }
  }

  /* =========================
     SAVE CAMPAIGN EDITS
     ========================= */
  
  async function saveCampaignEdits(e) {
    e.preventDefault();
    
    const campaignId = document.getElementById('editCampaignId').value;
    const saveBtn = document.getElementById('saveEditBtn');
    
    const formData = {
      title: document.getElementById('editTitle').value.trim(),
      description: document.getElementById('editDescription').value.trim(),
      goal: parseFloat(document.getElementById('editGoal').value),
      deadline: document.getElementById('editDeadline').value,
      category: document.getElementById('editCategory').value
    };
    
    // Validation
    if (formData.title.length < 5) {
      Toast.error('Title must be at least 5 characters');
      return;
    }
    
    if (formData.description.length < 50) {
      Toast.error('Description must be at least 50 characters');
      return;
    }
    
    if (formData.goal < 100) {
      Toast.error('Goal must be at least $100');
      return;
    }
    
    setButtonLoading(saveBtn, true);
    
    try {
      await API.put(`/campaigns/${campaignId}`, formData);
      
      Toast.success('Campaign updated successfully');
      
      // Close modal
      document.getElementById('editModal').classList.add('hidden');
      
      // Reload campaigns
      await loadCampaigns(currentFilter);
      
    } catch (error) {
      console.error('Error updating campaign:', error);
      Toast.error(error.message || 'Failed to update campaign');
    } finally {
      setButtonLoading(saveBtn, false);
    }
  }

  /* =========================
     FILTER CAMPAIGNS
     ========================= */
  
  function initFilters() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Update active state
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update filter and render
        currentFilter = tab.dataset.status;
        renderCampaigns();
      });
    });
  }

  /* =========================
     MODAL MANAGEMENT
     ========================= */
  
  function initModals() {
    // Close buttons
    document.querySelectorAll('.modal-close, [data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => {
          modal.classList.add('hidden');
        });
      });
    });
    
    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => {
          modal.classList.add('hidden');
        });
      });
    });
    
    // Prevent modal close when clicking inside
    document.querySelectorAll('.modal-container').forEach(container => {
      container.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });
  }

  /* =========================
     CHARACTER COUNTER
     ========================= */
  
  function initCharacterCounter() {
    const description = document.getElementById('editDescription');
    const charCount = document.getElementById('editCharCount');
    
    if (description && charCount) {
      description.addEventListener('input', () => {
        charCount.textContent = description.value.length;
      });
    }
  }

  /* =========================
     UTILITY FUNCTIONS
     ========================= */
  
  function calculateDaysRemaining(deadline) {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  /* =========================
     REFRESH BUTTON
     ========================= */
  
  function initRefresh() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        Toast.info('Refreshing campaigns...');
        loadCampaigns(currentFilter);
      });
    }
  }

  /* =========================
     LOGOUT
     ========================= */
  
  function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        storage.remove('goodies_token');
        storage.remove('goodies_user');
        Toast.success('Logged out successfully');
        setTimeout(() => window.location.href = '/login', 1000);
      });
    }
  }

  /* =========================
     USER MENU
     ========================= */
  
  function initUserMenu() {
    const trigger = document.querySelector('.user-menu-trigger');
    const dropdown = document.querySelector('.user-dropdown');
    
    if (trigger && dropdown) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
      });
      
      // Close when clicking outside
      document.addEventListener('click', () => {
        dropdown.classList.add('hidden');
      });
    }
    
    // Load user info
    const user = storage.get('goodies_user');
    if (user) {
      const userName = document.getElementById('userName');
      const userAvatar = document.getElementById('userAvatar');
      
      if (userName) userName.textContent = user.name || 'User';
      if (userAvatar && user.profilePicture) {
        userAvatar.src = user.profilePicture;
      }
    }
  }

  /* =========================
     INITIALIZATION
     ========================= */
  
  function init() {
    // Check authentication
    if (!checkAuth()) return;
    
    // Initialize components
    initFilters();
    initModals();
    initCharacterCounter();
    initRefresh();
    initLogout();
    initUserMenu();
    
    // Form submission
    const editForm = document.getElementById('editCampaignForm');
    if (editForm) {
      editForm.addEventListener('submit', saveCampaignEdits);
    }
    
    // Load campaigns
    loadCampaigns();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();