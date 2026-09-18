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

const statusMessages = {
  pending: 'รอรับเรื่อง',
  inprogress: 'กำลังดำเนินการ',
  resolved: 'แก้ไขเสร็จสิ้นแล้ว',
  cancelled: 'ถูกยกเลิก'
};

async function sendLinePush(lineUserId, message) {
  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_MESSAGING_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: 'text', text: message }]
      })
    });
  } catch (err) {
    console.error('LINE push failed:', err);
    // ไม่ throw ต่อ เพราะการอัปเดตสถานะยังต้องสำเร็จแม้ push แจ้งเตือนจะพลาด
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'ใช้ได้เฉพาะ POST เท่านั้น' });

  const { token, action, reportId, newStatus } = req.body;

  try {
    jwt.verify(token, process.env.ADMIN_JWT_SECRET);
  } catch (err) {
    return res.status(403).json({ error: 'session หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
  }

  try {
    if (action === 'list') {
      const snap = await adminDb.collection('reports').orderBy('createdAt', 'desc').get();
      const items = [];
      snap.forEach(d => {
        const data = d.data();
        items.push({
          id: d.id, ...data,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
        });
      });
      return res.status(200).json({ items });
    }

    if (action === 'update-status') {
      const reportRef = adminDb.collection('reports').doc(reportId);
      const reportDoc = await reportRef.get();
      if (!reportDoc.exists) return res.status(404).json({ error: 'ไม่พบเรื่องนี้' });

      const data = reportDoc.data();
      const uid = data.reportedBy;

      await reportRef.update({ status: newStatus });
      await adminDb.collection('users').doc(uid).collection('myReports').doc(reportId).update({ status: newStatus });

      if (uid && uid.startsWith('line_')) {
        const lineUserId = uid.replace('line_', '');
        const statusText = statusMessages[newStatus] || newStatus;
        await sendLinePush(
          lineUserId,
          `📢 อัปเดตสถานะแจ้งเหตุ\n\nเรื่อง: ${data.title}\nรหัส: ${data.reportCode}\nสถานะใหม่: ${statusText}\n\nเปิดแอปเพื่อดูรายละเอียดเพิ่มเติมได้`
        );
      }

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'ไม่รู้จัก action นี้' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}