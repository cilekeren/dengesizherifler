const BASE = 58268
const KEY = 'count'

export async function onRequestGet({ env }) {
  const current = await env.views.get(KEY)
  const next = current === null ? BASE : parseInt(current, 10) + 1
  await env.views.put(KEY, String(next))
  return Response.json({ views: next }, { headers: { 'Cache-Control': 'no-store' } })
}
