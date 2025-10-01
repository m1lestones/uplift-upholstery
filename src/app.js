const BASE_LABOR = 30; // $ per seat baseline
const FABRIC_PRICE = { standard: 18, premium: 28 }; // $ per yard

const form = document.getElementById('quote-form');
const estimateDiv = document.getElementById('estimate');
const estimateBtn = document.getElementById('estimateBtn');
const photoUrlInput = document.getElementById('photoUrl');

// ---- Photo Quality Gate ----
const photoWarnings = document.getElementById('photoWarnings');

// thresholds (tweak later)
const MIN_W = 800, MIN_H = 600;      // resolution
const MIN_LUMA = 60, MAX_LUMA = 220; // brightness (0..255)
const MIN_SHARPNESS = 12;            // sobel avg (arbitrary units)

function showWarn(issues) {
  photoWarnings.classList.remove('hidden');
  photoWarnings.classList.add('note','warn');
  photoWarnings.innerHTML =
    "<strong>Fix your photo:</strong><ul>" +
    issues.map(i => `<li>${i}</li>`).join("") +
    "</ul>";
}

function hideWarn() {
  photoWarnings.classList.add('hidden');
  photoWarnings.classList.remove('warn');
  photoWarnings.innerHTML = "";
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // try to enable pixel access
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });
}

async function checkPhotoQuality(url) {
  const issues = [];
  if (!/^https?:\/\//i.test(url)) {
    issues.push("Link must start with http(s)://");
    return { ok:false, issues, checked:false };
  }

  let img;
  try {
    img = await loadImage(url);
  } catch {
    return { ok:false, issues:["We couldn't open that photo link. Make sure it's shared and public."], checked:false };
  }

  // Basic resolution check always works
  const w = img.naturalWidth, h = img.naturalHeight;
  if (w < MIN_W || h < MIN_H) issues.push(`Photo too small (need at least ${MIN_W}×${MIN_H}).`);

  // Try pixel checks (brightness + blur). Some hosts block this (CORS).
  try {
    const CAN = 320;
    const canvas = document.createElement('canvas');
    canvas.width = CAN; canvas.height = CAN;
    const ctx = canvas.getContext('2d');

    // fit within CAN x CAN
    const scale = Math.min(CAN / w, CAN / h);
    const dw = Math.max(1, Math.round(w * scale));
    const dh = Math.max(1, Math.round(h * scale));
    ctx.drawImage(img, 0, 0, dw, dh);
    const { data } = ctx.getImageData(0, 0, dw, dh);

    // brightness
    let sumLuma = 0;
    const gray = new Float32Array((data.length / 4) | 0);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const r = data[i], g = data[i+1], b = data[i+2];
      const l = 0.2126*r + 0.7152*g + 0.0722*b;
      gray[j] = l; sumLuma += l;
    }
    const px = gray.length;
    const avgLuma = sumLuma / px;
    if (avgLuma < MIN_LUMA) issues.push("Photo too dark—take it in better light.");
    if (avgLuma > MAX_LUMA) issues.push("Photo too bright/washed out—reduce glare.");

    // blur (simple Sobel gradient)
    const idx = (x,y,w) => y*w + x;
    let sumGrad = 0, count = 0;
    for (let y=1; y<dh-1; y++){
      for (let x=1; x<dw-1; x++){
        const gx =
          -gray[idx(x-1,y-1,dw)] -2*gray[idx(x-1,y,dw)] - gray[idx(x-1,y+1,dw)]
          +gray[idx(x+1,y-1,dw)] +2*gray[idx(x+1,y,dw)] + gray[idx(x+1,y+1,dw)];
        const gy =
          -gray[idx(x-1,y-1,dw)] -2*gray[idx(x,y-1,dw)] - gray[idx(x+1,y-1,dw)]
          +gray[idx(x-1,y+1,dw)] +2*gray[idx(x,y+1,dw)] + gray[idx(x+1,y+1,dw)];
        const mag = Math.abs(gx) + Math.abs(gy);
        sumGrad += mag; count++;
      }
    }
    const avgGrad = sumGrad / Math.max(1, count);
    if (avgGrad < MIN_SHARPNESS) issues.push("Photo looks blurry—hold steady and retake.");

    return { ok: issues.length === 0, issues, checked:true };

  } catch {
    // Pixel access blocked by host; we did resolution only
    if (!issues.length) {
      issues.push("We couldn't fully check quality (photo host blocked). Make sure it’s bright, sharp, and close.");
    }
    return { ok: issues.length === 0, issues, checked:false };
  }
}

// Debounce helper to reduce heavy checks on input
function debounce(fn, ms) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

const runQualityCheck = debounce(async () => {
  const url = (photoUrlInput?.value || '').trim();
  if (!url) {
    hideWarn();
    return;
  }
  const { ok, issues } = await checkPhotoQuality(url);
  if (!ok && issues.length) showWarn(issues); else hideWarn();
}, 600);

function calcEstimate() {
  const w = Number(document.getElementById('width').value || 0);
  const d = Number(document.getElementById('depth').value || 0);
  const fabric = document.getElementById('fabric').value;

  if (!w || !d) return { labor: BASE_LABOR, fabricCost: 0, total: BASE_LABOR };

  const yards = Math.max(0.4, ((w * d) / 1296) * 1.25); // waste factor, min 0.4
  const fabricCost = Math.round(yards * FABRIC_PRICE[fabric]);
  const total = BASE_LABOR + fabricCost;

  return { labor: BASE_LABOR, fabricCost, total, yards: yards.toFixed(2), fabric };
}

estimateBtn.addEventListener('click', async () => {
  hideWarn();

  const photoUrl = document.getElementById('photoUrl').value.trim();
  const quality = await checkPhotoQuality(photoUrl);

  if (!quality.ok) {
    showWarn(quality.issues);
    return; // stop here; user must fix photo
  }

  // ... your existing estimate code
  const { labor, fabricCost, total, yards, fabric } = calcEstimate();
  estimateDiv.classList.remove('hidden');
  estimateDiv.innerHTML = `
    <strong>Baseline estimate:</strong> $${total} 
    <br/><small>Labor $${labor} + Fabric ~$${fabricCost} (${yards} yd, ${fabric})</small>
    <br/><small>Final price confirmed after manual review of your photo.</small>
  `;
});

// Wire photo quality checks
if (photoUrlInput) {
  photoUrlInput.addEventListener('input', runQualityCheck);
  photoUrlInput.addEventListener('blur', runQualityCheck);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    photoUrl: document.getElementById('photoUrl').value,
    width: document.getElementById('width').value,
    depth: document.getElementById('depth').value,
    fabric: document.getElementById('fabric').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    estimate: document.getElementById('estimate').innerText || ''
  };

  try {
    const res = await fetch('https://formspree.io/f/YOUR_ENDPOINT', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert('Thanks! We received your request. We’ll text/email you shortly.');
      form.reset();
      estimateDiv.classList.add('hidden');
    } else {
      alert('Submission failed. Please check your internet and try again.');
    }
  } catch (err) {
    alert('Network error. Please try again.');
  }
});