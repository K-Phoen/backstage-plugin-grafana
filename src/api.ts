/*
 * Copyright 2021 Kévin Gomez <contact@kevingomez.fr>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createApiRef, DiscoveryApi, IdentityApi } from '@backstage/core-plugin-api';
import { Alert, Dashboard } from './types';

export interface GrafanaApi {
  dashboardsByTag(tag: string): Promise<Dashboard[]>;
  alertsByDashboardTag(tag: string): Promise<Alert[]>;
}

export const grafanaApiRef = createApiRef<GrafanaApi>({
  id: 'plugin.grafana.service',
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
    const dashboards: Dashboard[] = [];
    const finalTags: string[] = tag.split(',');
    await Promise.all(
      finalTags.map(async t => {
        const response = await this.fetch<Dashboard[]>(
          `/api/search?type=dash-db&tag=${t}`,
        );
        dashboards.push(
          ...response.map(dashboard => ({
            id: dashboard.id,
            title: dashboard.title,
            url: this.domain + dashboard.url,
            folderTitle: dashboard.folderTitle,
            folderUrl: this.domain + dashboard.folderUrl,
          })),
        );
      }),
    );

    const dashboardIds = dashboards.map(d => d.id);
    return dashboards.filter(
      // Checks if the dashboardId is present more than once, so the `index + 1` is required to avoid finding itself
      ({ id }, index) => !dashboardIds.includes(id, index + 1),
    );
  }

  async alertsByDashboardTag(tag: string): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const finalTags: string[] = tag.split(',');
    await Promise.all(
      finalTags.map(async t => {
        const response = await this.fetch<Alert[]>(
          `/api/alerts?dashboardTag=${t}`,
        );
        alerts.push(
          ...response.map(alert => ({
            id: alert.id,
            panelId: alert.panelId,
            name: alert.name,
            state: alert.state,
            url: this.domain + alert.url,
          })),
        );
      }),
    );

    const alertIds = alerts.map(a => a.id);
    return alerts.filter(
      // Checks if the alertId is present more than once, so the `index + 1` is required to avoid finding itself
      ({ id }, index) => !alertIds.includes(id, index + 1),
    );
  }

  private async apiUrl() {
    const proxyUrl = await this.discoveryApi.getBaseUrl('proxy');
    return proxyUrl + this.proxyPath;
  }

  private async addAuthHeaders(init: RequestInit): Promise<RequestInit> {
    const { token } = await this.identityApi.getCredentials();
    const headers = init.headers || {};

    return {
      ...init,
      headers: {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
    };
  }
}
