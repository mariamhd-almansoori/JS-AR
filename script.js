document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || '';
  let userFingerprint = null;
  let userEmail = null;

  // دالة عرض الرسائل داخل الصفحة
  function showMessage(msg, success = true) {
    const el = document.getElementById("status-message");
    if (el) {
      el.textContent = msg;
      el.style.color = success ? "green" : "red";
      el.classList.remove("hidden");
    } else {
      alert(msg); // fallback
    }
  }

  // بصمة الجهاز
  import('https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.min.js')
    .then(FingerprintJS => {
      if (FingerprintJS && FingerprintJS.load) {
        FingerprintJS.load()
          .then(fp => fp.get())
          .then(result => {
            userFingerprint = result.visitorId;
            console.log("Fingerprint obtained:", userFingerprint);
          })
          .catch(err => {
            console.error("Error getting fingerprint:", err);
            userFingerprint = 'unavailable';
          });
      } else {
        console.error("FingerprintJS library not loaded correctly.");
        userFingerprint = 'load_failed';
      }
    })
    .catch(err => {
      console.error('Failed to load FingerprintJS module:', err);
      userFingerprint = 'import_failed';
    });

  // تسجيل الدخول بـ Google
  function initGoogleSignIn() {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      google.accounts.id.initialize({
        client_id: '250943951703-sbgdp0c7f7mvvp2q5o705dolc8j4i9tf.apps.googleusercontent.com',
        callback: handleCredentialResponse,
        ux_mode: 'popup'
      });

      const googleSignInButton = document.getElementById('g_id_signin');
      if (googleSignInButton) {
        google.accounts.id.renderButton(googleSignInButton, {
          theme: 'outline', size: 'large', locale: 'ar'
        });
        googleSignInButton.classList.remove('hidden');
      } else {
        console.error("Element with ID 'g_id_signin' not found.");
      }
    } else {
      console.error("Google Identity Services library not loaded.");
      const errorMessageElement = document.getElementById('error-message');
      if (errorMessageElement) {
        errorMessageElement.textContent = "خدمة تسجيل الدخول بـ Google غير متوفرة.";
        errorMessageElement.classList.remove('hidden');
      }
    }
  }

  function handleCredentialResponse(response) {
    fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + response.credential)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error fetching token info! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        userEmail = data.email;
        console.log("User logged in with email:", userEmail);

        document.getElementById('g_id_signin')?.classList.add('hidden');
        document.getElementById('buttons-container')?.classList.remove('hidden');
        document.getElementById('form-fields')?.classList.remove('hidden');

        setupPhoneInput();
        setupCheckButtons();
      })
      .catch(err => {
        console.error("Error fetching Google token info:", err);
        showMessage("❌ حدث خطأ أثناء التحقق من تسجيل الدخول بـ Google", false);
        const errorMessageElement = document.getElementById('error-message');
        if (errorMessageElement) {
          errorMessageElement.textContent = "فشل التحقق من معلومات تسجيل الدخول بـ Google.";
          errorMessageElement.classList.remove('hidden');
        }
      });
  }

  function setupPhoneInput() {
    const phoneInput = document.getElementById("phone");
    if (phoneInput) {
      phoneInput.addEventListener("focus", () => {
        if (!phoneInput.value.startsWith("9715")) phoneInput.value = "9715";
      });
      phoneInput.addEventListener("keydown", e => {
        const prefix = "9715";
        if (phoneInput.selectionStart < prefix.length &&
            (e.key === "Backspace" || e.key === "Delete")) {
          e.preventDefault();
        }
      });
    } else {
      console.error("Element with ID 'phone' not found for setup.");
    }
  }

  function isValidPhone(p) {
    return /^9715\\d{8}$/.test(p);
  }

  function setupCheckButtons() {
    ['check-in', 'check-out'].forEach(id => {
      const button = document.getElementById(id);
      const phoneInput = document.getElementById("phone");
      const usernameInput = document.getElementById("username");

      if (button && phoneInput && usernameInput) {
        button.addEventListener('click', () => {
          const name = usernameInput.value.trim();
          const phone = phoneInput.value.trim();

          if (!name || !phone) {
            showMessage("❗ الرجاء تعبئة الاسم ورقم الجوال.", false);
            return;
          }

          if (!isValidPhone(phone)) {
            showMessage("❗ الرقم غير صحيح بصيغة 9715XXXXXXXX.", false);
            return;
          }

          const payload = {
            operation: id === 'check-in' ? 'check-in' : 'check-out',
            token,
            fingerprint: userFingerprint,
            email: userEmail,
            name,
            phone,
            ip: null
          };

          fetch('https://script.google.com/macros/s/AKfycby02ie58KVNwgkmvsLt_IaXnwtJkitKoEcyFIXaplElxGQ6Y9MJ-7_fViZdjq81fxPvgw/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          .then(r => {
            if (!r.ok) throw new Error(`Google Script HTTP error! status: ${r.status}`);
            return r.json();
          })
          .then(data => {
            if (data && typeof data.success !== 'undefined') {
              showMessage(data.success ? "✅ تم التسجيل بنجاح" : "❌ فشل التسجيل", data.success);
            } else {
              showMessage("⚠️ تم الإرسال، ولكن استجابة الخادم غير متوقعة.", false);
              console.warn("Unexpected response from Google Script:", data);
            }
          })
          .catch(err => {
            console.error("Error sending data to Google Script:", err);
            showMessage("❌ حدث خطأ أثناء الإرسال: " + err.message, false);
          });
        });
      } else {
        if (!button) console.error(`Element with ID '${id}' not found for setup.`);
        if (!phoneInput) console.error("Element with ID 'phone' not found for button setup.");
        if (!usernameInput) console.error("Element with ID 'username' not found for button setup.");
      }
    });
  }

  initGoogleSignIn();
});
