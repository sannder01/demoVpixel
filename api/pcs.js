import { kv } from '@vercel/kv';

/*
  Хранилище: один ключ "pcs" в Vercel KV, содержащий массив объектов:
  { id, name, zone, status }

  GET  /api/pcs            -> вернуть текущее состояние всех мест
  POST /api/pcs  { id, status } -> обновить статус одного места
  POST /api/pcs  { reset: true } -> сбросить всё в исходное состояние (для админа/тестов)
*/

function buildInitialPCs() {
  const pcs = [];
  let id = 1;
  for (let i = 1; i <= 5; i++) pcs.push({ id: id++, name: `VIP-${i}`, zone: 'VIP', status: 'free' });
  for (let i = 1; i <= 2; i++) pcs.push({ id: id++, name: `DUO-${i}`, zone: 'DUO', status: 'free' });
  for (let i = 1; i <= 20; i++) pcs.push({ id: id++, name: `PC-${i}`, zone: 'Общий зал', status: 'free' });
  return pcs;
}

async function getPCs() {
  let pcs = await kv.get('pcs');
  if (!pcs) {
    pcs = buildInitialPCs();
    await kv.set('pcs', pcs);
  }
  return pcs;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const pcs = await getPCs();
      return res.status(200).json(pcs);
    }

    if (req.method === 'POST') {
      const body = req.body || {};

      if (body.reset) {
        const fresh = buildInitialPCs();
        await kv.set('pcs', fresh);
        return res.status(200).json(fresh);
      }

      const { id, status } = body;
      if (!id || !['free', 'busy'].includes(status)) {
        return res.status(400).json({ error: 'Нужны корректные id и status ("free" | "busy")' });
      }

      const pcs = await getPCs();
      const pc = pcs.find((p) => p.id === id);
      if (!pc) {
        return res.status(404).json({ error: 'Место не найдено' });
      }

      pc.status = status;
      await kv.set('pcs', pcs);
      return res.status(200).json(pc);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Метод ${req.method} не поддерживается` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
