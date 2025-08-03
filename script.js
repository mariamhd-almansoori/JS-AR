
// يتم تشغيل الكود بعد تحميل عناصر DOM بالكامل
document.addEventListener('DOMContentLoaded', () => {

  // بما أننا نستخدم Sentry الآن، قد تحتاج إلى استيراده إذا كنت تستخدم وحدات (Modules)
  // إذا كنت تستخدم <script src="script.js"> بدون type="module"، فلن تحتاج لهذا الاستيراد هنا
  // لأن Sentry سيكون متاحًا كمتغير عام (Global)
  // import * as Sentry from '@sentry/browser'; // قم بإلغاء التعليق إذا كنت تستخدم وحدات

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || '';
  let userFingerprint = null;
  let userEmail = null;

  // دالة عرض الرسائل داخل الصفحة
  function showMessage(msg, {
    elementId = "status-message",
    success = true,
    duration = null, // بالميلي ثانية مثال: 5000 = 5 ثواني
    focus = false
} = {}) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = msg;
        el.classList.remove("hidden", "success", "error");
        el.classList.add(success ? "success" : "error");
        el.setAttribute("role", "status"); // من أجل الوصولية
        if (focus) el.focus();

        // إخفاء الرسالة بعد مدة معينة
        if (duration) {
            setTimeout(() => {
                el.classList.add("hidden");
                el.textContent = "";
            }, duration);
        }
    } else {
        alert(msg); // في حال لم يوجد العنصر
    }
}
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
        // التقاط الخطأ في Sentry إذا لم يتم العثور على زر جوجل
        if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
             Sentry.captureMessage("Google Sign-In button element not found.");
        }
      }
    } else {
      console.error("Google Identity Services library not loaded.");
      // التقاط الخطأ في Sentry إذا لم يتم تحميل مكتبة جوجل
      if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
           Sentry.captureMessage("Google Identity Services library not loaded.");
      }
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

        if (typeof Sentry !== 'undefined' && Sentry.setUser) {
            Sentry.setUser({ email: userEmail });
        }

        // *** تعديل هنا: اخفِ زر جوجل وأظهر الحاوية الرئيسية الجديدة ***
        document.getElementById('g_id_signin')?.classList.add('hidden');
        document.getElementById('form-and-buttons-container')?.classList.remove('hidden'); // <--- هذا هو التعديل الرئيسي

        setupPhoneInput();
        setupCheckButtons();
      })
      .catch(err => {
        console.error("Error fetching Google token info:", err);
        if (typeof Sentry !== 'undefined' && Sentry.captureException) {
             Sentry.captureException(err);
        }
        showMessage("❌ حدث خطأ أثناء التحقق من تسجيل الدخول بـ Google", false);
        const errorMessageElement = document.getElementById('error-message');
        if (errorMessageElement) {
          errorMessageElement.textContent = "فشل التحقق من معلومات تسجيل الدخول بـ Google.";
          errorMessageElement.classList.remove('hidden');
        }
      });
  }

        document.getElementById('g_id_signin')?.classList.add('hidden');
        document.getElementById('buttons-container')?.classList.remove('hidden');
        document.getElementById('form-fields')?.classList.remove('hidden');

        setupPhoneInput();
        setupCheckButtons();
      })
      .catch(err => {
        console.error("Error fetching Google token info:", err);
        // التقاط الخطأ في Sentry عند فشل التحقق من رمز جوجل
        if (typeof Sentry !== 'undefined' && Sentry.captureException) {
             Sentry.captureException(err);
        }
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
      // التقاط الخطأ في Sentry إذا لم يتم العثور على حقل الهاتف
       if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
            Sentry.captureMessage("Phone input element not found for setup.");
       }
    }
  }

  function isValidPhone(phone) {
    return /^9715\d{8}$/.test(phone);
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
            // اختياري: التقاط رسالة تحذير في Sentry
            if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
                 Sentry.captureMessage("User did not fill name or phone", Sentry.SeverityLevel.Warning); // تحديد مستوى الخطورة
            }
            return;
          }

          if (!isValidPhone(phone)) {
            showMessage("❗ الرقم غير صحيح بصيغة 9715XXXXXXXX.", false);
             // اختياري: التقاط رسالة تحذير في Sentry
            if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
                Sentry.captureMessage("Invalid phone format entered", Sentry.SeverityLevel.Warning);
            }
            return;
          }

          const payload = {
            operation: id === 'check-in' ? 'check-in' : 'check-out',
            token,
            fingerprint: window.userFingerprint, // <--- استخدم المتغير العالمي هنا
            email: userEmail,
            name,
            phone,
            ip: null
          };

          // إرسال البيانات إلى Google Apps Script
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
               // اختياري: تسجيل رسالة نجاح أو فشل في Sentry كـ breadcrumb أو log
               if (typeof Sentry !== 'undefined' && Sentry.addBreadcrumb) {
                  Sentry.addBreadcrumb({
                      category: 'action',
                      message: `Google Script submission result: ${data.success ? 'Success' : 'Failure'}`,
                      level: data.success ? Sentry.SeverityLevel.Info : Sentry.SeverityLevel.Error,
                  });
               }
            } else {
              showMessage("⚠️ تم الإرسال، ولكن استجابة الخادم غير متوقعة.", false);
              console.warn("Unexpected response from Google Script:", data);
               // التقاط رسالة تحذير في Sentry للاستجابة غير المتوقعة
               if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
                   Sentry.captureMessage("Unexpected response from Google Script", Sentry.SeverityLevel.Warning);
               }
            }
          })
          .catch(err => {
            console.error("Error sending data to Google Script:", err);
            // التقاط الخطأ في Sentry عند فشل إرسال البيانات إلى جوجل سكريبت
             if (typeof Sentry !== 'undefined' && Sentry.captureException) {
                  // يمكنك إضافة سياق للخطأ هنا، مثل العملية (check-in/out)
                  Sentry.configureScope(scope => {
                      scope.setTag("operation", payload.operation);
                  });
                  Sentry.captureException(err);
                  Sentry.configureScope(scope => scope.clear()); // مسح السياق إذا لم يكن دائمًا مطلوبًا
             }

            showMessage("❌ حدث خطأ أثناء الإرسال: " + err.message, false);
          });
        });
      } else {
        // تسجيل خطأ في وحدة التحكم إذا لم يتم العثور على العناصر
        if (!button) console.error(`Element with ID '${id}' not found for setup.`);
        if (!phoneInput) console.error("Element with ID 'phone' not found for button setup.");
        if (!usernameInput) console.error("Element with ID 'username' not found for button setup.");
         // التقاط هذه الأخطاء في Sentry أيضًا
        if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
            let missingElement = '';
            if (!button) missingElement = `Button with ID '${id}'`;
            else if (!phoneInput) missingElement = "Phone input";
            else if (!usernameInput) missingElement = "Username input";
            Sentry.captureMessage(`${missingElement} not found for button setup`, Sentry.SeverityLevel.Error);
        }
      }
    });
  }

  initGoogleSignIn();
});



