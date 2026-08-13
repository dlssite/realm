export interface SdkOptions {
  baseUrl: string;
  getToken?: () => string | null;
}

export class RealmSdk {
  private baseUrl: string;
  private getToken?: () => string | null;

  constructor(options: SdkOptions) {
    this.baseUrl = options.baseUrl;
    if (options.getToken !== undefined) {
      this.getToken = options.getToken;
    }
  }

  async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken?.();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }
}
