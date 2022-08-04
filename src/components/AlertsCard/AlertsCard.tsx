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
import { Progress, TableColumn, Table, StatusOK, StatusPending, StatusWarning, StatusError, StatusAborted, MissingAnnotationEmptyState } from '@backstage/core-components';
import { Entity } from '@backstage/catalog-model';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { grafanaApiRef } from '../../api';
import { useAsync } from 'react-use';
import { Alert } from '@material-ui/lab';
import { Link } from '@material-ui/core';
import { Alert as GrafanaAlert } from '../../types';
import { GRAFANA_ANNOTATION_TAG_SELECTOR, isGrafanaAvailable, tagSelectorFromEntity } from '../grafanaData';

const AlertStatusBadge = ({ alert }: { alert: GrafanaAlert }) => {
  let statusElmt: React.ReactElement;

  switch (alert.state) {
    case "ok":
      statusElmt = <StatusOK />;
      break;
    case "paused":
      statusElmt = <StatusPending />;
      break;
    case "no_data":
    case "pending":
      statusElmt = <StatusWarning />;
      break;
    case "alerting":
      statusElmt = <StatusError />;
      break;
    default:
      statusElmt = <StatusAborted />;
  }

  return (
    <div>{statusElmt}</div>
  );
};

export const AlertsTable = ({
  alerts,
  opts,
}: {
  alerts: GrafanaAlert[];
  opts?: AlertsCardOpts;
}) => {
  const columns: TableColumn<GrafanaAlert>[] = [
    {
      title: 'id',
      field: 'name',
      hidden: true,
      searchable: true,
      render: (row: GrafanaAlert): string => row.name,
    },
    {
      title: 'Name',
      cellStyle: { width: '90%' },
      render: (row: GrafanaAlert): React.ReactNode => (
        <Link
          href={`${row.url}?panelId=${row.panelId}&fullscreen&refresh=5s`}
          target="_blank"
          rel="noopener"
        >
          {row.name}
        </Link>
      ),
    },
    {
      title: 'State',
      render: (row: GrafanaAlert): React.ReactNode => (
        <AlertStatusBadge alert={row} />
      ),
    },
  ];

  return (
    <Table
      title="Alerts"
      options={{
        paging: opts?.paged ?? false,
        pageSize: opts?.pageSize ?? 5,
        search: opts?.searchable ?? false,
        emptyRowsWhenPaging: false,
        sorting: false,
        draggable: false,
        padding: 'dense',
      }}
      data={alerts}
      columns={columns}
    />
  );
};

const Alerts = ({
  entity,
  opts,
}: {
  entity: Entity;
  opts?: AlertsCardOpts;
}) => {
  const grafanaApi = useApi(grafanaApiRef);
  const { value, loading, error } = useAsync(async () => await grafanaApi.alertsByDashboardTag(tagSelectorFromEntity(entity)));

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  return <AlertsTable alerts={value || []} opts={opts} />;
};

export type AlertsCardOpts = {
  paged?: boolean;
  searchable?: boolean;
  pageSize?: number;
};

export const AlertsCard = (opts?: AlertsCardOpts) => {
  const { entity } = useEntity();

  return !isGrafanaAvailable(entity) ? (
    <MissingAnnotationEmptyState annotation={GRAFANA_ANNOTATION_TAG_SELECTOR} />
  ) : (
    <Alerts entity={entity} opts={opts} />
  );
};
