import { publicDb } from '@/lib/public-report';

export const dynamic = 'force-dynamic';

const go = (path: string) =>
  new Response(null, {
    status: 307,
    headers: {
      Location: path,
    },
  });

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: { code: string };
  },
) {
  const code =
    params.code.toLowerCase();

  if (!/^[0-9a-f]{8}$/.test(code)) {
    return go('/');
  }

  const { data } = await publicDb()
    .from('reports')
    .select('id')
    .gte(
      'id',
      `${code}-0000-0000-0000-000000000000`,
    )
    .lte(
      'id',
      `${code}-ffff-ffff-ffff-ffffffffffff`,
    )
    .order('created_at', {
      ascending: false,
    })
    .limit(1);

  const id =
    (data as any)?.[0]?.id;

  return go(
    id
      ? `/pet/${id}`
      : '/',
  );
}
