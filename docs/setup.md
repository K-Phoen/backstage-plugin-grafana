# Setup

Add the plugin to your frontend app:

```bash
cd packages/app && yarn add @k-phoen/backstage-plugin-grafana
```

Configure the plugin in `app-config.yaml`. The proxy endpoint described below will allow the frontend
to authenticate with Grafana without exposing your API key to users.
[Create an API key](https://grafana.com/docs/grafana/latest/http_api/auth/#create-api-token) if you don't already have one. `Viewer` access will be enough.

```yaml
# app-config.yaml
proxy:
  '/grafana/api':
    # May be a public or an internal DNS
    target: https://grafana.host/
    headers:
      Authorization: Bearer ${GRAFANA_TOKEN}

grafana:
  # Publicly accessible domain
  domain: https://monitoring.company.com

  # Is unified alerting enabled in Grafana?
  # See: https://grafana.com/blog/2021/06/14/the-new-unified-alerting-system-for-grafana-everything-you-need-to-know/
  # Optional. Default: false
  unifiedAlerting: false
```
Add the plugin import to your EntityPage.tsx as defined in https://github.com/k-phoen/backstage-plugin-grafana/blob/main/docs/embed-dashboards-on-page.md
```
// packages/app/src/EntityPage.tsx

import {
  EntityGrafanaDashboardsCard,
  EntityGrafanaAlertsCard
} from '@k-phoen/backstage-plugin-grafana';

```
 
Expose the plugin to Backstage:

```ts
// packages/app/src/plugins.tsx

// other plugins...

export { grafanaPlugin } from '@k-phoen/backstage-plugin-grafana';
```

That's it! You can now update your entities pages to [display alerts](alerts-on-component-page.md) or [dashboards](dashboards-on-component-page.md) related to them.
