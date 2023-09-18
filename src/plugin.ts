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

import { configApiRef, createApiFactory, createComponentExtension, createPlugin, discoveryApiRef, identityApiRef } from '@backstage/core-plugin-api';
import {grafanaApiRef, GrafanaApiClient, GrafanaHost, DEFAULT_PROXY_PATH} from './api';

export const grafanaPlugin = createPlugin({
  id: 'grafana',
  apis: [
    createApiFactory({
      api: grafanaApiRef,
      deps: { discoveryApi: discoveryApiRef, identityApi: identityApiRef, configApi: configApiRef },
      factory: ({ discoveryApi, identityApi, configApi }) => {
        const hosts: GrafanaHost[] = configApi.getOptional('grafana.hosts') || [];
        const domain = configApi.getOptionalString('grafana.domain');

        // let's do some config validations:
        if (!domain && !hosts) {
          throw new Error("At least `grafana.domain` or `grafana.hosts` must be defined")
        }

        hosts.forEach(host => {
          if (!host.domain) {
            throw new Error("Each `grafana.hosts.domain` must be defined in the configuration")
          }
          if (!host.id) {
            throw new Error("Each `grafana.hosts.id` must be defined in the configuration")
          }
        });

        //for backward compatibility
        if (domain) {
          hosts.push({
            id: 'default',
            domain: domain,
            proxyPath: configApi.getOptionalString('grafana.proxyPath')  ?? DEFAULT_PROXY_PATH,
            unifiedAlerting: configApi.getOptionalBoolean('grafana.unifiedAlerting')
          })
        }

        return new GrafanaApiClient({
          discoveryApi: discoveryApi,
          identityApi: identityApi,
          hosts: hosts,
        });
      }
    }),
  ],
});

export const EntityGrafanaDashboardsCard = grafanaPlugin.provide(
  createComponentExtension({
    name: 'EntityGrafanaDashboardsCard',
    component: {
      lazy: () =>
        import('./components/DashboardsCard').then(m => m.DashboardsCard),
    },
  })
);

export const EntityGrafanaAlertsCard = grafanaPlugin.provide(
  createComponentExtension({
    name: 'EntityGrafanaAlertsCard',
    component: {
      lazy: () =>
        import('./components/AlertsCard').then(m => m.AlertsCard),
    },
  })
);

export const EntityOverviewDashboardViewer = grafanaPlugin.provide(
  createComponentExtension({
    name: 'EntityOverviewDashboardViewer',
    component: {
      lazy: () =>
        import('./components/DashboardViewer').then(m => m.EntityDashboardViewer),
    },
  })
);
