import type { ProblemDetails } from '@interior/contracts'

export class ApiError extends Error {
  constructor(
    public problem: Partial<ProblemDetails>,
    public status: number,
  ) {
    super(
      Object.values(problem.errors ?? {})
        .flat()
        .join(' ') ||
        problem.detail ||
        problem.title ||
        'Не удалось выполнить запрос. Повторите попытку.',
    )
  }
}
export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) throw new ApiError(await response.json().catch(() => ({})), response.status)
  return (await response.json()) as T
}
