// script.js
const mapping = {
  entitiesBtn: 'entity.html',
  wellsBtn:    'wells.html',
  tanksBtn:    'tanks.html',
  formationsBtn:'dropdown.html',
};

Object.keys(mapping).forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener('click', () => window.location.href = mapping[id]);
  el.addEventListener('keypress', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      window.location.href = mapping[id];
    }
  });
});