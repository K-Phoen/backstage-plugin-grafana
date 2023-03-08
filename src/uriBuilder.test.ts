
import { buildUrisGrafana, REGEX_GRAFANA_URI_OR } from './uriBuilder';

describe('Grafana URI builder', () => {
  
    it('regex should split tags in two', async () => {

        const result: string[] = "agreement|A0008_STATIC_ANALYSIS_1_0_0".split(REGEX_GRAFANA_URI_OR)

        expect(result[0]).toEqual("agreement");
        expect(result[1]).toEqual( "A0008_STATIC_ANALYSIS_1_0_0");
    });
  
    it('should build two dashboard queries', async () => {

        const result: string[] = await buildUrisGrafana('/api/search', ['type=dash-db'], 'tag', "agreement|A0008_STATIC_ANALYSIS_1_0_0")

        expect(result[0]).toEqual("/api/search?type=dash-db&tag=agreement");
        expect(result[1]).toEqual( "/api/search?type=dash-db&tag=A0008_STATIC_ANALYSIS_1_0_0");
    });
  });