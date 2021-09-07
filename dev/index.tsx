import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { grafanaPlugin, GrafanaPage } from '../src/plugin';

createDevApp()
  .registerPlugin(grafanaPlugin)
  .addPage({
    element: <GrafanaPage />,
    title: 'Root Page',
    path: '/grafana'
  })
  .render();
