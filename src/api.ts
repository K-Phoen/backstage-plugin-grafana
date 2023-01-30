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
  dashboardsByTag(tags: string): Promise<Dashboard[]>;
  alertsForSelector(selectors: string): Promise<Alert[]>;
}

interface AlertRuleGroupConfig {
  name: string;
  rules: AlertRule[];
}

interface GrafanaAlert {
  id: number;
  panelId: number;
  name: string;
  state: string;
  url: string;
}

interface UnifiedGrafanaAlert {
  uid: string;
  title: string;
}

interface AlertRule {
  labels: Record<string, string>;
  grafana_alert: UnifiedGrafanaAlert;
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

class Client {
  private readonly discoveryApi: DiscoveryApi;
  private readonly identityApi: IdentityApi;
  private readonly proxyPath: string;

  constructor(opts: Options) {
    this.discoveryApi = opts.discoveryApi;
    this.identityApi = opts.identityApi;
    this.proxyPath = opts.proxyPath ?? DEFAULT_PROXY_PATH;
  }

  public async fetch<T = any>(input: string, init?: RequestInit): Promise<T> {
    const apiUrl = await this.apiUrl();
    const authedInit = await this.addAuthHeaders(init || {});

    const resp = await fetch(`${apiUrl}${input}`, authedInit);
    if (!resp.ok) {
      throw new Error(`Request failed with ${resp.status} ${resp.statusText}`);
    }

    return await resp.json();
  }

  public async apiUrl() {
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

export class GrafanaApiClient implements GrafanaApi {
  private readonly domain: string;
  private readonly client: Client;

  constructor(opts: Options) {
    this.domain = opts.domain;
    this.client = new Client(opts);
  }

  async dashboardsByTag(tags: string): Promise<Dashboard[]> {
    const dashboards: Dashboard[] = [];
    const tagList: string[] = tags.split(',')

    await Promise.all(tagList.map(async tag => {
      const response = await this.client.fetch<Dashboard[]>(`/api/search?type=dash-db&tag=${tag}`);
      dashboards.push(...response.map(dashboard => ({
        title: dashboard.title,
        url: this.domain + dashboard.url,
        folderTitle: dashboard.folderTitle,
        folderUrl: this.domain + dashboard.folderUrl,
      })));
    }));

    const dashboardUrls = dashboards.map(d => d.url);
    return dashboards.filter(
      // Checks if the dashboardUrl is present more than once, so the `index + 1` is required to avoid finding itself
      ({ url }, index) => !dashboardUrls.includes(url, index + 1),
    );
  }

  async alertsForSelector(dashboardTags: string): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const dashboardTagList: string[] = dashboardTags.split(',');

    await Promise.all(dashboardTagList.map(async dashboardTag => {
      const response = await this.client.fetch<GrafanaAlert[]>(`/api/alerts?dashboardTag=${dashboardTag}`);
      alerts.push(...response.map(alert => ({
        name: alert.name,
        state: alert.state,
        url: this.domain + alert.url,
      })));
    }));

    const alertUrls = alerts.map(a => a.url);
    return alerts.filter(
      // Checks if the alertUrl is present more than once, so the `index + 1` is required to avoid finding itself
      ({ url }, index) => !alertUrls.includes(url, index + 1),
    );
  }
}

export class UnifiedAlertingGrafanaApiClient implements GrafanaApi {
  private readonly domain: string;
  private readonly client: Client;

  constructor(opts: Options) {
    this.domain = opts.domain;
    this.client = new Client(opts);
  }

  async dashboardsByTag(tags: string): Promise<Dashboard[]> {
    const dashboards: Dashboard[] = [];
    const tagList: string[] = tags.split(',')

    await Promise.all(tagList.map(async tag => {
      const response = await this.client.fetch<Dashboard[]>(`/api/search?type=dash-db&tag=${tag}`);
      dashboards.push(...response.map(dashboard => ({
        title: dashboard.title,
        url: this.domain + dashboard.url,
        folderTitle: dashboard.folderTitle,
        folderUrl: this.domain + dashboard.folderUrl,
      })));
    }));

    const dashboardUrls = dashboards.map(d => d.url);
    return dashboards.filter(
      // Checks if the dashboardUrl is present more than once, so the `index + 1` is required to avoid finding itself
      ({ url }, index) => !dashboardUrls.includes(url, index + 1),
    );
  }

  async alertsForSelector(selectors: string): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const selectorList: string[] = selectors.split(',');

    await Promise.all(selectorList.map(async selector => {
      const response = await this.client.fetch<Record<string, AlertRuleGroupConfig[]>>('/api/ruler/grafana/api/v1/rules');
      const rules = Object.values(response).flat().map(ruleGroup => ruleGroup.rules).flat();
      const [label, labelValue] = selector.split('=');

      const matchingRules = rules.filter(rule => rule.labels && rule.labels[label] === labelValue);

      alerts.push(...matchingRules.map(rule => ({
        name: rule.grafana_alert.title,
        url: `${this.domain}/alerting/grafana/${rule.grafana_alert.uid}/view`,
        state: "n/a",
      })));
    }));

    const alertUrls = alerts.map(a => a.url);
    return alerts.filter(
      // Checks if the alertUrl is present more than once, so the `index + 1` is required to avoid finding itself
      ({ url }, index) => !alertUrls.includes(url, index + 1),
    );
  }
}
