const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'letters.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Funcție ajutătoare pentru citirea scrisorilor stocate
function readLetters() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([]));
      return [];
    }
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Eroare la citirea fișierului letters.json:', err);
    return [];
  }
}

// Funcție ajutătoare pentru salvarea scrisorilor
function saveLetters(letters) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(letters, null, 2), 'utf8');
  } catch (err) {
    console.error('Eroare la salvarea în letters.json:', err);
  }
}

// Endpoint de salvare ultra-rapidă (< 5ms) pentru GHL / stocare locală
app.post('/api/send-email', async (req, res) => {
  const { email, letterBody, timeline } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Adresa de email este invalidă.' });
  }

  const newCapsule = {
    id: 'capsule_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    email: email.trim(),
    letterBody: letterBody || '',
    timeline: timeline || '6 luni',
    createdAt: new Date().toISOString(),
    status: 'saved_for_ghl'
  };

  // Stocăm în letters.json local
  const letters = readLetters();
  letters.push(newCapsule);
  saveLetters(letters);

  console.log(`💾 Scrisoare salvată local pentru GHL! ID: ${newCapsule.id} | Email: ${email}`);

  // Trimitere Webhook opțională direct către GoHighLevel (GHL) în fundal (async)
  if (process.env.GHL_WEBHOOK_URL) {
    fetch(process.env.GHL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newCapsule.email,
        letter_body: newCapsule.letterBody,
        timeline: newCapsule.timeline,
        created_at: newCapsule.createdAt,
        source: 'Make IT in Oradea - Time Capsule'
      })
    }).then(response => {
      console.log(`🚀 Webhook GHL trimis cu status: ${response.status}`);
    }).catch(err => {
      console.error('⚠️ Eroare trimitere Webhook GHL:', err.message);
    });
  }

  // Răspuns ultra-rapid către client (instantanat)
  return res.json({
    success: true,
    message: 'Scrisoarea a fost salvată cu succes! Va fi procesată și trimisă conform programării.',
    id: newCapsule.id,
    totalSaved: letters.length
  });
});

// Endpoint pentru vizualizarea tuturor scrisorilor salvate (JSON)
app.get('/api/letters', (req, res) => {
  const letters = readLetters();
  res.json({ count: letters.length, letters });
});

// Endpoint pentru export direct în format CSV compatibil cu GoHighLevel (GHL)
app.get('/api/letters/export-csv', (req, res) => {
  const letters = readLetters();
  
  let csv = 'Email,Timeline,Letter_Body,Created_At,Capsule_ID\n';
  
  letters.forEach(item => {
    const cleanEmail = `"${(item.email || '').replace(/"/g, '""')}"`;
    const cleanTimeline = `"${(item.timeline || '').replace(/"/g, '""')}"`;
    const cleanBody = `"${(item.letterBody || '').replace(/"/g, '""')}"`;
    const cleanDate = `"${(item.createdAt || '').replace(/"/g, '""')}"`;
    const cleanId = `"${(item.id || '').replace(/"/g, '""')}"`;
    
    csv += `${cleanEmail},${cleanTimeline},${cleanBody},${cleanDate},${cleanId}\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="ghl_letters_export.csv"');
  return res.status(200).send(csv);
});

app.listen(PORT, () => {
  console.log(`🚀 Serverul rulează pe http://localhost:${PORT}`);
  console.log(`📁 Scrisorile se stochează în letters.json`);
  console.log(`📊 Export CSV pentru GoHighLevel (GHL): http://localhost:${PORT}/api/letters/export-csv`);
});
