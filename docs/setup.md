# Setup

## App Locations
- Frontend app: `packages/app`
- Backend app: `packages/backend`

## Installation

Add the plugin to your frontend app:

```bash
cd packages/app && yarn add @k-phoen/backstage-plugin-grafana
```

Add the plugin to your `package.json` in the frontend so your Docker build will have the required dependency.

Location: `packages/app/package.json`

```json
...
"dependencies": {
    ...
    "@material-ui/core": "^4.12.2",
    "@material-ui/icons": "^4.9.1",
    "@k-phoen/backstage-plugin-grafana": "^0.1.22"
}
```

## Configuration
Configure the plugin in `app-config.yaml`. The proxy endpoint described below will allow the frontend to authenticate with Grafana without exposing your API key to users. Follow these steps to create an [API key](https://grafana.com/docs/grafana/latest/http_api/auth/#create-api-token) if you don't already have one. `Viewer` access will be enough.

```yaml
# app-config.yaml
proxy:
  '/grafana/api':
    # May be a public or an internal DNS
    target: https://grafana.host/
    headers:
      Authorization: Bearer ${GRAFANA_TOKEN}
# The below block is required for the docker build to complete without error.
grafana:
  # Publicly accessible domain
  domain: https://monitoring.company.com

  # Is unified alerting enabled in Grafana?
  # See: https://grafana.com/blog/2021/06/14/the-new-unified-alerting-system-for-grafana-everything-you-need-to-know/
  # Optional. Default: false
  unifiedAlerting: false
```
If you see this error, you didn't add the Grafana key to your `app-config.yaml`:
```
Loaded config from app-config.yaml
Error: Configuration does not match schema
  Config must have required property 'grafana' { missingProperty=grafana } at 
error Command failed with exit code 1.
```
Add the plugin import to your `EntityPage.tsx` as defined in the [official documentation](https://github.com/k-phoen/backstage-plugin-grafana/blob/main/docs/embed-dashboards-on-page.md).

```tsx
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
