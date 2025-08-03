
// يتم تشغيل الكود بعد تحميل عناصر DOM بالكامل
document.addEventListener('DOMContentLoaded', () => {

  // بما أننا نستخدم Sentry الآن، قد تحتاج إلى استيراده إذا كنت تستخدم وحدات (Modules)
  // إذا كنت تستخدم <script src="script.js"> بدون type="module"، فلن تحتاج لهذا الاستيراد هنا
  // لأن Sentry سيكون متاحًا كمتغير عام (Global)
  // import * as Sentry from '@sentry/browser'; // قم بإلغاء التعليق إذا كنت تستخدم وحدات

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || '';
  // userFingerprint سيتم تعيينه بواسطة Loader Script في HTML
  // let userFingerprint = null; // لم نعد نحتاج هذا المتغير المحلي بعد استخدام window.userFingerprint
  let userEmail = null;

  // دالة عرض الرسائل داخل الصفحة (تم تحديثها لمرونة أفضل و CSS Classes)
  function showMessage(msg, {
      elementId = "status-message",
      success = true,
      duration = null, // بالميلي ثانية مثال: 5000 = 5 ثواني
      focus = false
  } = {}) {
      const el = document.getElementById(elementId);
      if (el) {
          el.textContent = msg;
          // إزالة الفئات القديمة قبل إضافة الجديدة
          el.classList.remove("hidden", "success", "error");
          // إضافة فئة success أو error بناءً على النتيجة
          el.classList.add(success ? "success" : "error");
          el.setAttribute("role", "status"); // من أجل الوصولية

          // إزالة style.color القديم المباشر
          el.style.color = "";

          if (focus) el.focus();

          // إخفاء الرسالة بعد مدة معينة
          if (duration) {
              setTimeout(() => {
                  el.classList.add("hidden");
                  el.textContent = ""; // مسح المحتوى عند الإخفاء
              }, duration);
          } else {
             // تأكد من إظهار العنصر إذا لم يكن مخفيًا بالفعل
             // هذا قد يكون مفيدًا إذا لم يتم استخدام duration
             el.classList.remove("hidden");
          }
      } else {
          alert(msg); // في حال لم يوجد العنصر
      }
  }


  // ------------------------------------------------------------
  // بصمة الجهاز (تم نقل منطق التحميل إلى Loader Script في HTML)
  // تم حذف كتلة الكود هنا بالكامل

  // ------------------------------------------------------------
  // تسجيل الدخول بـ Google (طريقة Google Identity Services الجديدة)
  // تأكد أن مكتبة Google Identity Services (gsi/client) محملة في HTML async defer
  function initGoogleSignIn() {
    // نتحقق من وجود google.accounts.id الذي توفره المكتبة الجديدة
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      console.log("Google Identity Services library loaded."); // تأكيد التحميل

      google.accounts.id.initialize({
        client_id: '250943951703-sbgdp0c7f7mvvp2q5o705dolc8j4i9tf.apps.googleusercontent.com', // تأكد من أن هذا هو Client ID الصحيح
        callback: handleCredentialResponse, // الدالة التي ستعالج الاستجابة
        ux_mode: 'popup' // أو 'redirect'
      });

      const googleSignInButton = document.getElementById('g_id_signin');
      if (googleSignInButton) {
        google.accounts.id.renderButton(googleSignInButton, {
          theme: 'outline', // مظهر الزر
          size: 'large', // حجم الزر
          locale: 'ar' // لغة الزر
          // يمكن إضافة خصائص أخرى مثل width أو shape
        });
        // زر Google يكون مرئيا افتراضيا، لا نحتاج لإزالة hidden هنا
        //googleSignInButton.classList.remove('hidden'); // تم حذف هذا السطر
      } else {
        console.error("Element with ID 'g_id_signin' not found.");
        if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
             Sentry.captureMessage("Google Sign-In button element not found.", Sentry.SeverityLevel.Error);
        }
         // عرض رسالة خطأ للمستخدم
         showMessage("❌ عنصر زر تسجيل الدخول بـ Google غير موجود في الصفحة.", { success: false, focus: true });
      }
    } else {
      console.error("Google Identity Services library not loaded.");
       if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
           Sentry.captureMessage("Google Identity Services library not loaded.", Sentry.SeverityLevel.Error);
      }
      const errorMessageElement = document.getElementById('error-message');
      if (errorMessageElement) {
        errorMessageElement.textContent = "خدمة تسجيل الدخول بـ Google غير متوفرة.";
        errorMessageElement.classList.remove('hidden'); // تأكد من إظهار رسالة الخطأ هذه
      }
       // عرض رسالة خطأ للمستخدم باستخدام showMessage الجديدة
       showMessage("❌ خدمة تسجيل الدخول بـ Google غير متوفرة.", { elementId: "error-message", success: false, focus: true });
    }
  }

  // الدالة التي يتم استدعاؤها بعد نجاح تسجيل الدخول بـ Google
  function handleCredentialResponse(response) {
    // التحقق من صحة الـ ID Token مع Google
    fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + response.credential)
      .then(res => {
        if (!res.ok) {
           // التقاط خطأ HTTP صريح في Sentry
           if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
                Sentry.captureMessage(`HTTP error fetching Google token info! status: ${res.status}`, Sentry.SeverityLevel.Error);
           }
           throw new Error(`HTTP error fetching token info! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        userEmail = data.email; // تخزين البريد الإلكتروني للمستخدم
        console.log("User logged in with email:", userEmail);

        // إبلاغ Sentry عن المستخدم الحالي (إذا كانت Sentry متاحة)
        if (typeof Sentry !== 'undefined' && Sentry.setUser) {
            Sentry.setUser({ email: userEmail });
            console.log("Sentry user context set."); // تأكيد تعيين المستخدم في Sentry
        }

        // *** تعديل هنا: اخفِ زر جوجل وأظهر الحاوية الرئيسية الجديدة ***
        // تأكد أن هذه الـ IDs موجودة في HTML وأن form-and-buttons-container يحمل الفئة hidden في HTML
        document.getElementById('g_id_signin')?.classList.add('hidden'); // إخفاء زر Google
        //document.getElementById('buttons-container')?.classList.remove('hidden'); // حذف هذا السطر
        //document.getElementById('form-fields')?.classList.remove('hidden'); // حذف هذا السطر
        document.getElementById('form-and-buttons-container')?.classList.remove('hidden'); // إظهار الحاوية الرئيسية

        // تهيئة حقل الهاتف وإعداد أزرار Check-in/out
        setupPhoneInput();
        setupCheckButtons();

        console.log("Google Sign-In successful, showing form."); // تأكيد منطق الإظهار

      })
      .catch(err => {
        console.error("Error fetching Google token info:", err);
        // التقاط الخطأ في Sentry عند فشل التحقق من رمز جوجل
        if (typeof Sentry !== 'undefined' && Sentry.captureException) {
             Sentry.captureException(err, {
                  extra: {
                      response: response // يمكنك تضمين استجابة الـ id token هنا إذا أردت
                  }
             });
        }
        // عرض رسالة خطأ للمستخدم
        showMessage("❌ حدث خطأ أثناء التحقق من تسجيل الدخول بـ Google", { success: false, focus: true, duration: 10000 }); // عرض لـ 10 ثواني
        const errorMessageElement = document.getElementById('error-message');
        if (errorMessageElement) {
          errorMessageElement.textContent = "فشل التحقق من معلومات تسجيل الدخول بـ Google.";
          errorMessageElement.classList.remove('hidden'); // تأكد من إظهار رسالة الخطأ هذه
        }
      });
  }

  // إعداد حقل الهاتف ليضيف بادئة 9715
  function setupPhoneInput() {
    const phoneInput = document.getElementById("phone");
    if (phoneInput) {
      console.log("Phone input element found, setting up."); // تأكيد العثور على العنصر
      phoneInput.addEventListener("focus", () => {
        if (!phoneInput.value.startsWith("9715")) phoneInput.value = "9715";
      });
      phoneInput.addEventListener("keydown", e => {
        const prefix = "9715";
        // منع حذف أو مسح البادئة 9715
        if (phoneInput.selectionStart !== null && phoneInput.selectionStart < prefix.length &&
            (e.key === "Backspace" || e.key === "Delete")) {
          e.preventDefault();
        }
         // السماح بالأسهم، Home، End، Tab
        if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End" || e.key === "Tab") {
            return;
        }
        // منع إدخال أحرف غير أرقام بعد البادئة
         if (phoneInput.selectionStart !== null && phoneInput.selectionStart >= prefix.length) {
             if (!/\d/.test(e.key) && e.key !== "Backspace" && e.key !== "Delete") {
                 e.preventDefault();
             }
         } else if (phoneInput.selectionStart !== null && phoneInput.selectionStart < prefix.length) {
              // منع إدخال أي شيء في البادئة
              e.preventDefault();
         }
      });
       // منع اللصق الذي يغير البادئة
       phoneInput.addEventListener("paste", e => {
            const pasteData = e.clipboardData.getData('text');
            const prefix = "9715";
            if (!pasteData.startsWith(prefix)) {
                 // يمكنك محاولة تصحيح اللصق هنا أو منعه بالكامل
                 console.warn("Paste detected, might not match prefix.");
                 // مثال: محاولة إجبار البادئة
                 // e.preventDefault();
                 // phoneInput.value = prefix + pasteData.replace(/^9715/, '');
            }
       });
    } else {
      console.error("Element with ID 'phone' not found for setup.");
       if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
            Sentry.captureMessage("Phone input element not found for setup.", Sentry.SeverityLevel.Error);
       }
    }
  }

  // التحقق من صحة صيغة رقم الهاتف (يبدأ بـ 9715 ويليه 8 أرقام)
  function isValidPhone(phone) {
    return /^9715\d{8}$/.test(phone);
  }

  // إعداد معالجات الأحداث لأزرار Check-in/out
  function setupCheckButtons() {
    console.log("Setting up check buttons."); // تأكيد إعداد الأزرار
    ['check-in', 'check-out'].forEach(id => {
      const button = document.getElementById(id);
      const phoneInput = document.getElementById("phone");
      const usernameInput = document.getElementById("username");

      if (button && phoneInput && usernameInput) {
        console.log(`Button ${id} found, adding listener.`); // تأكيد العثور على الزر
        button.addEventListener('click', () => {
          const name = usernameInput.value.trim();
          const phone = phoneInput.value.trim();

          // التحقق من تعبئة الحقول
          if (!name || !phone) {
            showMessage("❗ الرجاء تعبئة الاسم ورقم الجوال.", { success: false, focus: true, duration: 5000 });
            if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
                 Sentry.captureMessage("User did not fill name or phone", Sentry.SeverityLevel.Warning);
            }
            return; // إيقاف الدالة إذا كانت الحقول فارغة
          }

          // التحقق من صحة صيغة رقم الهاتف
          if (!isValidPhone(phone)) {
            showMessage("❗ الرقم غير صحيح بصيغة 9715XXXXXXXX.", { success: false, focus: true, duration: 5000 });
            if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
                Sentry.captureMessage("Invalid phone format entered", Sentry.SeverityLevel.Warning);
            }
            return; // إيقاف الدالة إذا كانت الصيغة غير صحيحة
          }

          // إنشاء حمولة البيانات للإرسال إلى Google Apps Script
          const payload = {
            operation: id === 'check-in' ? 'check-in' : 'check-out',
            token: token, // استخدام ال token من الـ URL
            fingerprint: window.userFingerprint, // استخدام البصمة من المتغير العالمي
            email: userEmail, // استخدام البريد الإلكتروني من تسجيل الدخول
            name: name, // استخدام الاسم المدخل
            phone: phone, // استخدام رقم الهاتف المدخل
            ip: null // IP غير متاح مباشرة في المتصفح، يمكن الحصول عليه من السكربت إذا لزم الأمر
          };

          console.log("Payload prepared:", payload); // عرض حمولة البيانات

          // إرسال البيانات إلى Google Apps Script باستخدام fetch API
          // تأكد من تحديث الـ URL الخاص بالسكربت هنا إذا تغير بعد النشر
          fetch('https://script.google.com/macros/s/AKfycby02ie58KVNwgkmvsLt_IaXnwtJkitKoEcyFIXaplElxGQ6Y9MJ-7_fViZdjq81fxPvgw/exec', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json'
               // Apps Script عادة لا يتطلب Cors headers خاصة إذا تم نشره للجميع
            },
            body: JSON.stringify(payload) // تحويل كائن البيانات إلى سلسلة JSON
          })
          .then(r => {
            console.log("Received response from Google Script:", r); // عرض الاستجابة الأولية
            if (!r.ok) {
               // إذا كانت الاستجابة ليست OK (مثل 400, 500)، اطرح خطأ
               // محاولة قراءة جسم الاستجابة إذا كان JSON لإعطاء تفاصيل أكثر
               return r.json().catch(() => { throw new Error(`Google Script HTTP error! status: ${r.status}`); });
            }
            return r.json(); // قراءة جسم الاستجابة كـ JSON
          })
          .then(data => {
            console.log("Google Script response data:", data); // عرض بيانات الاستجابة

            // التحقق من بنية الاستجابة (نبحث عن خاصية success)
            if (data && typeof data.success !== 'undefined') {
              // عرض رسالة نجاح أو فشل بناءً على استجابة السكربت
              showMessage(data.success ? "✅ تم التسجيل بنجاح" : "❌ فشل التسجيل", { success: data.success, duration: 5000 });
               // تسجيل نتيجة الإرسال في Sentry كـ breadcrumb
               if (typeof Sentry !== 'undefined' && Sentry.addBreadcrumb) {
                  Sentry.addBreadcrumb({
                      category: 'action',
                      message: `Google Script submission result: ${data.success ? 'Success' : 'Failure'}`,
                      level: data.success ? Sentry.SeverityLevel.Info : Sentry.SeverityLevel.Error,
                      data: payload // اختياري: يمكنك تضمين البيانات المرسلة في breadcrumb
                  });
               }
            } else {
              // استجابة غير متوقعة من السكربت
              showMessage("⚠️ تم الإرسال، ولكن استجابة الخادم غير متوقعة.", { success: false, duration: 10000, focus: true });
              console.warn("Unexpected response from Google Script:", data);
               // التقاط رسالة تحذير في Sentry للاستجابة غير المتوقعة
               if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
                   Sentry.captureMessage("Unexpected response from Google Script", Sentry.SeverityLevel.Warning, {
                        extra: { responseData: data }
                   });
               }
            }
          })
          .catch(err => {
            // التعامل مع الأخطاء التي تحدث أثناء fetch أو معالجة الاستجابة
            console.error("Error sending data to Google Script:", err);
            // التقاط الخطأ في Sentry
             if (typeof Sentry !== 'undefined' && Sentry.captureException) {
                  Sentry.captureException(err, {
                       extra: { // سياق إضافي للخطأ
                           payload: payload // البيانات التي حاولت إرسالها
                           // يمكنك إضافة معلومات أخرى إذا توفرت من الخطأ
                       }
                  });
             }
             // عرض رسالة خطأ للمستخدم
             showMessage("❌ حدث خطأ أثناء إرسال البيانات: " + (err.message || err), { success: false, focus: true, duration: 10000 });
          });
        }); // نهاية addEventListener click
      } else {
        console.error(`Button ${id} or phone/username input not found for setup.`);
        if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
            Sentry.captureMessage(`Button ${id} or phone/username input not found for setup.`, Sentry.SeverityLevel.Error);
        }
      }
    }); // نهاية forEach
  } // نهاية setupCheckButtons

  // ------------------------------------------------------------
  // استدعاء الدوال الرئيسية عند تحميل DOM بالكامل
  // تأكد من استدعاء initGoogleSignIn هنا
  initGoogleSignIn();

  // ملاحظة: setupPhoneInput و setupCheckButtons يتم استدعاؤهما بعد نجاح تسجيل الدخول في handleCredentialResponse

}); // نهاية DOMContentLoaded event listener


// قد تحتاج لبعض الدوال المساعدة أو المتغيرات خارج DOMContentLoaded إذا كانت ضرورية عالميًا،
// لكن معظم الكود المتعلق بالتفاعل مع الصفحة يجب أن يكون بداخله.
// window.userFingerprint و userEmail تم تعريفهما في نطاقات مناسبة الآن.
