// geo.js - simple geolocation helper for directory filtering
(function(){
  async function findNearby() {
    const output = document.getElementById('directoryResults');
    if (!output) return;
    output.textContent = 'Locating...';

    if (!('geolocation' in navigator)) {
      output.textContent = 'Geolocation not supported by your browser.';
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      output.textContent = `Searching near ${lat.toFixed(4)}, ${lon.toFixed(4)}...`;

      // Placeholder: integrate with Google Places or your own dataset
      // Example: call your server endpoint /places?lat=..&lon=..
      try {
        const resp = await fetch(`/places?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
        if (!resp.ok) {
          output.textContent = 'Failed fetching nearby places.';
          return;
        }
        const data = await resp.json();
        if (!Array.isArray(data.results) || data.results.length === 0) {
          output.textContent = 'No nearby results found.';
          return;
        }
        output.innerHTML = '';
        data.results.slice(0,10).forEach(item => {
          const div = document.createElement('div');
          div.className = 'business-card';
          div.innerHTML = `<h3>${item.name}</h3><p>${item.vicinity || item.address || ''}</p>`;
          output.appendChild(div);
        });
      } catch (err) {
        console.error(err);
        output.textContent = 'Error searching nearby.';
      }
    }, (err) => {
      output.textContent = 'Location error: ' + err.message;
    }, { timeout: 10000 });
  }

  function install() {
    const btn = document.getElementById('findNearby');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); findNearby(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
  window.GoodiesGeo = { findNearby };
})();
