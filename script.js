document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || '';
  let userEmail = null;

  function showMessage(msg, {
    elementId = "status-message",
    success = true,
    duration = null,
    focus = false
  } = {}) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = msg;
      el.classList.remove("hidden", "success", "error");
      el.classList.add(success ? "success" : "error");
      el.setAttribute("role", "status");
      el.style.color = "";
      if (focus) el.focus();
      if (duration) {
        setTimeout(() => {
          el.classList.add("hidden");
          el.textContent = "";
        }, duration);
      } else {
        el.classList.remove("hidden");
      }
    } else {
      alert(msg);
    }
  }

  function initGoogleSignIn() {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      console.log("Google Identity Services loaded.");
      google.accounts.id.initialize({
        client_id: '250943951703-sbgdp0c7f7mvvp2q5o705dolc8j4i9tf.apps.googleusercontent.com',
        callback: handleCredentialResponse,
        ux_mode: 'popup'
      });
      const gBtn = document.getElementById("g_id_signin");
      if (gBtn) {
        google.accounts.id.renderButton(gBtn, {
          theme: "outline",
          size: "large",
          width: "300",
          locale: "ar"
        });
      }
    } else {
      showMessage("❌ خدمة تسجيل الدخول بـ Google غير متوفرة.", { elementId: "error-message", success: false, focus: true });
    }
  }

  function handleCredentialResponse(response) {
    fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + response.credential)
      .then(res => {
        if (!res.ok) throw new Error(`Google token error ${res.status}`);
        return res.json();
      })
      .then(data => {
        userEmail = data.email;
        if (typeof Sentry !== 'undefined' && Sentry.setUser) {
          Sentry.setUser({ email: userEmail });
        }

        document.body.classList.remove("login-mode");
        document.getElementById('google-login-container')?.remove();
        document.getElementById('form-and-buttons-container')?.classList.remove('hidden');

        setupPhoneInput();
        setupFormSubmit();

        console.log("Login successful:", userEmail);
      })
      .catch(err => {
        showMessage("❌ حدث خطأ أثناء التحقق من تسجيل الدخول بـ Google", { success: false, focus: true, duration: 10000 });
        if (typeof Sentry !== 'undefined') Sentry.captureException?.(err);
      });
  }

  function setupPhoneInput() {
    const phoneInput = document.getElementById("phone");
    if (!phoneInput) return;
    phoneInput.addEventListener("focus", () => {
      if (!phoneInput.value.startsWith("9715")) phoneInput.value = "9715";
    });
    phoneInput.addEventListener("keydown", e => {
      const prefix = "9715";
      if (phoneInput.selectionStart !== null && phoneInput.selectionStart < prefix.length &&
          (e.key === "Backspace" || e.key === "Delete")) {
        e.preventDefault();
      }
      if (e.key.length === 1 && phoneInput.selectionStart < prefix.length) {
        e.preventDefault();
      }
      if (phoneInput.selectionStart >= prefix.length && !/\d/.test(e.key) &&
          !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Home", "End", "Tab"].includes(e.key)) {
        e.preventDefault();
      }
    });
    phoneInput.addEventListener("paste", e => {
      const data = e.clipboardData.getData('text');
      if (!data.startsWith("9715")) e.preventDefault();
    });
  }

  function isValidPhone(phone) {
    return /^9715\d{8}$/.test(phone);
  }

  function setupFormSubmit() {
    const form = document.getElementById("attendance-form");
    const phoneInput = document.getElementById("phone");
    const usernameInput = document.getElementById("username");

    if (!form || !phoneInput || !usernameInput) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = usernameInput.value.trim();
      const phone = phoneInput.value.trim();
      const action = e.submitter?.value;

      if (!name || !phone) {
        showMessage("❗ الرجاء تعبئة الاسم ورقم الجوال.", { success: false, focus: true, duration: 5000 });
        return;
      }

      if (!isValidPhone(phone)) {
        showMessage("❗ الرقم غير صحيح بصيغة 9715XXXXXXXX.", { success: false, focus: true, duration: 5000 });
        return;
      }

      let payload = {};
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => {
          payload = {
            email: userEmail,
            name,
            phone,
            fingerprint: window.userFingerprint,
            operation: action,
            token,
            ip: data.ip
          };
          return fetch('https://script.google.com/macros/s/AKfycby02ie58KVNwgkmvsLt_IaXnwtJkitKoEcyFIXaplElxGQ6Y9MJ-7_fViZdjq81fxPvgw/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
          });
        })
        .then(res => res.json())
        .then(data => {
          if (data && data.success) {
            showMessage("✅ تم التسجيل بنجاح", { success: true, duration: 5000 });
          } else {
            showMessage("❌ فشل التسجيل", { success: false, duration: 5000 });
          }
        })
        .catch(err => {
          console.error(err);
          showMessage("❌ حدث خطأ أثناء الإرسال.", { success: false, duration: 5000 });
          if (typeof Sentry !== 'undefined') {
            Sentry.captureException?.(err, { extra: { payload } });
          }
        });
    });
  }

  initGoogleSignIn();
});
