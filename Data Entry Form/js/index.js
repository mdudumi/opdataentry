document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('passwordModal');
  const passwordInput = document.getElementById('modalPasswordInput');
  const submitBtn = document.getElementById('modalSubmitBtn');
  const cancelBtn = document.getElementById('modalCancelBtn');
  const errorMsg = document.getElementById('modalErrorMsg');

  let targetPage = null;
  let targetPassword = null;

  // Open the modal and set up target page/password
  function openModal(page, password) {
    targetPage = page;
    targetPassword = password;
    errorMsg.style.display = 'none';
    passwordInput.value = '';
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'block';
    passwordInput.focus();
  }

  // Close the modal and reset targets
  function closeModal() {
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
    targetPage = null;
    targetPassword = null;
  }

  // Attach click handlers to all password-protected links
  document.querySelectorAll('.password-protected').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      openModal(link.getAttribute('data-page'), link.getAttribute('data-password'));
    });
  });

  // Handle submit button
  submitBtn.addEventListener('click', () => {
    const entered = passwordInput.value;
    if (entered === targetPassword) {
      // Redirect before clearing modal state
      if (targetPage) {
        window.location.href = targetPage;
      }
    } else {
      errorMsg.style.display = 'block';
      passwordInput.value = '';
      passwordInput.focus();
    }
  });

  // Handle cancel button
  cancelBtn.addEventListener('click', () => {
    closeModal();
  });

  // Close modal on Escape key
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      closeModal();
    }
  });

  // Trap focus inside modal
  modal.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const focusable = Array.from(modal.querySelectorAll('button, input'));
      const index = focusable.indexOf(document.activeElement);
      if (event.shiftKey) {
        // Move focus backward
        if (index === 0) {
          event.preventDefault();
          focusable[focusable.length - 1].focus();
        }
      } else {
        // Move focus forward
        if (index === focusable.length - 1) {
          event.preventDefault();
          focusable[0].focus();
        }
      }
    }
  });
});
