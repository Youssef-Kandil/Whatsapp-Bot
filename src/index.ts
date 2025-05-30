import express, { Request, Response } from 'express';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const app = express();
app.use(express.json());

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', (qr: string) => {
  console.log('🔐 Scan this QR Code:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp is ready!');
});

client.on('auth_failure', msg => {
  console.error('❌ Auth failure:', msg);
});

client.on('disconnected', reason => {
  console.warn('⚠️ Client disconnected:', reason);
});

client.initialize();

app.post('/send', async (req: Request, res: Response): Promise<void> => {
  const { number, message } = req.body;

  if (!number || !message) {
    res.status(400).json({ error: 'number and message are required' });
    return;
  }

  if (!client.info) {
    res.status(503).json({ error: 'WhatsApp client is not ready yet.' });
    return;
  }

  const cleanNumber = number.replace(/\D/g, ''); // ينظف الرقم
  const chatId = `${cleanNumber}@c.us`;

  const isRegistered = await client.isRegisteredUser(chatId);
  if (!isRegistered) {
    res.status(400).json({ error: 'This number is not registered on WhatsApp.' });
    return;
  }

  try {
    await client.sendMessage(chatId, message);
    res.json({ status: 'sent', number: cleanNumber, message });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
