import { Router } from 'express';
import { chatSendRequestSchema } from '@self-invest/shared';
import { prisma } from '../../db/client.js';
import { processChatMessage } from '../../services/chat-processor.js';
import { trackError } from '../../services/error-tracker.js';

export const chatRouter = Router();

chatRouter.get('/messages', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const before = req.query.before as string | undefined;

  const where = before ? { createdAt: { lt: new Date(before) } } : {};
  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  res.json({
    messages: messages.reverse().map(mapMsg),
    hasMore: messages.length === limit,
  });
});

chatRouter.post('/send', async (req, res) => {
  const parsed = chatSendRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Message is required (max 2000 chars)' });
    return;
  }

  try {
    const result = await processChatMessage(parsed.data.message);
    res.json(result);
  } catch (err: any) {
    trackError('ai_provider', err, { context: 'chat_send' });
    res.status(500).json({ error: err.message || 'Failed to process message' });
  }
});

chatRouter.get('/instructions', async (_req, res) => {
  const instructions = await prisma.userInstruction.findMany({
    orderBy: { createdAt: 'desc' },
  });

  res.json(instructions.map((i) => ({
    id: i.id,
    originalMessage: i.originalMessage,
    compactRule: i.compactRule,
    category: i.category,
    status: i.status.toLowerCase(),
    createdAt: i.createdAt.toISOString(),
    disabledAt: i.disabledAt?.toISOString(),
  })));
});

chatRouter.put('/instructions/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  const instruction = await prisma.userInstruction.update({
    where: { id },
    data: {
      status: active ? 'ACTIVE' : 'DISABLED',
      disabledAt: active ? null : new Date(),
    },
  });

  res.json({
    id: instruction.id,
    status: instruction.status.toLowerCase(),
  });
});

chatRouter.delete('/instructions/:id', async (req, res) => {
  await prisma.userInstruction.delete({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

function mapMsg(msg: any) {
  return {
    id: msg.id,
    role: msg.role.toLowerCase(),
    content: msg.content,
    classification: msg.classification?.toLowerCase(),
    metadata: msg.metadata ?? undefined,
    instructionId: msg.instructionId ?? undefined,
    createdAt: msg.createdAt.toISOString(),
  };
}
