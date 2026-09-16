const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATA_FILE = path.join(__dirname, 'letters.json');
const GHL_WEBHOOK_URL = process.env.GHL_WEBHOOK_URL;

if (!GHL_WEBHOOK_URL) {
  console.error('❌ Eroare: Nu a fost găsit GHL_WEBHOOK_URL în fișierul .env.');
  console.log('💡 Adăugați o linie în .env: GHL_WEBHOOK_URL=https://services.leadconnectorhq.com/hooks/...');
  process.exit(1);
}

if (!fs.existsSync(DATA_FILE)) {
  console.error('❌ Fișierul letters.json nu există.');
  process.exit(1);
}

const rawData = fs.readFileSync(DATA_FILE, 'utf8');
const letters = JSON.parse(rawData || '[]');

console.log(`🚀 Începem sincronizarea a ${letters.length} scrisori cu GoHighLevel (GHL)...`);

async function syncAll() {
  let successCount = 0;
  let errorCount = 0;

  for (const item of letters) {
    try {
      const response = await fetch(GHL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: item.email,
          letter_body: item.letterBody,
          timeline: item.timeline,
          created_at: item.createdAt,
          id: item.id,
          source: 'Make IT in Oradea - Bulk Sync'
        })
      });

      if (response.ok) {
        successCount++;
        console.log(`✅ [${successCount}/${letters.length}] Trimis cu succes: ${item.email}`);
      } else {
        errorCount++;
        console.error(`⚠️ Eroare status ${response.status} pentru ${item.email}`);
      }
    } catch (err) {
      errorCount++;
      console.error(`❌ Eroare rețea pentru ${item.email}:`, err.message);
    }
  }

  console.log('--------------------------------------------------');
  console.log(`🎉 Sincronizare finalizată! Succes: ${successCount} | Erori: ${errorCount}`);
  console.log('--------------------------------------------------');
}

syncAll();
