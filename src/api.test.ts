import { IdentityApi } from "@backstage/core-plugin-api";
import { UnifiedAlertingGrafanaApiClient } from "./api";
import { setupRequestMockHandlers } from "@backstage/test-utils";
import { setupServer } from "msw/node";
import { rest } from "msw";

describe("UnifiedAlertingGrafanaApiClient.alertsForSelector", () => {
  const server = setupServer(
    rest.get(
      "http://localhost/proxy/grafana/api/api/ruler/grafana/api/v1/rules",
      (_, res, ctx) => {
        return res(ctx.json(grafanaRules));
      }
    ),
    rest.get(
      "http://localhost/proxy/grafana/api/api/prometheus/grafana/api/v1/alerts",
      (_, res, ctx) => {
        return res(ctx.json(prometheusGrafanaAlerts));
      }
    )
  );
  setupRequestMockHandlers(server);

  const client = new UnifiedAlertingGrafanaApiClient({
    domain: "http://localhost",
    discoveryApi: {
      getBaseUrl: (_) => Promise.resolve("http://localhost/proxy"),
    },
    identityApi: {
      getCredentials: () => Promise.resolve({ token: "token" }),
    } as unknown as IdentityApi,
  });

  it("should return Grafana alerts matching the label", async () => {
    const actual = await client.alertsForSelector("bc=cow-service");
    expect(actual).toEqual([
      {
        name: "The Cows Got Out Again Alert",
        state: "Normal",
        url: "http://localhost/alerting/grafana/A8KId9MVk/view",
      },
    ]);
  });

  it("should return an alert state of 'n/a' when no matching alert instance", async () => {
    const actual = await client.alertsForSelector("bc=backstage");
    expect(actual).toEqual([
      {
        name: "Software Catalog - GitHub Provider Errors",
        state: "n/a",
        url: "http://localhost/alerting/grafana/I7VlW6GVz/view",
      },
    ]);
  });
});

const grafanaRules = {
  "General Alerting": [
    {
      name: "Software Catalog - GitHub Provider Errors",
      interval: "1m",
      rules: [
        {
          expr: "",
          for: "1m",
          labels: {
            alertname: "Software Catalog - GitHub Provider Errors",
            bc: "backstage",
          },
          annotations: {},
          grafana_alert: {
            id: 168,
            orgId: 1,
            title: "Software Catalog - GitHub Provider Errors",
            condition: "A",
            data: [],
            updated: "2023-01-24T00:06:34Z",
            intervalSeconds: 60,
            version: 6,
            uid: "I7VlW6GVz",
            namespace_uid: "RfKIOrMVk",
            namespace_id: 434,
            rule_group: "Software Catalog - GitHub Provider Errors",
            no_data_state: "OK",
            exec_err_state: "Alerting",
          },
        },
      ],
    },
  ],
  "Team Alerting": [
    {
      name: "The Cows Got Out Again Alert",
      interval: "1m",
      rules: [
        {
          expr: "",
          for: "5m",
          labels: {
            alertname: "The Cows Got Out Again Alert",
            bc: "cow-service",
            rule_uid: "A8KId9MVk",
          },
          annotations: {},
          grafana_alert: {
            id: 28,
            orgId: 1,
            title: "The Cows Got Out Again Alert",
            condition: "B",
            data: [],
            updated: "2023-01-24T18:59:04Z",
            intervalSeconds: 60,
            version: 3,
            uid: "A8KId9MVk",
            namespace_uid: "qHBliCZ4z",
            namespace_id: 426,
            rule_group: "The Cows Got Out Again Alert",
            no_data_state: "OK",
            exec_err_state: "Alerting",
          },
        },
      ],
    },
  ],
};

const prometheusGrafanaAlerts = {
  status: "success",
  data: {
    alerts: [
      {
        labels: {
          alertname: "The Cows Got Out Again Alert",
          bc: "cow-service",
          datasource_uid: "hXvTw1-Mk",
          grafana_folder: "Team Alerting",
          ref_id: "A",
          rule_uid: "faKSOrGVz",
        },
        annotations: {
          __alertId__: "221",
          __dashboardUid__: "Ukd1WCW4k",
          __panelId__: "7",
        },
        state: "Normal",
        activeAt: "2023-01-24T19:00:00Z",
        value: "",
      },
    ],
  },
};
