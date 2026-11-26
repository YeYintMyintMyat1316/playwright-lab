import { APIRequestContext } from '@playwright/test';

export interface AdminOrder {
  id: string;
  display_id: number;
  email: string;
  total: number;
  items: { title: string; product_title?: string; quantity: number }[];
}

/**
 * Minimal Medusa v2 Admin API client used to verify that an order placed in the
 * storefront exists in the back office.
 *
 * Credentials are read from environment variables and are never stored in the repo:
 *   MEDUSA_BACKEND_URL     e.g. https://<your-medusa-backend>.onrender.com
 *   MEDUSA_ADMIN_EMAIL     admin user email (from your instructor)
 *   MEDUSA_ADMIN_PASSWORD  admin user password (from your instructor)
 */
export class MedusaAdminApi {
  private token = '';

  constructor(
    private readonly request: APIRequestContext,
    private readonly backendUrl = process.env.MEDUSA_BACKEND_URL ?? '',
  ) {}

  static isConfigured(): boolean {
    return Boolean(
      process.env.MEDUSA_BACKEND_URL && process.env.MEDUSA_ADMIN_EMAIL && process.env.MEDUSA_ADMIN_PASSWORD,
    );
  }

  async login(): Promise<void> {
    const response = await this.request.post(`${this.backendUrl}/auth/user/emailpass`, {
      data: { email: process.env.MEDUSA_ADMIN_EMAIL, password: process.env.MEDUSA_ADMIN_PASSWORD },
      timeout: 60_000,
    });
    if (!response.ok()) throw new Error(`Admin login failed: HTTP ${response.status()}`);
    this.token = (await response.json()).token;
  }

  async getOrder(orderId: string): Promise<AdminOrder> {
    const response = await this.request.get(`${this.backendUrl}/admin/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${this.token}` },
      params: { fields: 'id,display_id,email,total,*items' },
      timeout: 60_000,
    });
    if (!response.ok()) throw new Error(`GET /admin/orders/${orderId} failed: HTTP ${response.status()}`);
    return (await response.json()).order;
  }
}
