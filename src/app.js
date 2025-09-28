const BASE_LABOR = 30; // $ per seat baseline
const FABRIC_PRICE = { standard: 18, premium: 28 }; // $ per yard

const form = document.getElementById('quote-form');
const estimateDiv = document.getElementById('estimate');
const estimateBtn = document.getElementById('estimateBtn');

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

estimateBtn.addEventListener('click', () => {
  const { labor, fabricCost, total, yards, fabric } = calcEstimate();
  estimateDiv.classList.remove('hidden');
  estimateDiv.innerHTML = `
    <strong>Baseline estimate:</strong> $${total}
    <br/><small>Labor $${labor} + Fabric ~$${fabricCost} (${yards} yd, ${fabric})</small>
    <br/><small>Final price confirmed after manual review of your photo.</small>
  `;
});

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
    const res = await fetch('https://formspree.io/f/xkgqodya', {
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