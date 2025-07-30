// يتم تشغيل الكود بعد تحميل عناصر DOM بالكامل
document.addEventListener('DOMContentLoaded', () => {

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || '';

    let userFingerprint = null; // سيتم محاولة الحصول عليها بشكل غير حاسم
    let userEmail = null;       // سيتم الحصول عليها بعد تسجيل الدخول بـ Google

    // 2. محاولة الحصول على بصمة الجهاز بشكل غير حاسم
    // (لن تمنع بقية السكريبت من العمل إذا فشلت)
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
                        userFingerprint = 'unavailable'; // تعيين قيمة افتراضية أو تركها null
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

    // 3. تهيئة Google Sign-In - يتم إجراؤها بعد تحميل DOM مباشرة
    // (تفترض أن مكتبة Google تم تحميلها في HTML)
    function initGoogleSignIn() {
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
                    // زر Google SignIn يكون مرئيًا في البداية
                    googleSignInButton.classList.remove('hidden'); // تأكيد أنه مرئي إذا بدأ مخفيًا
               } else {
                    console.error("Element with ID 'g_id_signin' not found.");
               }
         } else {
              console.error("Google Identity Services library not loaded.");
              // ربما إظهار رسالة خطأ للمستخدم هنا
              const errorMessageElement = document.getElementById('error-message');
              if(errorMessageElement){
                   errorMessageElement.textContent = "خدمة تسجيل الدخول بـ Google غير متوفرة.";
                   errorMessageElement.classList.remove('hidden');
              }
         }
    }

    // 4. التعامل مع استجابة Google Credential - يتم استدعاؤها بعد نجاح تسجيل الدخول
    function handleCredentialResponse(response) {
        fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + response.credential)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error fetching token info! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                userEmail = data.email;
                console.log("User logged in with email:", userEmail);

                // إخفاء زر Google وإظهار حقول النموذج وأزرار الحضور/الانصراف
                const googleSignInButton = document.getElementById('g_id_signin');
                const buttonsContainer = document.getElementById('buttons-container');
                const formFieldsContainer = document.getElementById('form-fields'); // الحصول على حاوية حقول النموذج

                if (googleSignInButton) {
                     googleSignInButton.classList.add('hidden');
                } else {
                     console.warn("Element with ID 'g_id_signin' not found after Google sign-in.");
                }

                if (buttonsContainer) {
                     buttonsContainer.classList.remove('hidden'); // إظهار الأزرار
                } else {
                     console.warn("Element with ID 'buttons-container' not found after Google sign-in.");
                }

                if (formFieldsContainer) {
                    formFieldsContainer.classList.remove('hidden'); // إظهار حقول النموذج
                } else {
                    console.warn("Element with ID 'form-fields' not found after Google sign-in.");
                }

                 // الآن بعد ظهور حقول النموذج، يمكن إضافة معالجات الأحداث لحقل الهاتف
                 setupPhoneInput(); // استدعاء الدالة لتهيئة حقل الهاتف بعد ظهوره
                 setupCheckButtons(); // استدعاء الدالة لتهيئة الأزرار بعد ظهورها

            })
            .catch(err => {
                console.error("Error fetching Google token info:", err);
                alert("❌ حدث خطأ أثناء التحقق من تسجيل الدخول بـ Google.");
                // ربما إظهار رسالة خطأ أخرى هنا
                 const errorMessageElement = document.getElementById('error-message');
                 if(errorMessageElement){
                      errorMessageElement.textContent = "فشل التحقق من معلومات تسجيل الدخول بـ Google.";
                      errorMessageElement.classList.remove('hidden');
                 }
            });
    }

    // 5. إعداد حقل الهاتف - يتم استدعاؤها بعد إظهار حقول النموذج
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

    // دالة التحقق من صحة رقم الهاتف (تبقى كما هي)
    function isValidPhone(p) {
        return /^9715\d{8}$/.test(p);
    }

    // 6. إعداد معالجات أحداث لأزرار Check-in/Check-out - يتم استدعاؤها بعد إظهار الأزرار
    function setupCheckButtons() {
        ['check-in', 'check-out'].forEach(id => {
            const button = document.getElementById(id);
            const phoneInput = document.getElementById("phone"); // الحصول على حقل الهاتف هنا أيضا
            const usernameInput = document.getElementById("username"); // الحصول على حقل الاسم

            if (button && phoneInput && usernameInput) { // التأكد من وجود جميع العناصر المطلوبة
                button.addEventListener('click', () => {
                    const name = usernameInput.value.trim();
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
                        token,
                        fingerprint: userFingerprint, // قد يكون null أو 'unavailable' أو 'failed'
                        email: userEmail,           // يجب أن يكون موجودا بعد Google Sign-In
                        name,
                        phone,
                        ip: null // لا يزال null في هذا الكود
                    };

                    // إرسال البيانات إلى Google Apps Script
                    fetch('https://script.google.com/macros/s/AKfycby02ie58KVNwgkmvsLt_IaXnwtJkitKoEcyFIXaplElxGQ6Y9MJ-7_fViZdjq81fxPvgw/exec', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    })
                    .then(r => {
                         if (!r.ok) {
                             throw new Error(`Google Script HTTP error! status: ${r.status}`);
                         }
                         return r.json();
                     })
                    .then(data => {
                        if (data && typeof data.success !== 'undefined') {
                            alert(data.success ? "✅ تم التسجيل بنجاح" : "❌ فشل التسجيل");
                        } else {
                            alert("⚠️ تم الإرسال، ولكن استجابة الخادم غير متوقعة.");
                            console.warn("Unexpected response from Google Script:", data);
                        }
                    })
                    .catch(err => {
                        console.error("Error sending data to Google Script:", err);
                        alert("❌ حدث خطأ أثناء الإرسال:\n" + err.message);
                        console.error("تفاصيل الخطأ:", err);
                    });
                });
            } else {
                 // تسجيل أي عنصر مفقود لمنع الخطأ عند إضافة الحدث
                 if (!button) console.error(`Element with ID '${id}' not found for setup.`);
                 if (!phoneInput) console.error("Element with ID 'phone' not found for button setup.");
                 if (!usernameInput) console.error("Element with ID 'username' not found for button setup.");
            }
        });
    }

    // ابدأ عملية تهيئة Google Sign-In فور تحميل DOM
    initGoogleSignIn();

}); // نهاية DOMContentLoaded event listener
