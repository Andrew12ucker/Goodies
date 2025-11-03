// ------------------------------------------------------------
// 🛠️ Frontend Maintenance Toggle (Admin UI)
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("maintenanceStatus");
  const enableBtn = document.getElementById("enableMaintenance");
  const disableBtn = document.getElementById("disableMaintenance");

  const ADMIN_KEY = "supersecureadminkey123"; // replace with secure fetch from server-side

  async function updateStatus() {
    const res = await fetch("/api/maintenance", {
      headers: { Authorization: `Bearer ${ADMIN_KEY}` },
    });
    const data = await res.json();
    statusEl.textContent = `Maintenance mode is ${
      data.maintenance ? "ACTIVE" : "INACTIVE"
    }.`;
  }

  enableBtn.addEventListener("click", async () => {
    await fetch("/api/maintenance/enable", {
      method: "POST",
      headers: { Authorization: `Bearer ${ADMIN_KEY}` },
    });
    updateStatus();
  });

  disableBtn.addEventListener("click", async () => {
    await fetch("/api/maintenance/disable", {
      method: "POST",
      headers: { Authorization: `Bearer ${ADMIN_KEY}` },
    });
    updateStatus();
  });

  updateStatus();
});
