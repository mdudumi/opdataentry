// js/index.js
const modal = document.getElementById('passwordModal');
const passwordInput = document.getElementById('modalPasswordInput');
const submitBtn = document.getElementById('modalSubmitBtn');
const cancelBtn = document.getElementById('modalCancelBtn');
const errorMsg   = document.getElementById('modalErrorMsg');

let targetPage     = null;
let targetPassword = null;

document.querySelectorAll('.password-protected')
  .forEach(link => {
    link.addEventListener('click', function(event) {
      event.preventDefault();
      targetPage     = this.dataset.page;
      targetPassword = this.dataset.password;
      openModal();
    });
  });

function openModal() {
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  passwordInput.value    = '';
  errorMsg.style.display = 'none';
  passwordInput.focus();
}

function closeModal() {
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  errorMsg.style.display = 'none';
  targetPage = targetPassword = null;
}

submitBtn.addEventListener('click', () => {
  if (passwordInput.value === targetPassword) {
    closeModal();
    window.location.href = targetPage;
  } else {
    errorMsg.style.display = 'block';
    passwordInput.value = '';
    passwordInput.focus();
  }
});

cancelBtn.addEventListener('click', closeModal);
passwordInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    submitBtn.click();
  } else if (e.key === 'Escape') {
    closeModal();
  }
});
modal.addEventListener('click', e => {
  if (e.target === modal) closeModal();
});
