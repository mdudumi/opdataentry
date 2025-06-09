const modal = document.getElementById('passwordModal');
const passwordInput = document.getElementById('modalPasswordInput');
const submitBtn = document.getElementById('modalSubmitBtn');
const cancelBtn = document.getElementById('modalCancelBtn');
const errorMsg = document.getElementById('modalErrorMsg');

let targetPage = null;
let targetPassword = null;

const protectedLinks = document.querySelectorAll('.password-protected');

protectedLinks.forEach(link => {
  link.addEventListener('click', function(event) {
    event.preventDefault();
    targetPage = this.getAttribute('data-page');
    targetPassword = this.getAttribute('data-password');
    openModal();
  });
});

function openModal() {
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  passwordInput.value = '';
  errorMsg.style.display = 'none';
  passwordInput.focus();
}

function closeModal() {
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  errorMsg.style.display = 'none';
  targetPage = null;
  targetPassword = null;
}

submitBtn.addEventListener('click', function() {
  const entered = passwordInput.value;
  if (entered === targetPassword) {
    closeModal();
    if (targetPage) {
      window.location.href = targetPage;
    }
  } else {
    errorMsg.style.display = 'block';
    passwordInput.value = '';
    passwordInput.focus();
  }
});

cancelBtn.addEventListener('click', function() {
  closeModal();
});

passwordInput.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    submitBtn.click();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    closeModal();
  }
});

modal.addEventListener('click', function(event) {
  if (event.target === modal) {
    closeModal();
  }
});
