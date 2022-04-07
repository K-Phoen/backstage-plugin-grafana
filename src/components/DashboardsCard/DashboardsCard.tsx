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
import { Progress, TableColumn, Table, MissingAnnotationEmptyState } from '@backstage/core-components';
import { Entity } from '@backstage/catalog-model';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { grafanaApiRef } from '../../api';
import { useAsync } from 'react-use';
import { Alert } from '@material-ui/lab';
import { Link, Tooltip } from '@material-ui/core'
import { Dashboard } from '../../types';
import { GRAFANA_ANNOTATION_TAG_SELECTOR, isGrafanaAvailable, tagSelectorFromEntity } from '../grafanaData';

export const DashboardsTable = ({ entity, dashboards, title }: { entity: Entity, dashboards: Dashboard[], title?: string }) => {
  const columns: TableColumn<Dashboard>[] = [
    {
      title: 'Title',
      render: (row: Dashboard) => <Link href={row.url} target="_blank" rel="noopener">{row.title}</Link>,
    },
    {
      title: 'Folder',
      render: (row: Dashboard) => <Link href={row.folderUrl} target="_blank" rel="noopener">{row.folderTitle}</Link>,
    },
  ];

  const titleElm = (
    <Tooltip title={`Note: only dashboard with the "${tagSelectorFromEntity(entity)}" tag are displayed.`}>
      <span>{title || 'Dashboards'}</span>
    </Tooltip>
  );

  return (
    <Table
      title={titleElm}
      options={{ paging: false, search: false, sorting: false, draggable: false, padding: 'dense' }}
      data={dashboards}
      columns={columns}
    />
  );
};

const Dashboards = ({ entity, title }: { entity: Entity, title?: string }) => {
  const grafanaApi = useApi(grafanaApiRef);
  const { value, loading, error } = useAsync(async () => await grafanaApi.dashboardsByTag(tagSelectorFromEntity(entity)));

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  return (
    <DashboardsTable entity={entity} dashboards={value || []} title={title} />
  );
};

export const DashboardsCard = ({ title }: { title?: string }) => {
  const { entity } = useEntity();

  return !isGrafanaAvailable(entity) ? (
    <MissingAnnotationEmptyState annotation={GRAFANA_ANNOTATION_TAG_SELECTOR} />
  ) : (
    <Dashboards entity={entity} title={title} />
  );
};
