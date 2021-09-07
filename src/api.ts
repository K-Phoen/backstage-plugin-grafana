import { createApiRef, DiscoveryApi, IdentityApi } from '@backstage/core-plugin-api';
import { Dashboard } from './types';

export interface GrafanaApi {
  dashboardsByTag(tag: string): Promise<Dashboard[]>;
}

export const grafanaApiRef = createApiRef<GrafanaApi>({
  id: 'plugin.grafana.service',
  description: 'Used by the Grafana plugin to make requests',
});

export type Options = {
  discoveryApi: DiscoveryApi;
  identityApi: IdentityApi;

  /**
   * Domain used by users to access Grafana web UI.
   * Example: https://monitoring.my-company.com/
   */
  domain: string;

  /**
   * Path to use for requests via the proxy, defaults to /grafana/api
   */
  proxyPath?: string;
};

const DEFAULT_PROXY_PATH = '/grafana/api';

export class GrafanaApiClient implements GrafanaApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly identityApi: IdentityApi;
  private readonly proxyPath: string;
  private readonly domain: string;

  constructor(opts: Options) {
    this.discoveryApi = opts.discoveryApi;
    this.identityApi = opts.identityApi;
    this.domain = opts.domain;
    this.proxyPath = opts.proxyPath ?? DEFAULT_PROXY_PATH;
  }

  private async fetch<T = any>(input: string, init?: RequestInit): Promise<T> {
    const apiUrl = await this.apiUrl();
    const authedInit = await this.addAuthHeaders(init || {});

    const resp = await fetch(`${apiUrl}${input}`, authedInit);
    if (!resp.ok) {
      throw new Error(`Request failed with ${resp.status} ${resp.statusText}`);
    }

    return await resp.json();
  }

  async dashboardsByTag(tag: string): Promise<Dashboard[]> {
    const response = await this.fetch<Dashboard[]>(`/api/search?type=dash-db&tag=${tag}`);

    return response.map(dashboard => (
      {
        title: dashboard.title,
        url: this.domain + dashboard.url,
      }
    ));
  }

  private async apiUrl() {
    const proxyUrl = await this.discoveryApi.getBaseUrl('proxy');
    return proxyUrl + this.proxyPath;
  }

  private async addAuthHeaders(init: RequestInit): Promise<RequestInit> {
    const authToken = await this.identityApi.getIdToken();
    const headers = init.headers || {};

    return {
      ...init,
      headers: {
        ...headers,
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      }
    };
  }
}
