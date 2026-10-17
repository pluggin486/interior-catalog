import type { ProblemDetails } from '@interior/contracts'

export class ApiProblem extends Error {
  constructor(
    public status: 400 | 409 | 503,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message)
  }
}
export function invalid(field: string, message: string): never {
  throw new ApiProblem(400, 'Проверьте данные запроса.', { [field]: [message] })
}
export function problem(status: number, title: string, errors?: Record<string, string[]>): ProblemDetails {
  return { type: 'about:blank', title, status, ...(errors ? { errors } : {}) }
}
