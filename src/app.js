console.log("JS loaded ✅");

// ===== Theme toggle (light/dark) =====
const themeBtn = document.getElementById('themeToggle');

function setTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('theme-dark', isDark);
  localStorage.setItem('theme', theme);
  if (themeBtn) {
    themeBtn.setAttribute('aria-pressed', String(isDark));
    themeBtn.textContent = isDark ? '🌞 Light' : '🌙 Dark';
    themeBtn.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  }
}

// Initial theme: saved → system preference → light
(function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(saved || (prefersDark ? 'dark' : 'light'));
})();

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('theme-dark');
    setTheme(isDark ? 'light' : 'dark');
  });
}

// ===== Pricing rules =====
const BASE_LABOR = 30; // $
const FABRIC_PRICE = { standard: 18, premium: 28 }; // $/yard

// ===== Grab elements =====
const form = document.getElementById('quote-form');
const estimateDiv = document.getElementById('estimate');
const estimateBtn = document.getElementById('estimateBtn');
const approvePrice = document.getElementById('approvePrice');
const submitBtn = document.getElementById('submitBtn');
const themeToggle = document.getElementById('themeToggle');

const depositLink = document.getElementById('depositLink');        // optional
const openScheduler = document.getElementById('openScheduler');    // button to show Calendly
const calendlyWrap = document.getElementById('calendlyWrap');      // inline Calendly container
const calendlyEventUri = document.getElementById('calendlyEventUri');
const calendlyInviteeUri = document.getElementById('calendlyInviteeUri');

let scheduleClicked = false;
let bookingCompleted = false;

// ===== Estimator =====
function calcEstimate() {
  const w = Number(document.getElementById('width').value || 0);
  const d = Number(document.getElementById('depth').value || 0);
  const fabric = document.getElementById('fabric').value || 'standard';
  if (!w || !d) return { labor: BASE_LABOR, fabricCost: 0, total: BASE_LABOR, yards: 0, fabric };

  const yards = Math.max(0.4, ((w * d) / 1296) * 1.25);
  const fabricCost = Math.round(yards * FABRIC_PRICE[fabric]);
  const total = BASE_LABOR + fabricCost;
  return { labor: BASE_LABOR, fabricCost, total, yards: yards.toFixed(2), fabric };
}

// ===== UI wiring =====
estimateBtn.addEventListener('click', () => {
  const { labor, fabricCost, total, yards, fabric } = calcEstimate();
  estimateDiv.classList.remove('hidden');
  estimateDiv.innerHTML = `
    <strong>Baseline estimate:</strong> $${total}
    <br/><small>Labor $${labor} + Fabric ~$${fabricCost} (${yards} yd, ${fabric})</small>
    <br/><small>Final price confirmed after manual review of your photo.</small>
  `;

  // reset approval & actions
  approvePrice.checked = false;
  submitBtn.disabled = true;
  if (depositLink) depositLink.classList.add('hidden');
  if (openScheduler) openScheduler.classList.add('hidden');
  calendlyWrap.classList.add('hidden');
  scheduleClicked = false;
  bookingCompleted = false;
  calendlyEventUri.value = "";
  calendlyInviteeUri.value = "";
});

// Approve → enable submit + reveal actions
approvePrice.addEventListener('change', () => {
  if (approvePrice.checked) {
    submitBtn.disabled = false;
    if (depositLink) depositLink.classList.remove('hidden');
    if (openScheduler) openScheduler.classList.remove('hidden');
  } else {
    submitBtn.disabled = true;
    if (depositLink) depositLink.classList.add('hidden');
    if (openScheduler) openScheduler.classList.add('hidden');
    calendlyWrap.classList.add('hidden');
  }
});

// Show Calendly inline
if (openScheduler) {
  openScheduler.addEventListener('click', () => {
    scheduleClicked = true;
    calendlyWrap.classList.remove('hidden');
    calendlyWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// Listen for Calendly completion
window.addEventListener('message', function(e) {
  if (e.data && e.data.event === 'calendly.event_scheduled') {
    bookingCompleted = true;
    const payload = e.data.payload || {};
    calendlyEventUri.value = (payload.event && payload.event.uri) || "";
    calendlyInviteeUri.value = (payload.invitee && payload.invitee.uri) || "";
    alert("✅ Time booked! You can now submit your request.");
  }
});

// ===== Theme Toggle (fallback) =====
if (typeof setTheme !== 'function') {
  function applyTheme(theme) {
    const dark = theme === 'dark';
    document.body.classList.toggle('theme-dark', dark);
    if (themeToggle) {
      themeToggle.textContent = dark ? '☀️ Light' : '🌙 Dark';
      themeToggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
    }
  }

  // Prefer saved theme, else system preference
  const savedTheme = localStorage.getItem('theme');
  const initialTheme = savedTheme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(initialTheme);
  if (!savedTheme) localStorage.setItem('theme', initialTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = !document.body.classList.contains('theme-dark');
      const next = isDark ? 'dark' : 'light';
      applyTheme(next);
      localStorage.setItem('theme', next);
    });
  }
}

// ===== Submit (Formspree JSON) =====
// Replace YOUR_ENDPOINT below with your real Formspree ID (e.g. /f/abcd1234)
async function getRecaptchaToken() {
  const siteKey = '6Ldr0d0rAAAAADyluFf8RhYNipEJHLNrQc2hWWNz';
  if (!(window.grecaptcha && grecaptcha.execute)) {
    console.warn('reCAPTCHA not loaded');
    return null;
  }
  try {
    if (grecaptcha.ready) {
      await new Promise((resolve) => grecaptcha.ready(resolve));
    }
    return await grecaptcha.execute(siteKey, { action: 'submit' });
  } catch (e) {
    console.warn('reCAPTCHA token error', e);
    return null;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Honeypot: if filled, drop
  if (document.getElementById('website').value.trim() !== "") return;

  // Disable button to prevent double-clicks
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Sending…';

  const payload = {
    photoUrl: document.getElementById('photoUrl').value,
    width: document.getElementById('width').value,
    depth: document.getElementById('depth').value,
    fabric: document.getElementById('fabric').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    estimateText: estimateDiv.innerText || '',
    priceApproved: !!approvePrice.checked,
    schedulingIntent: typeof scheduleClicked !== 'undefined' ? scheduleClicked : false,
    bookingCompleted: typeof bookingCompleted !== 'undefined' ? bookingCompleted : false,
    calendlyEventUri: document.getElementById('calendlyEventUri').value,
    calendlyInviteeUri: document.getElementById('calendlyInviteeUri').value,
    submittedAt: new Date().toISOString()
  };

  // Attach reCAPTCHA v3 token
  try {
    const token = await getRecaptchaToken();
    if (token) payload['g-recaptcha-response'] = token;
  } catch (_) {
    // Non-fatal; proceed without token (server may reject if required)
  }

  try {
    const res = await fetch('https://formspree.io/f/xnngvone', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // See exactly what Formspree replied (shows in Console)
    let data = {};
    try { data = await res.json(); } catch {}
    console.log('Formspree response:', res.status, data);

    // Success shapes
    if (res.ok || data.ok || data._status === 'success') {
      window.location.href = 'thanks.html'; // ← redirect to your thank-you page (no leading slash)
      return;
    }

    // If not success, show the real error message
    const msg =
      (data.errors && data.errors[0]?.message) ||
      data.error ||
      JSON.stringify(data) ||
      'Unknown error';
    alert(`Submission failed (${res.status}). ${msg}`);

  } catch (err) {
    console.error(err);
    alert('Network error. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// ===== Dynamic email link (prefill mailto from form inputs) =====
const emailLink = document.getElementById('emailLink');
if (emailLink) {
  function updateMailto() {
    const photo = document.getElementById('photoUrl').value || '';
    const width = document.getElementById('width').value || '';
    const depth = document.getElementById('depth').value || '';
    const fabric = document.getElementById('fabric').value || '';
    const phone  = document.getElementById('phone').value || '';
    const email  = document.getElementById('email').value || '';

    const subject = 'Furniture Upholstery Quote Request';
    const body = `Hi Juan,\n\nMy photo: ${photo}\nMeasurements: ${width} x ${depth} in\nFabric: ${fabric}\nPhone: ${phone}\nEmail: ${email}\n\nThanks!`;

    emailLink.href = `mailto:juan.franco@pursuit.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  ['photoUrl','width','depth','fabric','phone','email']
    .forEach(id => document.getElementById(id)?.addEventListener('input', updateMailto));

  updateMailto(); // set it once on load
}

