import { db, handle, HttpError, requireUser } from '@/lib/server';

export const POST = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const { data } = await db().from('reports')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', ctx.params.id).eq('user_id', user.id).eq('status', 'open')
    .select('id');
  if (!data?.length) throw new HttpError(404, 'Ocorrência não encontrada');
  return Response.json({ ok: true });
});
