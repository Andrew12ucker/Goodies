// about.js - About Page Interactivity

document.addEventListener("DOMContentLoaded", () => {
  console.log("About.js loaded ✅");

  // --- Mobile Navigation Toggle ---
  // Mobile navigation toggle is handled centrally by javascript/header.js

  // --- Smooth Scroll for Team Section Links ---
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

  // --- Example Interactive Feature: Team Card Hover ---
  const teamCards = document.querySelectorAll(".team-card");
  teamCards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.classList.add("highlight");
    });
    card.addEventListener("mouseleave", () => {
      card.classList.remove("highlight");
    });
  });
});
