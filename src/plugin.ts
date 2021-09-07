import { configApiRef, createApiFactory, createComponentExtension, createPlugin, discoveryApiRef, identityApiRef } from '@backstage/core-plugin-api';
import { GrafanaApiClient, grafanaApiRef } from './api';

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

export const grafanaPlugin = createPlugin({
  id: 'grafana',
  apis: [
    createApiFactory({
      api: grafanaApiRef,
      deps: { discoveryApi: discoveryApiRef, identityApi: identityApiRef, configApi: configApiRef },
      factory: ({ discoveryApi, identityApi, configApi }) => new GrafanaApiClient({
        discoveryApi: discoveryApi,
        identityApi: identityApi,
        domain: configApi.getString('grafana.domain'),
        proxyPath: configApi.getOptionalString('grafana.proxyPath'),
      }),
    }),
  ],
});

export const EntityGrafanaDashboardsCard = grafanaPlugin.provide(
  createComponentExtension({
    component: {
      lazy: () =>
        import('./components/DashboardsCard').then(m => m.DashboardsCard
      ),
    },
  })
);

export const EntityGrafanaAlertsCard = grafanaPlugin.provide(
  createComponentExtension({
    component: {
      lazy: () =>
        import('./components/AlertsCard').then(m => m.AlertsCard
      ),
    },
  })
);