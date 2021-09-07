import React from 'react';
import { Progress, ErrorBoundary, TableColumn, Table } from '@backstage/core-components';
import { Entity } from '@backstage/catalog-model';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { grafanaApiRef } from '../../api';
import { useAsync } from 'react-use';
import { Alert } from '@material-ui/lab';
import { Link } from '@material-ui/core';
import { Dashboard } from '../../types';

const DashboardsTable = ({ entity, dashboards }: { entity: Entity, dashboards: Dashboard[] }) => {
  const columns: TableColumn<Dashboard>[] = [
    {
      title: 'Title',
      highlight: true,
      render: (row: Dashboard): React.ReactNode => <Link href={row.url} target="_blank" rel="noopener">{row.title}</Link>,
    },
  ];

  return (
    <Table
      title="Dashboards"
      subtitle={`Note: only dashboard with the "${entity.metadata.name}" tag are displayed.`}
      options={{ paging: false, search: false, sorting: false, draggable: false, padding: 'dense' }}
      data={dashboards}
      columns={columns}
    />
  );
};

const Dashboards = ({ entity }: { entity: Entity }) => {
  const grafanaApi = useApi(grafanaApiRef);
  const { value, loading, error } = useAsync(async () => await grafanaApi.dashboardsByTag(entity.metadata.name));

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  return (
    <DashboardsTable entity={entity} dashboards={value || []} />
  );
};

export const DashboardsCard = () => {
  const { entity } = useEntity();

  return (
    <ErrorBoundary>
      <Dashboards entity={entity} />
    </ErrorBoundary>
  );
};
