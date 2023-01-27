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
  alertsForSelector(selector: string): Promise<Alert[]>;
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

interface AlertInstance {
  labels: Record<string,string>;
  state: string;
}

interface AlertsData {
  data: { alerts: AlertInstance[]}
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

  async dashboardsByTag(tag: string): Promise<Dashboard[]> {
    const response = await this.client.fetch<Dashboard[]>(`/api/search?type=dash-db&tag=${tag}`);

    return response.map(dashboard => (
      {
        title: dashboard.title,
        url: this.domain + dashboard.url,
        folderTitle: dashboard.folderTitle,
        folderUrl: this.domain + dashboard.folderUrl,
      }
    ));
  }

  async alertsForSelector(dashboardTag: string): Promise<Alert[]> {
    const response = await this.client.fetch<GrafanaAlert[]>(`/api/alerts?dashboardTag=${dashboardTag}`);

    return response.map(alert => (
      {
        name: alert.name,
        state: alert.state,
        url: `${this.domain}${alert.url}?panelId=${alert.panelId}&fullscreen&refresh=30s`,
      }
    ));
  }
}

export class UnifiedAlertingGrafanaApiClient implements GrafanaApi {
  private readonly domain: string;
  private readonly client: Client;

  constructor(opts: Options) {
    this.domain = opts.domain;
    this.client = new Client(opts);
  }

  async dashboardsByTag(tag: string): Promise<Dashboard[]> {
    const response = await this.client.fetch<Dashboard[]>(`/api/search?type=dash-db&tag=${tag}`);

    return response.map(dashboard => (
      {
        title: dashboard.title,
        url: this.domain + dashboard.url,
        folderTitle: dashboard.folderTitle,
        folderUrl: this.domain + dashboard.folderUrl,
      }
    ));
  }

  async alertsForSelector(selector: string): Promise<Alert[]> {
    const response = await this.client.fetch<Record<string, AlertRuleGroupConfig[]>>('/api/ruler/grafana/api/v1/rules');
    const rules = Object.values(response).flat().map(ruleGroup => ruleGroup.rules).flat();
    const [label, labelValue] = selector.split('=');

    const matchingRules = rules.filter(rule => rule.labels && rule.labels[label] === labelValue);

    const alertsResponse = await this.client.fetch<AlertsData>('/api/prometheus/grafana/api/v1/alerts');
    const alertInstances = alertsResponse.data.alerts;

    // TODO: what if no labels
    return matchingRules.map((rule) => {
      const matchingAlerts = alertInstances.filter(
        (a) =>
          a.labels.alertname === rule.labels.alertname &&
          a.labels[label] === labelValue
      );
      return {
        name: rule.grafana_alert.title,
        url: `${this.domain}/alerting/grafana/${rule.grafana_alert.uid}/view`,
        state: matchingAlerts[0].state, // TODO: what if 0, multiple
      };
    });
  }
}
