// js/create.js - campaign creation + checkout (single DOMContentLoaded)
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('create-campaign-form');
  const checkoutBtn = document.getElementById('checkout-button');
  let lastCampaignId = null;

  const showFieldError = (fieldId, msg) => {
    const el = document.getElementById(fieldId + 'Error');
    const input = document.getElementById(fieldId);
    if (el) {
      el.textContent = msg || '';
      el.hidden = !msg;
    }
    if (input) {
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
  };

  const showFormError = (msg) => {
    const container = document.getElementById('formErrors');
    if (container) {
      container.hidden = !msg;
      container.textContent = msg || '';
    }
  };

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      // Clear previous errors
      showFormError('');
      showFieldError('title', '');
      showFieldError('description', '');
      showFieldError('goal', '');

      const title = document.getElementById('title').value.trim();
      const description = document.getElementById('description').value.trim();
      const goalRaw = document.getElementById('goal').value;
      const goal = Number(goalRaw);

      // Validation rules
      if (!title) {
        showFieldError('title', 'Title is required');
      } else if (title.length > 100) {
        showFieldError('title', 'Title must be 100 characters or fewer');
      }

      if (!description) {
        showFieldError('description', 'Description is required');
      } else if (description.length > 1000) {
        showFieldError('description', 'Description must be 1000 characters or fewer');
      }

      if (!goalRaw) {
        showFieldError('goal', 'Funding goal is required');
      } else if (Number.isNaN(goal) || goal <= 0) {
        showFieldError('goal', 'Enter a valid goal greater than 0');
      }

      // Focus first invalid
      const firstError = form.querySelector('[aria-invalid="true"]');
      if (firstError) {
        firstError.focus();
        showFormError('Please fix the highlighted errors and try again.');
        return;
      }

      try {
        const resp = await fetch('/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, goal })
        });
        const data = await resp.json();
        if (resp.status === 201 && data.campaign) {
          lastCampaignId = data.campaign.id;
          // Provide success feedback inline instead of alert
          showFormError('Campaign created. You can now click Checkout to pay the listing fee.');
          form.reset();
        } else {
          const err = data.error || 'Failed to create campaign';
          showFormError(err);
        }
      } catch (err) {
        console.error(err);
        showFormError('Error creating campaign. Please try again.');
      }
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async function (e) {
      e.preventDefault();
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Redirecting...';
      try {
        const body = lastCampaignId ? { campaignId: lastCampaignId } : { amount: 5000 };
        const resp = await fetch('/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await resp.json();
        if (data.sessionId) {
          const stripe = Stripe(data.publicKey || '');
          await stripe.redirectToCheckout({ sessionId: data.sessionId });
        } else {
          showFormError('Failed to create checkout session');
          checkoutBtn.disabled = false;
          checkoutBtn.textContent = 'Pay Listing Fee / Continue to Checkout';
        }
      } catch (err) {
        console.error(err);
        showFormError('An error occurred creating payment session');
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Pay Listing Fee / Continue to Checkout';
      }
    });
  }
});