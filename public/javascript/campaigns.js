document.addEventListener("DOMContentLoaded", () => {
  console.log("Dashboard ready.");

  // Animate progress bars for each campaign card
  const cards = document.querySelectorAll('.campaign-card[data-raised][data-goal]');
  cards.forEach((card) => {
    const raised = Number(card.getAttribute('data-raised')) || 0;
    const goal = Number(card.getAttribute('data-goal')) || 0;
    const percent = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

    const fill = card.querySelector('.progress-bar-fill');
    const percentEl = card.querySelector('.progress-percent');
    const ariaBar = card.querySelector('.progressbar[role="progressbar"]');

    // Animate numeric counter and width
    let start = null;
    const duration = 900; // ms
    const startPercent = 0;

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const t = Math.min(1, elapsed / duration);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad-ish
      const current = Math.round(startPercent + (percent - startPercent) * eased);

      if (fill) fill.style.width = current + '%';
      if (percentEl) percentEl.textContent = current + '%';
      if (ariaBar) ariaBar.setAttribute('aria-valuenow', String(current));

      if (elapsed < duration) {
        window.requestAnimationFrame(step);
      } else {
        // ensure final state
        if (fill) fill.style.width = percent + '%';
        if (percentEl) percentEl.textContent = percent + '%';
        if (ariaBar) ariaBar.setAttribute('aria-valuenow', String(percent));
      }
    };

    window.requestAnimationFrame(step);
  });
});
