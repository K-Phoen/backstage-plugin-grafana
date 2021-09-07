import { grafanaPlugin } from './plugin';

describe('grafana', () => {
  it('should export plugin', () => {
    expect(grafanaPlugin).toBeDefined();
  });
});
