# Uplift Upholstery — MVP (Instant Baseline Quote)

A tiny, static MVP for fast upholstery quotes (dining chair seats).  
No backend. Client-side estimator + Formspree for submissions. Deployed on Netlify.

## ✨ Features
- Instant baseline estimate (labor + fabric)
- Simple form (photo link + dimensions + contact)
- Submits to Formspree (emails the request)
- Mobile-friendly single page

## 🧱 Tech
- HTML/CSS/JS
- Formspree (form handling)
- Netlify (hosting)

## 📂 Structure
```
uplift-upholstery/
├─ README.md
├─ .gitignore
├─ netlify.toml
├─ /src
│  ├─ index.html
│  ├─ styles.css
│  ├─ app.js
│  └─ /assets
└─ /docs
```

## 🚀 Local Dev
Open `src/index.html` in your browser or use VS Code Live Server.

## 🔧 Configure Formspree
1. Create a Formspree form (JSON).
2. Replace `YOUR_ENDPOINT` in `src/app.js`.

## 🛫 Deploy (Netlify)
- Publish dir: `src`
- Build: (none)

## ✅ Roadmap
- Auto photo quality check (AI)
- Save leads to Google Sheet
- Add FAQs + testimonials