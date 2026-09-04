import crypto from 'crypto';
import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('ตั้งรหัสผ่านที่ต้องการ: ', (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');

  console.log('\n===== คัดลอกค่าเหล่านี้ไปใส่ใน Firestore =====');
  console.log('salt:', salt);
  console.log('passwordHash:', hash);
  console.log('================================================\n');

  rl.close();
});