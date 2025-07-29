const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token') || '';
let userFingerprint = null, userEmail = null;

new QRCode(document.getElementById("qr-placeholder"), {
  text: window.location.href,
  width: 256,
  height: 256
});

import('https://openfpcdn.io/fingerprintjs/v4')
  .then(FingerprintJS => FingerprintJS.load())
  .then(fp => fp.get())
  .then(res => {
    userFingerprint = res.visitorId;
    initGoogleSignIn();
  });

function initGoogleSignIn() {
  google.accounts.id.initialize({
    client_id: '250943951703-sbgdp0c7f7mvvp2q5o705dolc8j4i9tf.apps.googleusercontent.com',
    callback: handleCredentialResponse,
    ux_mode: 'popup'
  });
  google.accounts.id.renderButton(document.getElementById('g_id_signin'), {
    theme: 'outline', size: 'large', locale: 'ar'
  });
}

function handleCredentialResponse(response) {
  fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + response.credential)
    .then(res => res.json())
    .then(data => {
      userEmail = data.email;
      document.getElementById('g_id_signin').classList.add('hidden');
      document.getElementById('buttons-container').classList.remove('hidden');
    });
}

const phoneInput = document.getElementById("phone");
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

function isValidPhone(p) {
  return /^9715\d{8}$/.test(p);
}

['check-in', 'check-out'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    const name = document.getElementById("username").value.trim();
    const phone = phoneInput.value.trim();
    if (!name || !phone) {
      alert("❗ الرجاء تعبئة الاسم ورقم الجوال.");
      return;
    }
    if (!isValidPhone(phone)) {
      alert("❗ الرقم غير صحيح بصيغة 9715XXXXXXXX.");
      return;
    }
    const payload = {
      operation: id === 'check-in' ? 'check-in' : 'check-out',
      token, fingerprint: userFingerprint, email: userEmail,
      name, phone, ip: null
    };
    fetch('https://script.google.com/macros/s/AKfycbzVkJOdbGyQQ9trP3YiCN3bXkBEop7sc9y1OSWs13LtvytuRO7apVlyEuSsAePKGHeIYA/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
      alert(data.success ? "✅ تم التسجيل بنجاح" : "❌ فشل التسجيل");
    })
    .catch(err => {
      console.error(err);
      alert("❌ حدث خطأ أثناء الإرسال");
    });
  });
});
