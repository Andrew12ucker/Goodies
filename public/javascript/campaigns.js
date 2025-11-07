/* ============================================================
   campaigns.js - Campaign Management Page - PRODUCTION v1.0
   Security-hardened, production-ready campaign management
   ============================================================ */

(function() {
  'use strict';

  if (!window.Goodies) {
    return;
  }

  const { API, Toast, formatCurrency, formatDate, daysRemaining, storage, setButtonLoading, escapeHtml } = window.Goodies;
  let currentPage = 1;
  let currentFilter = 'all';

  /* =========================
     LOAD CAMPAIGNS
     ========================= */
  
  async function loadCampaigns(page = 1, filter = 'all') {
    const campaignGrid = document.getElementById('campaignGrid');
    if (!campaignGrid) return;
    
    // Show loading state
    showLoadingState(campaignGrid);
    
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
        status: filter
      });
      
      const data = await API.get(`/campaigns/user?${params}`);
      
      if (!data.campaigns || data.campaigns.length === 0) {
        showEmptyState(campaignGrid);
        return;
      }
      
      // Render campaigns
      campaignGrid.innerHTML = '';
      data.campaigns.forEach(campaign => {
        const card = createCampaignCard(campaign);
        campaignGrid.appendChild(card);
      });
      
      // Setup pagination if needed
      if (data.pagination) {
        setupPagination(data.pagination);
      }
      
    } catch (error) {
      showErrorState(campaignGrid, error.message);
      Toast.error('Failed to load campaigns');
    }
  }

  function showLoadingState(container) {
    container.innerHTML = '';
    const loading = document.createElement('div');
    loading.className = 'loading-state';
    loading.innerHTML = `
      <div class="spinner" aria-label="Loading campaigns"></div>
      <p>Loading campaigns...</p>
    `;
    container.appendChild(loading);
  }

  function showEmptyState(container) {
    container.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '64');
    svg.setAttribute('height', '64');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.innerHTML = '<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M12 8v8M8 12h8"></path>';
    
    const title = document.createElement('h3');
    title.textContent = 'No Campaigns Found';
    
    const description = document.createElement('p');
    description.textContent = "You haven't created any campaigns yet.";
    
    const link = document.createElement('a');
    link.href = '/create';
    link.className = 'cta-btn';
    link.textContent = 'Create Your First Campaign';
    
    empty.appendChild(svg);
    empty.appendChild(title);
    empty.appendChild(description);
    empty.appendChild(link);
    container.appendChild(empty);
  }

  function showErrorState(container, message) {
    container.innerHTML = '';
    const error = document.createElement('div');
    error.className = 'empty-state';
    
    const title = document.createElement('h3');
    title.textContent = 'Unable to Load Campaigns';
    
    const description = document.createElement('p');
    description.textContent = message || 'An error occurred';
    
    const button = document.createElement('button');
    button.className = 'cta-btn';
    button.textContent = 'Retry';
    button.onclick = () => window.location.reload();
    
    error.appendChild(title);
    error.appendChild(description);
    error.appendChild(button);
    container.appendChild(error);
  }

  /* =========================
     CREATE CAMPAIGN CARD
     ========================= */
  
  function createCampaignCard(campaign) {
    const card = document.createElement('div');
    card.className = 'campaign-card';
    card.setAttribute('data-campaign-id', campaign._id || '');
    
    // Image
    if (campaign.image) {
      const img = document.createElement('img');
      img.src = campaign.image;
      img.alt = campaign.title || 'Campaign image';
      img.className = 'campaign-image';
      img.loading = 'lazy';
      card.appendChild(img);
    }
    
    // Title
    const title = document.createElement('h3');
    title.textContent = campaign.title || 'Untitled Campaign';
    card.appendChild(title);
    
    // Description
    const description = document.createElement('p');
    const desc = campaign.description || '';
    description.textContent = desc.substring(0, 100) + (desc.length > 100 ? '...' : '');
    card.appendChild(description);
    
    // Progress section
    const progressWrap = document.createElement('div');
    progressWrap.className = 'progress-wrap';
    
    const progressStats = document.createElement('div');
    progressStats.className = 'progress-stats';
    
    const statRaised = document.createElement('div');
    statRaised.className = 'stat';
    const raisedStrong = document.createElement('strong');
    raisedStrong.textContent = formatCurrency(campaign.currentAmount || 0);
    const raisedSpan = document.createElement('span');
    raisedSpan.textContent = 'raised';
    statRaised.appendChild(raisedStrong);
    statRaised.appendChild(raisedSpan);
    
    const statGoal = document.createElement('div');
    statGoal.className = 'stat';
    const goalStrong = document.createElement('strong');
    goalStrong.textContent = formatCurrency(campaign.goal || 0);
    const goalSpan = document.createElement('span');
    goalSpan.textContent = 'goal';
    statGoal.appendChild(goalStrong);
    statGoal.appendChild(goalSpan);
    
    progressStats.appendChild(statRaised);
    progressStats.appendChild(statGoal);
    progressWrap.appendChild(progressStats);
    
    // Progress bar
    const progress = Math.min((campaign.currentAmount / campaign.goal) * 100, 100);
    const progressBarBg = document.createElement('div');
    progressBarBg.className = 'progress-bar-bg';
    
    const progressBarFill = document.createElement('div');
    progressBarFill.className = 'progress-bar-fill';
    progressBarFill.style.width = `${progress}%`;
    progressBarFill.setAttribute('role', 'progressbar');
    progressBarFill.setAttribute('aria-valuenow', String(Math.round(progress)));
    progressBarFill.setAttribute('aria-valuemin', '0');
    progressBarFill.setAttribute('aria-valuemax', '100');
    
    progressBarBg.appendChild(progressBarFill);
    progressWrap.appendChild(progressBarBg);
    
    // Progress label
    const daysLeft = daysRemaining(campaign.deadline);
    const progressLabel = document.createElement('p');
    progressLabel.className = 'progress-label';
    progressLabel.textContent = `${progress.toFixed(1)}% funded • ${daysLeft} days left`;
    progressWrap.appendChild(progressLabel);
    
    card.appendChild(progressWrap);
    
    // Button group
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    
    const viewLink = document.createElement('a');
    viewLink.href = `/campaign/${campaign._id || ''}`;
    viewLink.className = 'cta-btn';
    viewLink.textContent = 'View Campaign';
    
    const editLink = document.createElement('a');
    editLink.href = `/campaign/${campaign._id || ''}/edit`;
    editLink.className = 'cta-btn secondary';
    editLink.textContent = 'Edit';
    
    buttonGroup.appendChild(viewLink);
    buttonGroup.appendChild(editLink);
    card.appendChild(buttonGroup);
    
    return card;
  }

  /* =========================
     LOAD DONATIONS
     ========================= */
  
  async function loadDonations() {
    const donationsList = document.getElementById('donationsList');
    if (!donationsList) return;
    
    donationsList.innerHTML = '';
    showLoadingState(donationsList);
    
    try {
      const donations = await API.get('/donations/me');
      
      if (!donations || donations.length === 0) {
        showEmptyDonationsState(donationsList);
        return;
      }
      
      donationsList.innerHTML = '';
      donations.forEach(donation => {
        const item = createDonationItem(donation);
        donationsList.appendChild(item);
      });
      
    } catch (error) {
      showErrorDonationsState(donationsList);
    }
  }

  function showEmptyDonationsState(container) {
    container.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    
    const message = document.createElement('p');
    message.textContent = "You haven't made any donations yet.";
    
    const link = document.createElement('a');
    link.href = '/campaigns';
    link.className = 'cta-btn';
    link.textContent = 'Browse Campaigns';
    
    empty.appendChild(message);
    empty.appendChild(link);
    container.appendChild(empty);
  }

  function showErrorDonationsState(container) {
    container.innerHTML = '';
    const error = document.createElement('div');
    error.className = 'empty-state';
    
    const message = document.createElement('p');
    message.textContent = 'Unable to load donations. Please try again later.';
    
    error.appendChild(message);
    container.appendChild(error);
  }

  function createDonationItem(donation) {
    const item = document.createElement('div');
    item.className = 'donation-item';
    
    const title = document.createElement('strong');
    title.textContent = donation.campaignTitle || 'Unknown Campaign';
    
    const amount = document.createElement('p');
    amount.textContent = `Amount: ${formatCurrency(donation.amount || 0)}`;
    
    const date = document.createElement('p');
    date.textContent = `Date: ${formatDate(donation.createdAt)}`;
    
    item.appendChild(title);
    item.appendChild(amount);
    item.appendChild(date);
    
    if (donation.message) {
      const message = document.createElement('p');
      message.className = 'donation-message';
      message.textContent = donation.message;
      item.appendChild(message);
    }
    
    return item;
  }

  /* =========================
     ADMIN SECTION
     ========================= */
  
  async function initAdminControls() {
    const adminSection = document.getElementById('adminSection');
    if (!adminSection) return;
    
    try {
      const user = await API.get('/user/profile');
      
      if (user.role === 'admin') {
        adminSection.classList.remove('hidden');
        loadMaintenanceStatus();
        loadPlatformStats();
      }
    } catch (error) {
      // Admin check failed - user is not admin
    }
  }

  async function loadMaintenanceStatus() {
    const statusEl = document.getElementById('maintenanceStatus');
    const enableBtn = document.getElementById('enableMaintenance');
    const disableBtn = document.getElementById('disableMaintenance');
    
    if (!statusEl || !enableBtn || !disableBtn) return;
    
    try {
      const data = await API.get('/maintenance/status');
      statusEl.textContent = `Maintenance Mode is ${data.enabled ? 'ACTIVE' : 'INACTIVE'}`;
      
      enableBtn.disabled = false;
      disableBtn.disabled = false;
      
      enableBtn.onclick = () => toggleMaintenance(true);
      disableBtn.onclick = () => toggleMaintenance(false);
      
    } catch (error) {
      statusEl.textContent = 'Unable to check maintenance status';
    }
  }

  async function toggleMaintenance(enable) {
    const statusEl = document.getElementById('maintenanceStatus');
    const enableBtn = document.getElementById('enableMaintenance');
    const disableBtn = document.getElementById('disableMaintenance');
    
    if (!statusEl || !enableBtn || !disableBtn) return;
    
    try {
      setButtonLoading(enable ? enableBtn : disableBtn, true);
      
      await API.post(`/maintenance/${enable ? 'enable' : 'disable'}`);
      
      statusEl.textContent = `Maintenance Mode is ${enable ? 'ACTIVE' : 'INACTIVE'}`;
      Toast.success(`Maintenance mode ${enable ? 'enabled' : 'disabled'}`);
      
    } catch (error) {
      Toast.error('Failed to update maintenance mode');
    } finally {
      setButtonLoading(enable ? enableBtn : disableBtn, false);
    }
  }

  async function loadPlatformStats() {
    const totalCampaignsEl = document.getElementById('totalCampaigns');
    const activeUsersEl = document.getElementById('activeUsers');
    const totalRaisedEl = document.getElementById('totalRaised');
    
    if (!totalCampaignsEl || !activeUsersEl || !totalRaisedEl) return;
    
    try {
      const stats = await API.get('/admin/stats');
      
      totalCampaignsEl.textContent = String(stats.totalCampaigns || 0);
      activeUsersEl.textContent = String(stats.activeUsers || 0);
      totalRaisedEl.textContent = formatCurrency(stats.totalRaised || 0);
      
    } catch (error) {
      // Stats loading failed
    }
  }

  /* =========================
     PAGINATION
     ========================= */
  
  function setupPagination(pagination) {
    const container = document.getElementById('campaignPagination');
    if (!container || pagination.totalPages <= 1) {
      container?.classList.add('hidden');
      return;
    }
    
    container.classList.remove('hidden');
    container.innerHTML = '';
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '‹';
    prevBtn.disabled = pagination.currentPage === 1;
    prevBtn.setAttribute('aria-label', 'Previous page');
    prevBtn.onclick = () => {
      if (pagination.currentPage > 1) {
        loadCampaigns(pagination.currentPage - 1, currentFilter);
      }
    };
    container.appendChild(prevBtn);
    
    // Page numbers
    for (let i = 1; i <= pagination.totalPages; i++) {
      if (i === 1 || i === pagination.totalPages || Math.abs(i - pagination.currentPage) <= 2) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = String(i);
        pageBtn.className = i === pagination.currentPage ? 'active' : '';
        pageBtn.setAttribute('aria-label', `Page ${i}`);
        
        if (i === pagination.currentPage) {
          pageBtn.setAttribute('aria-current', 'page');
        }
        
        pageBtn.onclick = () => loadCampaigns(i, currentFilter);
        container.appendChild(pageBtn);
      } else if (Math.abs(i - pagination.currentPage) === 3) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        ellipsis.setAttribute('aria-hidden', 'true');
        container.appendChild(ellipsis);
      }
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '›';
    nextBtn.disabled = pagination.currentPage === pagination.totalPages;
    nextBtn.setAttribute('aria-label', 'Next page');
    nextBtn.onclick = () => {
      if (pagination.currentPage < pagination.totalPages) {
        loadCampaigns(pagination.currentPage + 1, currentFilter);
      }
    };
    container.appendChild(nextBtn);
  }

  /* =========================
     FILTER HANDLER
     ========================= */
  
  function initFilters() {
    const filterSelect = document.getElementById('campaignFilter');
    if (!filterSelect) return;
    
    filterSelect.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      currentPage = 1;
      loadCampaigns(currentPage, currentFilter);
    });
  }

  /* =========================
     INITIALIZATION
     ========================= */
  
  function init() {
    // Check authentication
    const token = storage.get('goodies_token');
    if (!token) {
      Toast.error('Please log in to view your campaigns');
      setTimeout(() => {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      }, 2000);
      return;
    }
    
    // Initialize components
    initFilters();
    loadCampaigns();
    loadDonations();
    initAdminControls();
    
    // Expose reload function globally for pagination
    window.loadCampaigns = loadCampaigns;
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();