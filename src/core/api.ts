import { Logger } from './logger'

const BASE_URL = 'https://api.sftools.mar21.eu/api/'

export class SiteApiError extends Error {
  error: string

  constructor(error: string) {
    super(error)

    this.error = error
  }
}

async function request<TResponse>(method: string, url: string, init?: RequestInit) {
  Logger.log('APICALL', `${method} ${url}`)

  let data: { error?: string }

  try {
    const response = await fetch(url, init)

    data = (await response.json()) as { error?: string }
  } catch (error) {
    throw new SiteApiError(error instanceof Error ? error.message : String(error))
  }

  if (data.error) {
    throw new SiteApiError(data.error)
  }

  return data as TResponse
}

export class SiteAPI {
  static post<TResponse = unknown>(endpoint: string, data: unknown) {
    return request<TResponse>('POST', `${BASE_URL}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  static get<TResponse = unknown>(endpoint: string, params: Record<string, string | string[]> = {}) {
    const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]))

    return request<TResponse>('GET', `${BASE_URL}${endpoint}?${query.toString()}`)
  }
}
