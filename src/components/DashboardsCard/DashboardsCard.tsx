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

export const DashboardsTable = ({ entity, dashboards }: { entity: Entity, dashboards: Dashboard[] }) => {
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
