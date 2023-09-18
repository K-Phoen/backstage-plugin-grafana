# Setup

Add the plugin to your frontend app:

```bash
cd packages/app && yarn add @k-phoen/backstage-plugin-grafana
```

Configure the plugin in `app-config.yaml`. The proxy endpoint described below will allow the frontend
to authenticate with Grafana without exposing your API key to users.
[Create an API key](https://grafana.com/docs/grafana/latest/http_api/auth/#create-api-token) if you don't already have one. `Viewer` access will be enough.

#### Minimal configuration for a single instance: 
```yaml
# app-config.yaml
proxy:
  '/grafana/api':
    # Maybe a public or an internal DNS
    target: https://grafana.host/
    headers:
      Authorization: Bearer ${GRAFANA_TOKEN}

grafana:
  # Publicly accessible domain
  domain: https://monitoring.company.com
  
  # Path to use for requests via the proxy, defaults to /grafana/api        
  # proxyPath: '/grafana/api'
    
  # Is unified alerting enabled in Grafana?
  # See: https://grafana.com/blog/2021/06/14/the-new-unified-alerting-system-for-grafana-everything-you-need-to-know/
  # Optional. Default: false
  unifiedAlerting: false
```

You don't need to specify `grafana/source-id` annotation in Catalog yaml files in this case. It's matched to the value `default`.

####  Multiple Grafana instances
If you need to use multiple Grafana instances, use `hosts` field. You also need to define a proxy for each host:

```yaml
# app-config.yaml
proxy:
  '/grafana/api':
    # Maybe a public or an internal DNS
    target: https://grafana.host/
    headers:
      Authorization: Bearer ${GRAFANA_TOKEN}
  '/grafana2/api':
    # Maybe a public or an internal DNS
    target: https://grafana2.host/
    headers:
      Authorization: Bearer ${GRAFANA2_TOKEN}

grafana:
  hosts:                
    - id: 'default' #unique host identifier used in Catalog Yaml annotation `grafana/source-id`
     
      # Publicly accessible domain
      domain: https://monitoring.company.com
    
      # Path to use for requests via the proxy, defaults to /grafana/api        
      proxyPath: '/grafana/api'
      
      # Is unified alerting enabled in Grafana?
      # See: https://grafana.com/blog/2021/06/14/the-new-unified-alerting-system-for-grafana-everything-you-need-to-know/
      # Optional. Default: false
      unifiedAlerting: false
  
    - id: 'my-second-instance' #unique host identifier used in Catalog Yaml annotation `grafana/source-id`     

      # Publicly accessible domain
      domain: https://monitoring2.company.com 
      
      # Path to use for requests via the proxy, defaults to /grafana/api        
      proxyPath: '/grafana2/api'      
      
      # Is unified alerting enabled in Grafana?
      # See: https://grafana.com/blog/2021/06/14/the-new-unified-alerting-system-for-grafana-everything-you-need-to-know/
      # Optional. Default: false
      unifiedAlerting: false
```


### Expose the plugin to Backstage:

```ts
// packages/app/src/plugins.tsx

// other plugins...

export { grafanaPlugin } from '@k-phoen/backstage-plugin-grafana';
```

That's it! You can now update your entities pages to [display alerts](alerts-on-component-page.md) or [dashboards](dashboards-on-component-page.md) related to them.
