const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token') || '';
let userFingerprint = null;
let userEmail = null;

// QR code
new QRCode(document.getElementById("qr-placeholder"), {
  text: `${window.location.origin}/attend.html?token=${token}`,
  width: 256,
  height: 256
});

// FingerprintJS
const fpPromise = import('https://openfpcdn.io/fingerprintjs/v4')
  .then(FingerprintJS => FingerprintJS.load());

fpPromise.then(fp => fp.get()).then(result => {
  userFingerprint = result.visitorId;
  initGoogleSignIn();
});

function initGoogleSignIn() {
  google.accounts.id.initialize({
    client_id: '250943951703-sbgdp0c7f7mvvp2q5o705dolc8j4i9tf.apps.googleusercontent.com',
    callback: handleCredentialResponse,
    auto_select: false,
    ux_mode: 'popup'
  });

  google.accounts.id.renderButton(
    document.getElementById('g_id_signin'),
    { theme: 'outline', size: 'large', text: 'signin', locale: 'ar' }
  );
}

function handleCredentialResponse(response) {
  fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + response.credential)
    .then(res => res.json())
    .then(data => {
      userEmail = data.email;
      document.getElementById('g_id_signin').classList.add('hidden');
      checkTokenValidity();
    });
}

function checkTokenValidity() {
  fetch('/api/validate_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, email: userEmail, fingerprint: userFingerprint })
  })
  .then(res => res.json())
  .then(data => {
    if (data.valid && data.email === userEmail && data.fingerprint === userFingerprint) {
      document.getElementById('buttons-container').classList.remove('hidden');
    } else {
      document.getElementById('error-message').textContent = "❌ محاولة غير مصرح بها – هذا الرابط لا يخصك أو تم استخدامه من جهاز مختلف.";
      document.getElementById('error-message').classList.remove('hidden');
    }
  });
}

// التعامل مع الهاتف
const phoneInput = document.getElementById("phone");

phoneInput.addEventListener("focus", () => {
  if (!phoneInput.value.startsWith("9715")) {
    phoneInput.value = "9715";
  }
});

phoneInput.addEventListener("keydown", function (e) {
  const prefix = "9715";
  if (phoneInput.selectionStart < prefix.length && (e.key === "Backspace" || e.key === "Delete")) {
    e.preventDefault();
  }
});

function isValidPhone(phone) {
  return /^9715\d{8}$/.test(phone);
}

// أزرار الحضور والانصراف
['check-in', 'check-out'].forEach(buttonId => {
  document.getElementById(buttonId).addEventListener('click', () => {
    const name = document.getElementById("username").value.trim();
    const phone = document.getElementById("phone").value.trim();

    if (!name || !phone) {
      alert("❗ الرجاء تعبئة الاسم ورقم الجوال قبل المتابعة.");
      return;
    }

    if (!isValidPhone(phone)) {
      alert("❗ يرجى إدخال رقم جوال صحيح بصيغة 9715XXXXXXXX.");
      return;
    }

    const payload = {
      operation: buttonId === 'check-in' ? 'check-in' : 'check-out',
      token,
      fingerprint: userFingerprint,
      email: userEmail,
      ip: null,
      name,
      phone
    };

    fetch('/api/attend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("✅ تم التسجيل بنجاح.");
      } else {
        alert(data.message || "حدث خطأ أثناء الإرسال.");
      }
    });
  });
});
