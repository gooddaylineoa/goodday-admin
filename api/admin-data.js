import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import jwt from 'jsonwebtoken';

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

const ALLOWED_COLLECTIONS = ['foods', 'events', 'faqs', 'shops', 'products', 'users', 'orders', 'reports'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'ใช้ได้เฉพาะ POST เท่านั้น' });

  const { token, action, collection, id, data } = req.body;

  try {
    jwt.verify(token, process.env.ADMIN_JWT_SECRET);
  } catch (err) {
    return res.status(403).json({ error: 'session หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
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

    if (action === 'dashboard-stats') {
      const [usersSnap, shopsSnap, productsSnap, ordersSnap, eventsSnap, reportsSnap] = await Promise.all([
        adminDb.collection('users').get(),
        adminDb.collection('shops').get(),
        adminDb.collection('products').get(),
        adminDb.collection('orders').get(),
        adminDb.collection('events').get(),
        adminDb.collection('reports').get()
      ]);

      // สมาชิกใหม่ 30 วันล่าสุด แยกตามวัน
      const memberDaily = {};
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        memberDaily[d.toISOString().slice(0, 10)] = 0;
      }
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.createdAt) {
          const dateKey = data.createdAt.toDate().toISOString().slice(0, 10);
          if (memberDaily[dateKey] !== undefined) memberDaily[dateKey]++;
        }
      });

      // ยอดขายรายวัน 7 วันล่าสุด + ยอดขายรวม
      const salesDaily = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        salesDaily[d.toISOString().slice(0, 10)] = 0;
      }
      let totalRevenue = 0;
      const orderStatusCount = {};
      ordersSnap.forEach(doc => {
        const data = doc.data();
        if (data.status !== 'pending_payment' && data.status !== 'cancelled') {
          totalRevenue += data.totalAmount || 0;
          if (data.createdAt) {
            const dateKey = data.createdAt.toDate().toISOString().slice(0, 10);
            if (salesDaily[dateKey] !== undefined) salesDaily[dateKey] += data.totalAmount || 0;
          }
        }
        orderStatusCount[data.status] = (orderStatusCount[data.status] || 0) + 1;
      });

      // สถานะแจ้งเหตุ
      const reportStatusCount = {};
      reportsSnap.forEach(doc => {
        const status = doc.data().status || 'pending';
        reportStatusCount[status] = (reportStatusCount[status] || 0) + 1;
      });

      return res.status(200).json({
        totalMembers: usersSnap.size,
        totalShops: shopsSnap.size,
        totalProducts: productsSnap.size,
        totalRevenue,
        totalEvents: eventsSnap.size,
        totalReports: reportsSnap.size,
        memberDaily,
        salesDaily,
        orderStatusCount,
        reportStatusCount
      });
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