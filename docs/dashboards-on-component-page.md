# Display dashboards on a component page

Adding the `EntityGrafanaDashboardsCard` component to an entity's page will display a list of dashboards related to that entity.

```ts
// packages/app/src/components/catalog/EntityPage.tsx

import {
  EntityGrafanaDashboardsCard,
} from '@k-phoen/backstage-plugin-grafana';

// ...

const overviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    <Grid item md={6}>
      <EntityAboutCard variant="gridItem" />
    </Grid>

    <Grid item md={6}>
      {/* Grafana alert card start */}
      <EntityGrafanaDashboardsCard />
      {/* Grafana alert card end */}
    </Grid>

    <Grid item md={4} xs={12}>
      <EntityLinksCard />
    </Grid>
    <Grid item md={8} xs={12}>
      <EntityHasSubcomponentsCard variant="gridItem" />
    </Grid>
  </Grid>
);
```

Grafana dashboards are correlated to Backstage entities using an annotation added in the entity's `catalog-info.yaml` file:

```yml
annotations:
  grafana/tag-selector: "my-tag"
```

The `EntityGrafanaDashboardsCard` component will then display dashboards matching the given tag.

It's also possible to add multiple comma-separated tags, like `my-tag-1,my-tag-2`.