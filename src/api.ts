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
import { QueryEvaluator } from './query';
import { Alert, Dashboard } from './types';

export interface GrafanaApi {
  listDashboards(query: string): Promise<Dashboard[]>;
  alertsForSelectors(selectors: string | string[]): Promise<Alert[]>;
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

type UnifiedAlertState = 'Normal' | 'Pending' | 'Alerting' | 'NoData' | 'Error' | 'n/a';

interface AlertInstance {
  labels: Record<string,string>;
  state: UnifiedAlertState;
}

interface AlertsData {
  data: { alerts: AlertInstance[]};
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

const isSingleWord = (input: string): boolean => {
  return input.match(/^[\w-]+$/g) !== null;
}

class Client {
  private readonly discoveryApi: DiscoveryApi;
  private readonly identityApi: IdentityApi;
  private readonly proxyPath: string;
  private readonly queryEvaluator: QueryEvaluator;

  constructor(opts: Options) {
    this.discoveryApi = opts.discoveryApi;
    this.identityApi = opts.identityApi;
    this.proxyPath = opts.proxyPath ?? DEFAULT_PROXY_PATH;
    this.queryEvaluator = new QueryEvaluator();
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

  async listDashboards(domain: string, query: string): Promise<Dashboard[]> {
    if (isSingleWord(query)) {
      return this.dashboardsByTag(domain, query);
    }

    return this.dashboardsForQuery(domain, query);
  }

  async dashboardsForQuery(domain: string, query: string): Promise<Dashboard[]> {
    const parsedQuery = this.queryEvaluator.parse(query);
    const response = await this.fetch<Dashboard[]>(`/api/search?type=dash-db`);
    const allDashboards = this.fullyQualifiedDashboardURLs(domain, response);

    return allDashboards.filter((dashboard) => {
      return this.queryEvaluator.evaluate(parsedQuery, dashboard) === true;
    });
  }

  async dashboardsByTag(domain: string, tag: string): Promise<Dashboard[]> {
    const response = await this.fetch<Dashboard[]>(`/api/search?type=dash-db&tag=${tag}`);

    return this.fullyQualifiedDashboardURLs(domain, response);
  }

  private fullyQualifiedDashboardURLs(domain: string, dashboards: Dashboard[]): Dashboard[] {
    return dashboards.map(dashboard => ({
      ...dashboard,
      url: domain + dashboard.url,
      folderUrl: domain + dashboard.folderUrl,
    }));
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

export class GrafanaApiClient implements GrafanaApi {
  private readonly domain: string;
  private readonly client: Client;

  constructor(opts: Options) {
    this.domain = opts.domain;
    this.client = new Client(opts);
  }

  async listDashboards(query: string): Promise<Dashboard[]> {
    return this.client.listDashboards(this.domain, query);
  }

  async alertsForSelectors(dashboardTag: string): Promise<Alert[]> {
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

  async listDashboards(query: string): Promise<Dashboard[]> {
    return this.client.listDashboards(this.domain, query);
  }

  async alertsForSelectors(selectors: string | string[]): Promise<Alert[]> {
    const labelSelectors = Array.from(selectors);

    const rulesResponse = await this.client.fetch<Record<string, AlertRuleGroupConfig[]>>('/api/ruler/grafana/api/v1/rules');
    const rules = Object.values(rulesResponse).flat().map(ruleGroup => ruleGroup.rules).flat();
    const alertsResponse = await this.client.fetch<AlertsData>('/api/prometheus/grafana/api/v1/alerts');

    return labelSelectors.map(selector => {
      const [label, labelValue] = selector.split('=');

      const matchingRules = rules.filter(rule => rule.labels && rule.labels[label] === labelValue);
      const alertInstances = alertsResponse.data.alerts.filter(alertInstance => alertInstance.labels[label] === labelValue);
  
      return matchingRules.map(rule => {
        const matchingAlertInstances = alertInstances.filter(
          alertInstance => alertInstance.labels.alertname === rule.grafana_alert.title
        );
  
        const aggregatedAlertStates = matchingAlertInstances.reduce(
          (previous, alert) => {
            switch (alert.state) {
              case 'Normal':
                previous.normal += 1;
                break;
              case 'Pending':
                previous.pending += 1;
                break;
              case 'Alerting':
                previous.alerting += 1;
                break;
              case 'NoData':
                previous.noData += 1;
                break;
              case 'Error':
                previous.error += 1;
                break;
              default:
                previous.invalid += 1;
            }
      
            return previous;
          },
          { normal: 0, pending: 0, alerting: 0, noData: 0, error: 0, invalid: 0 },
        );      
  
        return {
          name: rule.grafana_alert.title,
          url: `${this.domain}/alerting/grafana/${rule.grafana_alert.uid}/view`,
          state: this.getState(aggregatedAlertStates, matchingAlertInstances.length),
        };
      })
    }).flat();
  }

  private getState(states: {
    normal: number,
    pending: number,
    alerting: number,
    noData: number,
    error: number,
    invalid: number,
  }, totalAlerts: number): UnifiedAlertState {
    if (states.alerting > 0) {
      return "Alerting"
    } else if (states.error > 0) {
      return 'Error'
    } else if (states.pending > 0) {
      return 'Pending'
    }
    if (states.noData === totalAlerts) {
      return 'NoData'
    } else if (states.normal === totalAlerts || states.normal + states.noData === totalAlerts) {
      return 'Normal'
    } 

    return 'n/a'
  }
}
