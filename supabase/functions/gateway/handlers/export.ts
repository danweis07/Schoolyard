/**
 * Export handler — CSV exports (admin-only).
 *
 * Ported from supabase/functions/volunteer-hours-export/.
 */

import type { GatewayContext } from '../types.ts'
import { csvResponse, jsonError } from '../response.ts'

interface ExportPayload {
  start?: string
  end?: string
}

function toCsv(
  rows: Array<{
    served_on: string
    hours: number
    notes: string | null
    role: string | null
    user: string
  }>,
): string {
  const header = ['date', 'hours', 'role', 'user', 'notes']
  const lines = [header.join(',')]
  for (const row of rows) {
    const cells = [
      row.served_on,
      row.hours.toString(),
      row.role ?? '',
      row.user,
      (row.notes ?? '').replace(/"/g, '""'),
    ]
    lines.push(cells.map((c) => `"${c}"`).join(','))
  }
  return lines.join('\n') + '\n'
}

export async function handleExport(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, schoolId, schoolSlug, origin } = ctx

  if (ctx.route.resource !== 'volunteer-hours') {
    return jsonError(404, `unknown export: ${ctx.route.resource}`, origin)
  }

  const payload = (await req.json()) as ExportPayload

  let query = supabase
    .from('volunteer_hours')
    .select('served_on, hours, notes, role_id, user_id, volunteer_roles(title)')
    .eq('school_id', schoolId)
    .order('served_on', { ascending: false })
  if (payload.start) query = query.gte('served_on', payload.start)
  if (payload.end) query = query.lte('served_on', payload.end)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = (await query) as any
  if (error) return jsonError(500, `query failed: ${error.message}`, origin)

  // Resolve user emails via admin API
  const userIds = Array.from(new Set(rows.map((r: { user_id: string }) => r.user_id)))
  const userEmails = new Map<string, string>()
  for (const id of userIds) {
    const { data } = await supabase.auth.admin.getUserById(id as string)
    if (data.user?.email) userEmails.set(id as string, data.user.email)
  }

  const csv = toCsv(
    rows.map(
      (r: {
        served_on: string
        hours: number
        notes: string | null
        user_id: string
        volunteer_roles?: { title: string } | null
      }) => ({
        served_on: r.served_on,
        hours: r.hours,
        notes: r.notes,
        role: r.volunteer_roles?.title ?? null,
        user: userEmails.get(r.user_id) ?? r.user_id,
      }),
    ),
  )

  const filename = `volunteer-hours-${schoolSlug}-${new Date().toISOString().slice(0, 10)}.csv`
  return csvResponse(csv, filename, origin)
}
