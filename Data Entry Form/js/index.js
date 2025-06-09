document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll(".password-protected");
  const modal = document.getElementById("passwordModal");
  const passwordInput = document.getElementById("modalPasswordInput");
  const submitBtn = document.getElementById("modalSubmitBtn");
  const cancelBtn = document.getElementById("modalCancelBtn");
  const errorMsg = document.getElementById("modalErrorMsg");

  let targetPage = "";
  let correctPassword = "";

  links.forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault(); // ⛔️ Prevents link from opening index.html
      targetPage = link.getAttribute("data-page");
      correctPassword = link.getAttribute("data-password");

      modal.style.display = "block";
      modal.setAttribute("aria-hidden", "false");
      passwordInput.value = "";
      errorMsg.style.display = "none";
      passwordInput.focus();
    });
  });

  submitBtn.addEventListener("click", () => {
    if (passwordInput.value === correctPassword) {
      window.location.href = targetPage;
    } else {
      errorMsg.style.display = "block";
    }
  });

  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  });

  // Optional: close modal on Esc key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    }
  });
});
