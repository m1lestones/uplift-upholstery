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
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Honeypot: if filled, drop
  if (document.getElementById('website').value.trim() !== "") return;

  const payload = {
    photoUrl: document.getElementById('photoUrl').value,
    width: document.getElementById('width').value,
    depth: document.getElementById('depth').value,
    fabric: document.getElementById('fabric').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    estimateText: estimateDiv.innerText || '',
    priceApproved: !!approvePrice.checked,
    schedulingIntent: scheduleClicked,
    bookingCompleted: bookingCompleted,
    calendlyEventUri: calendlyEventUri.value,
    calendlyInviteeUri: calendlyInviteeUri.value,
    submittedAt: new Date().toISOString()
  };

  try {
    const res = await fetch('https://formspree.io/f/YOUR_ENDPOINT', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert('Thanks! We received your request.');
      form.reset();
      estimateDiv.classList.add('hidden');
      submitBtn.disabled = true;
      if (depositLink) depositLink.classList.add('hidden');
      if (openScheduler) openScheduler.classList.add('hidden');
      calendlyWrap.classList.add('hidden');
    } else {
      alert('Submission failed. Please try again.');
    }
  } catch (err) {
    console.error(err);
    alert('Network error. Please try again.');
  }
});
