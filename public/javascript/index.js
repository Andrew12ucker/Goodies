// index.js - Homepage Interactivity
document.addEventListener("DOMContentLoaded", () => {
  console.log("Index.js loaded ✅");

  // --- Mobile Navigation Toggle ---
  // Mobile navigation toggle is handled centrally by javascript/header.js

  // --- Smooth Scroll for Anchor Links ---
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href");
      const target = document.querySelector(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // --- Simple Campaign Search ---
  const searchInput = document.querySelector("#campaignSearch");
  const campaignCards = document.querySelectorAll(".campaign-card");

  if (searchInput && campaignCards.length > 0) {
    searchInput.addEventListener("keyup", (e) => {
      const query = e.target.value.toLowerCase();
      campaignCards.forEach((card) => {
        const title = card.querySelector("h3")?.textContent.toLowerCase() || "";
        if (title.includes(query)) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    });
  }
});
