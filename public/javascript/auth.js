// /public/javascript/auth.js
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (token) {
    fetch("/api/user/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((user) => {
        if (user.name) {
          document.querySelectorAll(".user-name").forEach(
            (el) => (el.textContent = `Welcome, ${user.name}!`)
          );
        }
      })
      .catch(() => console.warn("User not logged in."));
  }
});
