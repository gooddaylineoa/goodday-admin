import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined
    })
  });
}

const adminDb = getFirestore();

// 🔴 อนุญาตเฉพาะ collection ที่อยู่ในลิสต์นี้เท่านั้น (กันพลาดแก้ collection อันตราย)
const ALLOWED_COLLECTIONS = ['foods', 'events'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'ใช้ได้เฉพาะ POST เท่านั้น' });

  const { adminSecret, action, collection, id, data } = req.body;

  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'รหัสผ่านแอดมินไม่ถูกต้อง' });
  }
  if (!ALLOWED_COLLECTIONS.includes(collection)) {
    return res.status(400).json({ error: 'ไม่อนุญาตให้แก้ไข collection นี้' });
  }

  try {
    if (action === 'list') {
      const snap = await adminDb.collection(collection).get();
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      return res.status(200).json({ items });
    }

    if (action === 'save') {
      if (id) {
        await adminDb.collection(collection).doc(id).set(data, { merge: true });
        return res.status(200).json({ success: true, id });
      } else {
        const ref = await adminDb.collection(collection).add(data);
        return res.status(200).json({ success: true, id: ref.id });
      }
    }

    if (action === 'delete') {
      await adminDb.collection(collection).doc(id).delete();
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'ไม่รู้จัก action นี้' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}