export interface Config {
    grafana: {
        /**
         * Domain used by users to access Grafana web UI.
         * Example: https://monitoring.eu.my-company.com/
         * @visibility frontend
         */
        domain: string;

        /**
         * Path to use for requests via the proxy, defaults to /grafana/api
         * @visibility frontend
         */
        proxyPath?: string;
    }
}