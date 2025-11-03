// directory.js - Directory Page Interactivity

document.addEventListener("DOMContentLoaded", () => {
  console.log("Directory.js loaded ✅");

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

  // --- Directory Search / Filter ---
  const searchInput = document.querySelector("#directorySearch");
  const businessCards = document.querySelectorAll(".business-card");

  if (searchInput && businessCards.length > 0) {
    searchInput.addEventListener("keyup", (e) => {
      const query = e.target.value.toLowerCase();
      businessCards.forEach((card) => {
        const name = card.querySelector("h3")?.textContent.toLowerCase() || "";
        const location = card.querySelector(".location")?.textContent.toLowerCase() || "";
        
        if (name.includes(query) || location.includes(query)) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    });
  }

  // --- Placeholder for future API Integration (e.g. Google Maps, Yelp, etc.) ---
  // Example: Fetch nearby businesses based on ZIP code
  // fetch(`/api/businesses?zip=${userZip}`).then(res => res.json()).then(data => { ... });
});
