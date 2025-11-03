/* ============================================================
   GOODIES FRONTEND BUNDLE — PRODUCTION (v1.0)
   Combines: header.js, social.js, ui.js, analytics.js, donate.js
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  /* ------------------------------
     HEADER / NAVIGATION (header.js)
  ------------------------------ */
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('mainNav') || document.querySelector('.main-nav');
  if (hamburger && nav) {
    const toggleNav = () => {
      const isOpen = hamburger.classList.toggle('open');
      nav.classList.toggle('active', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
    };
    hamburger.addEventListener('click', toggleNav);
    hamburger.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleNav(); }
    });
  }

  // Highlight current page link
  try {
    const links = Array.from(document.querySelectorAll('.site-header a.nav-link'));
    const pathname = window.location.pathname || '/';
    const current = (pathname === '/' || pathname === '') ? '/index.html' : pathname;
    links.forEach(a => {
      const url = new URL(a.href, window.location.origin);
      const linkPath = url.pathname;
      if (linkPath === pathname || linkPath === current || (pathname === '/' && linkPath === '/index.html')) {
        a.setAttribute('aria-current', 'page');
        a.classList.add('active');
      } else {
        a.removeAttribute('aria-current');
        a.classList.remove('active');
      }
    });
  } catch (_) {}

  // Header search toggle
  try {
    const searchWrap = document.querySelector('.header-search');
    const searchInputs = document.querySelectorAll('.header-search input[type="search"]');
    const searchBtns = Array.from(document.querySelectorAll('[data-toggle-search]'));
    searchBtns.forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        if (searchWrap) {
          const open = searchWrap.classList.toggle('open');
          if (open) {
            const inp = searchWrap.querySelector('input[type="search"]');
            if (inp) inp.focus();
          }
        } else if (searchInputs.length) searchInputs[0].focus();
      });
    });
  } catch (_) {}

  /* ------------------------------
     SOCIAL SHARE (social.js)
  ------------------------------ */
  try {
    const buttons = document.querySelectorAll('[data-share]');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const network = btn.dataset.share;
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(document.title);
        const shareURLs = {
          twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
          linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`
        };
        if (shareURLs[network]) window.open(shareURLs[network], "_blank", "width=600,height=500");
      });
    });
  } catch (_) {}

  /* ------------------------------
     UI / ACCESSIBILITY (ui.js)
  ------------------------------ */
  const scrollTriggers = document.querySelectorAll('.reveal-on-scroll');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1 });
  scrollTriggers.forEach(el => observer.observe(el));

  // Toast notifications
  window.showToast = (msg, type = 'info') => {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
  };

  /* ------------------------------
     ANALYTICS (analytics.js)
  ------------------------------ */
  try {
    const sendAnalytics = (event, details = {}) => {
      console.log(`📊 Analytics Event: ${event}`, details);
      // Future: send to your analytics endpoint or GA4
    };
    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('click', () => sendAnalytics('interaction', { id: el.id || el.textContent.trim() }));
    });
  } catch (_) {}

  /* ------------------------------
     DONATIONS (donate.js)
  ------------------------------ */
  const donateButtons = document.querySelectorAll("[data-donate]");
  donateButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const provider = btn.dataset.provider || "stripe";
      const campaignId = btn.dataset.campaign;
      const amount = btn.dataset.amount || "25";
      if (!campaignId) return alert("No campaign specified.");
      const headers = { "Content-Type": "application/json" };
      const token = localStorage.getItem("goodies_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      try {
        if (provider === "stripe") {
          const res = await fetch("/api/donations/stripe/session", {
            method: "POST", headers, body: JSON.stringify({ campaignId, amount })
          });
          const data = await res.json();
          if (data.url) window.location.href = data.url;
          else alert(data.message || "Error starting Stripe checkout");
        } else if (provider === "paypal") {
          const res = await fetch("/api/donations/paypal/order", {
            method: "POST", headers, body: JSON.stringify({ campaignId, amount })
          });
          const data = await res.json();
          if (data.approveLink) window.location.href = data.approveLink;
          else alert(data.message || "Error starting PayPal donation");
        }
      } catch (err) {
        console.error("Donation Error:", err);
        showToast("Error processing donation", "error");
      }
    });
  });

});

/* ===========================================================
   HEADER DROPDOWN LOGIC — UNIFIED PRODUCTION BUNDLE
   =========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const dropdowns = document.querySelectorAll('.nav-item.dropdown');

  dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.dropdown-toggle');
    if (!toggle) return;

    // Desktop hover
    dropdown.addEventListener('mouseenter', () => {
      if (window.innerWidth > 992) {
        dropdown.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
    dropdown.addEventListener('mouseleave', () => {
      if (window.innerWidth > 992) {
        dropdown.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Mobile tap / click
    toggle.addEventListener('click', e => {
      if (window.innerWidth <= 992) {
        e.preventDefault();
        const isOpen = dropdown.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(isOpen));
      }
    });
  });

  // Close dropdowns when resizing window
  window.addEventListener('resize', () => {
    if (window.innerWidth > 992) {
      dropdowns.forEach(d => d.classList.remove('open'));
    }
  });
});

/* ===========================================================
   REAL-TIME PROGRESS + IMAGE UPLOAD
   =========================================================== */

// Real-time donation progress update (Socket or Poll)
document.addEventListener("DOMContentLoaded", () => {
  const progressBar = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get("id");

  if (progressBar && campaignId) {
    async function refreshProgress() {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}`);
        const c = await res.json();
        if (res.ok) {
          const percent = Math.min((c.currentAmount / c.goal) * 100, 100);
          progressBar.style.width = percent + "%";
          progressText.textContent = `${percent.toFixed(1)}% funded`;
        }
      } catch (err) {
        console.warn("Progress refresh failed:", err);
      }
    }
    setInterval(refreshProgress, 7000); // every 7s
  }

  // Campaign Image Upload + Preview
  const imageInput = document.getElementById("imageUploadInput");
  const previewContainer = document.getElementById("imagePreview");

  if (imageInput) {
    imageInput.addEventListener("change", () => {
      const file = imageInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        previewContainer.innerHTML = `<img src="${e.target.result}" alt="Preview"/>`;
      };
      reader.readAsDataURL(file);
    });
  }
});

