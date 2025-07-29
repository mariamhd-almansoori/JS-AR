// هذا الكود يتم تنفيذه بعد تحميل عناصر HTML بالكامل
document.addEventListener('DOMContentLoaded', () => {

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || '';
    let userFingerprint = null, userEmail = null;

    // التحقق من وجود العنصر قبل محاولة إنشاء QR Code
    const qrPlaceholder = document.getElementById("qr-placeholder");
    if (qrPlaceholder) {
        new QRCode(qrPlaceholder, {
            text: window.location.href,
            width: 256,
            height: 256
        });
    } else {
        console.error("Element with ID 'qr-placeholder' not found.");
    }


    // تحميل FingerprintJS بشكل ديناميكي ومعالجة النتيجة أو الخطأ
    import('https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.min.js')
        .then(FingerprintJS => {
            // تأكد من أن التحميل كان ناجحًا وأن FingerprintJS متاح
            if (FingerprintJS && FingerprintJS.load) {
                 FingerprintJS.load()
                    .then(fp => fp.get())
                    .then(result => {
                        userFingerprint = result.visitorId;
                        // استدعاء تهيئة Google Sign-In بعد الحصول على بصمة الجهاز
                        // (يمكن استدعاؤها هنا أو خارج هذا الـ block اعتمادًا على المنطق المطلوب)
                         initGoogleSignIn();
                    })
                    .catch(err => {
                        console.error("Error getting fingerprint:", err);
                        // استدعاء تهيئة Google Sign-In حتى لو فشلت بصمة الجهاز
                        initGoogleSignIn();
                    });
            } else {
                 console.error("FingerprintJS library not loaded correctly.");
                 // استدعاء تهيئة Google Sign-In حتى لو فشلت المكتبة
                 initGoogleSignIn();
            }
        })
        .catch(err => {
            console.error('Failed to load FingerprintJS module:', err);
            // استدعاء تهيئة Google Sign-In حتى لو فشل تحميل الموديل
            initGoogleSignIn();
        });


    // دالة لتهيئة Google Sign-In - سيتم استدعاؤها بعد محاولة الحصول على بصمة الجهاز
    // أو مباشرة إذا لم تكن بصمة الجهاز ضرورية لتشغيل Google Sign-In
    function initGoogleSignIn() {
         // التحقق من وجود الكائن google ومن وجود google.accounts.id
         // هذا يعتمد على أنه تم تحميل مكتبة Google Sign-In في ملف الـ HTML
         if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
              google.accounts.id.initialize({
                client_id: '250943951703-sbgdp0c7f7mvvp2q5o705dolc8j4i9tf.apps.googleusercontent.com',
                callback: handleCredentialResponse,
                ux_mode: 'popup' // أو 'redirect' حسب الحاجة
              });
               const googleSignInButton = document.getElementById('g_id_signin');
               if (googleSignInButton) {
                    google.accounts.id.renderButton(googleSignInButton, {
                      theme: 'outline', size: 'large', locale: 'ar'
                    });
               } else {
                    console.error("Element with ID 'g_id_signin' not found.");
               }
         } else {
              console.error("Google Identity Services library not loaded.");
         }
    }

    // دالة التعامل مع استجابة Google Credential
    function handleCredentialResponse(response) {
        fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + response.credential)
            .then(res => {
                if (!res.ok) { // التحقق من حالة الاستجابة
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                userEmail = data.email;
                const googleSignInButton = document.getElementById('g_id_signin');
                const buttonsContainer = document.getElementById('buttons-container');

                if (googleSignInButton) {
                     googleSignInButton.classList.add('hidden');
                } else {
                     console.warn("Element with ID 'g_id_signin' not found after Google sign-in.");
                }
                if (buttonsContainer) {
                     buttonsContainer.classList.remove('hidden');
                } else {
                     console.warn("Element with ID 'buttons-container' not found after Google sign-in.");
                }
            })
            .catch(err => {
                console.error("Error fetching Google token info:", err);
                alert("❌ حدث خطأ أثناء التحقق من تسجيل الدخول بـ Google.");
            });
    }

    // التحكم في إدخال رقم الهاتف
    const phoneInput = document.getElementById("phone");
    if (phoneInput) { // التحقق من وجود العنصر
        phoneInput.addEventListener("focus", () => {
            if (!phoneInput.value.startsWith("9715")) phoneInput.value = "9715";
        });
        phoneInput.addEventListener("keydown", e => {
            const prefix = "9715";
            // التحقق من عدم حذف بداية الرقم
            if (phoneInput.selectionStart < prefix.length &&
                (e.key === "Backspace" || e.key === "Delete")) {
                e.preventDefault();
            }
             // منع إدخال غير الأرقام بعد البداية (اختياري، يمكن إضافته لتحسين التحقق)
             // if (phoneInput.selectionStart >= prefix.length && isNaN(parseInt(e.key)) && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
             //     e.preventDefault();
             // }
        });
    } else {
        console.error("Element with ID 'phone' not found.");
    }


    // دالة التحقق من صحة رقم الهاتف
    function isValidPhone(p) {
        return /^9715\d{8}$/.test(p);
    }

    // إضافة معالجات أحداث لأزرار Check-in/Check-out
    ['check-in', 'check-out'].forEach(id => {
        const button = document.getElementById(id);
        if (button) { // التحقق من وجود العنصر
            button.addEventListener('click', () => {
                const nameInput = document.getElementById("username");
                const name = nameInput ? nameInput.value.trim() : ''; // التحقق من وجود العنصر
                const phone = phoneInput ? phoneInput.value.trim() : ''; // phoneInput تم التحقق منه سابقًا

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
                    token,
                    fingerprint: userFingerprint, // قد يكون null إذا فشلت بصمة الجهاز
                    email: userEmail,           // قد يكون null إذا لم يتم تسجيل الدخول بـ Google
                    name,
                    phone,
                    ip: null // هذا الحقل هو null دائمًا في الكود الحالي
                };

                // إرسال البيانات إلى Google Apps Script
                fetch('https://script.google.com/macros/s/AKfycbzVkJOdbGyQQ9trP3YiCN3bXkBEop7sc9y1OSWs13LtvytuRO7apVlyEuSsAePKGHeIYA/exec', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(r => {
                     if (!r.ok) { // التحقق من حالة الاستجابة من Google Script
                         throw new Error(`Google Script HTTP error! status: ${r.status}`);
                     }
                     return r.json();
                 })
                .then(data => {
                    // يجب أن يحتوي الرد من Google Script على حقل 'success'
                    if (data && typeof data.success !== 'undefined') {
                        alert(data.success ? "✅ تم التسجيل بنجاح" : "❌ فشل التسجيل");
                    } else {
                        // التعامل مع حالة لم يعد فيها الرد بالشكل المتوقع
                        alert("⚠️ تم الإرسال، ولكن استجابة الخادم غير متوقعة.");
                        console.warn("Unexpected response from Google Script:", data);
                    }
                })
                .catch(err => {
                    console.error("Error sending data to Google Script:", err);
                    alert("❌ حدث خطأ أثناء الإرسال");
                });
            });
        } else {
            console.error(`Element with ID '${id}' not found.`);
        }
    });

}); // نهاية DOMContentLoaded event listener
