import { ascRequest } from "./client.js";
import type { Resource } from "./types.js";

const ISO2_TO_ISO3: Record<string, string> = {
  US: "USA", GB: "GBR", DE: "DEU", FR: "FRA", JP: "JPN", AU: "AUS", CA: "CAN",
  IT: "ITA", ES: "ESP", MX: "MEX", BR: "BRA", IN: "IND", CN: "CHN", KR: "KOR",
  NL: "NLD", SE: "SWE", NO: "NOR", DK: "DNK", FI: "FIN", BE: "BEL", AT: "AUT",
  CH: "CHE", PL: "POL", IE: "IRL", PT: "PRT", NZ: "NZL", SG: "SGP", HK: "HKG",
  TW: "TWN", AE: "ARE", SA: "SAU", ZA: "ZAF", IL: "ISR", TR: "TUR", RU: "RUS",
};

function toAlpha3(iso2: string): string {
  const alpha3 = ISO2_TO_ISO3[iso2.toUpperCase()];
  if (!alpha3) throw new Error(`No ISO-3 mapping for territory '${iso2}'`);
  return alpha3;
}

interface AvailabilityAttributes {
  [key: string]: unknown;
}

/** Set the territories the app is available in */
export async function setAppAvailability(
  appId: string,
  territoriesIso2: string[]
): Promise<Resource<AvailabilityAttributes>> {
  const territoriesData = territoriesIso2.map((iso2) => ({
    type: "territories",
    id: toAlpha3(iso2),
  }));
  const response = await ascRequest<AvailabilityAttributes>(
    `/v2/appAvailabilities`,
    {
      method: "POST",
      body: {
        data: {
          type: "appAvailabilities",
          relationships: {
            app: { data: { type: "apps", id: appId } },
            availableTerritories: { data: territoriesData },
          },
        },
      },
    }
  );
  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<AvailabilityAttributes>;
  }
  return response.data as Resource<AvailabilityAttributes>;
}
