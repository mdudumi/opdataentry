document.addEventListener('DOMContentLoaded', () => {
  // Map route zones to their secure passwords
  const zonePasswords = {
    south1: 'south1pass',
    north1: 'north1pass',
    central1: 'central1pass'
  };

  const form     = document.getElementById('loginForm');
  const errorMsg = document.getElementById('errorMsg');

  form.addEventListener('submit', e => {
    e.preventDefault();

    const zone     = form.routeZone.value;
    const zpass    = form.zonePassword.value;
    const email    = form.userEmail.value.trim();

    // Validation
    if (!zone || !zonePasswords[zone]) {
      errorMsg.textContent = 'Please select a valid zone.';
      return;
    }
    if (zpass !== zonePasswords[zone]) {
      errorMsg.textContent = 'Incorrect zone password.';
      return;
    }

    // Store for next page
    sessionStorage.setItem('userEmail', email);
    sessionStorage.setItem('routeZone', zone);

    // Redirect to the chosen zone's page
    window.location.href = `${zone}.html`;
  });
});
