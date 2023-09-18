# Grafana plugin for Backstage

The Grafana plugin is a frontend plugin that lists Grafana alerts and dashboards. It supports multiple Grafana hosts configuration.
It includes several components that can be integrated into Backstage:

* The `EntityGrafanaDashboardsCard` component which can display dashboards for a specific entity
* The `EntityGrafanaAlertsCard` component which can display recent alerts for a specific entity
* The `EntityOverviewDashboardViewer` component which can embed an "overview" dashboard for a specific entity
* The `DashboardViewer` component which can embed any dashboard

## Setup

Find [installation instructions](./docs/index.md#installation) in our documentation.

## How does it look?

Entity alerts card:

![Alerts card](./docs/alerts_card.png)

Entity dashboards card:

![Dashboards card](./docs/dashboards_card.png)

## License

This library is under the [Apache 2.0](LICENSE) license.
