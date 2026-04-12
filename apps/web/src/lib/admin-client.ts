/**
 * Admin API client — thin wrapper over fetch() calls to the gateway.
 *
 * Replaces direct Supabase browser client CRUD in admin pages.
 * All data operations go through the gateway edge function;
 * the Supabase client is only used for auth (sign-in/sign-out/getSession).
 */

export interface AdminClientOptions {
  gatewayUrl: string
  accessToken: string
  schoolSlug: string
}

export function createAdminClient(options: AdminClientOptions) {
  const { gatewayUrl, accessToken, schoolSlug } = options

  const base = `${gatewayUrl}/functions/v1/gateway`
  const headers: HeadersInit = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ data: T | null; error: string | null }> {
    try {
      const res = await fetch(`${base}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      if (res.status === 204) return { data: null, error: null }

      const json = await res.json()
      if (!res.ok) {
        return { data: null, error: json.error ?? `HTTP ${res.status}` }
      }
      return { data: json as T, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'network error' }
    }
  }

  const schoolParam = `?school=${encodeURIComponent(schoolSlug)}`

  return {
    // ── Profile ────────────────────────────────────────────────
    getProfile() {
      return request<{
        id: string
        display_name: string | null
        role: string
        school_id: string | null
        district_id: string | null
      }>('GET', `/admin/profile${schoolParam}`)
    },

    // ── Counts ─────────────────────────────────────────────────
    getCounts() {
      return request<Record<string, number>>('GET', `/admin/counts${schoolParam}`)
    },

    // ── School profile ──────────────────────────────────────────
    getSchool() {
      return request<{
        id: string
        name: string
        short_name: string | null
        slug: string
        tagline: string
        mascot: string
        address: string
        phone: string
        email: string
        website: string
        grades: string
        founded: string
        enrollment: number
        title_one: boolean
        timezone: string
        branding: {
          primaryColor?: string
          accentColor?: string
          logo?: string
          heroImage?: string
          mascotImage?: string
        }
        social_links: {
          instagram?: string
          facebook?: string
          twitter?: string
          youtube?: string
        }
      }>('GET', `/admin/school${schoolParam}`)
    },

    updateSchool(data: Record<string, unknown>) {
      return request<null>('PUT', `/admin/school${schoolParam}`, data)
    },

    // ── Generic CRUD ───────────────────────────────────────────
    list<T = unknown>(resource: string) {
      return request<T[]>('GET', `/admin/${resource}${schoolParam}`)
    },

    get<T = unknown>(resource: string, id: string) {
      return request<T>('GET', `/admin/${resource}/${id}${schoolParam}`)
    },

    create<T = { id: string }>(resource: string, data: unknown) {
      return request<T>('POST', `/admin/${resource}${schoolParam}`, data)
    },

    update(resource: string, id: string, data: unknown) {
      return request<null>('PUT', `/admin/${resource}/${id}${schoolParam}`, data)
    },

    remove(resource: string, id: string) {
      return request<null>('DELETE', `/admin/${resource}/${id}${schoolParam}`)
    },

    // ── Form responses (read-only, scoped by form) ────────────
    getFormResponses(formId: string) {
      return request<Array<{
        id: string
        form_id: string
        user_id: string
        student_name: string | null
        responses: Record<string, unknown>
        signature: Record<string, unknown> | null
        submitted_at: string
      }>>('GET', `/admin/form-responses/${formId}${schoolParam}`)
    },

    // ── Form reminder (send push to non-submitters) ───────────
    sendFormReminder(formId: string) {
      return request<{ sent: number }>('POST', `/admin/form-reminder${schoolParam}`, {
        form_id: formId,
      })
    },
  }
}
