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
import { Progress, TableColumn, Table, StatusOK, StatusPending, StatusWarning, StatusError, StatusAborted, MissingAnnotationEmptyState, Link } from '@backstage/core-components';
import { Entity } from '@backstage/catalog-model';
import { useEntity } from '@backstage/plugin-catalog-react';
import { grafanaApiRef } from '../../api';
import { useAsync } from 'react-use';
import { Alert } from '@material-ui/lab';
import {Alert as GrafanaAlert, AlertsCardOpts} from '../../types';
import {
  GRAFANA_ANNOTATION_TAG_SELECTOR,
  GRAFANA_ANNOTATION_ALERT_LABEL_SELECTOR,
  isAlertSelectorAvailable,
  isDashboardSelectorAvailable,
  tagSelectorFromEntity,
  alertSelectorFromEntity,
  grafanaSourceIdFromEntity
} from '../grafanaData';
import {useApi} from "@backstage/core-plugin-api";
import {Tooltip} from "@material-ui/core";

const AlertStatusBadge = ({ alert }: { alert: GrafanaAlert }) => {
  let statusElmt: React.ReactElement;
  let tooltipTitle: string;

  switch (alert.state) {
    case "ok":
    case "Normal":
      statusElmt = <StatusOK />;
      tooltipTitle = "Status OK"
      break;
    case "paused":
      statusElmt = <StatusPending />;
      tooltipTitle = "Status Pending"
      break;
    case "no_data":
    case "pending":
    case "Pending":
    case "NoData":
      statusElmt = <StatusWarning />;
      tooltipTitle = "Status Warning"
      break;
    case "alerting":
    case "Alerting":
    case "Error":
      statusElmt = <StatusError />;
      tooltipTitle = "Status Error"
      break;
    default:
      statusElmt = <StatusAborted />;
      tooltipTitle = "Status Aborted"
  }

  return (
    <Tooltip title={tooltipTitle}><div>{statusElmt}</div></Tooltip>
  );
};

export const AlertsTable = ({alerts, opts}: {alerts: GrafanaAlert[], opts: AlertsCardOpts}) => {
  const columns: TableColumn<GrafanaAlert>[] = [
    {
      title: 'Name',
      field: 'name',
      cellStyle: {width: '90%'},
      render: (row: GrafanaAlert): React.ReactNode => <Link to={row.url} target="_blank" rel="noopener">{row.name}</Link>,
    },
  ];

   if (opts.showState) {
    columns.push({
      title: 'State',
      cellStyle: {textAlign: 'center'},
      render: (row: GrafanaAlert): React.ReactNode => <AlertStatusBadge alert={row} />,
    });
  }

  return (
    <Table
      title={opts.title || 'Alerts'}
      options={{
        paging: opts.paged ?? false,
        pageSize: opts.pageSize ?? 5,
        search: opts.searchable ?? false,
        emptyRowsWhenPaging: false,
        sorting: opts.sortable ?? false,
        draggable: false,
        padding: 'dense',
      }}
      data={alerts}
      columns={columns}
    />
  );
};

const Alerts = ({entity, opts}: {entity: Entity, opts: AlertsCardOpts}) => {
  const grafanaApi = useApi(grafanaApiRef);

  const alertSelector = isAlertSelectorAvailable(entity) ? alertSelectorFromEntity(entity) : tagSelectorFromEntity(entity);

  const { value, loading, error } = useAsync(async () => await grafanaApi.alertsForSelector(alertSelector, grafanaSourceIdFromEntity(entity)));

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  return <AlertsTable alerts={value || []} opts={opts} />;
};

export const AlertsCard = (opts: AlertsCardOpts) => {
  const { entity } = useEntity();

  const unifiedAlertingEnabled = isAlertSelectorAvailable(entity) || false;

  if (!unifiedAlertingEnabled && !isDashboardSelectorAvailable(entity)) {
    return <MissingAnnotationEmptyState annotation={GRAFANA_ANNOTATION_TAG_SELECTOR} />;
  }

  if (unifiedAlertingEnabled && !isAlertSelectorAvailable(entity)) {
    return <MissingAnnotationEmptyState annotation={GRAFANA_ANNOTATION_ALERT_LABEL_SELECTOR} />;
  }

  return <Alerts entity={entity} opts={opts} />;
};

AlertsCard.defaultProps = {
  paged: false,
  searchable: false,
  pageSize: 5,
  sortable: false,
  title: 'Alerts',
  showState: true
};
