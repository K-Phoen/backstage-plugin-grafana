export const REGEX_GRAFANA_URI_OR = /(?:\s+or\s+|s*\|\s*|\s*,\s*)/;
export const REGEX_GRAFANA_URI_AND = /(?:\s+and\s+|\s*\&\s*)/;

export async function buildUrisGrafana(baseUri: string, baseParams: string[], tagParam: string, tags: string): Promise<string[]> {
    var uris: string[] = [];
    const tagsOr: string[] = tags.split(REGEX_GRAFANA_URI_OR)
    await Promise.all(tagsOr.map(async tagOr => {
        var params: string[] = [...baseParams];
        const tagsAnd: string[] = tagOr.split(REGEX_GRAFANA_URI_AND)
        await Promise.all(tagsAnd.map(async tagAnd => {
            params.push(`${tagParam}=${tagAnd}`);
        }))
        let uri = baseUri;
        if(params.length > 0) {
          uri += "?" + params.join("&");
        }
        return uris.push(uri);
    }))
    return uris;
}