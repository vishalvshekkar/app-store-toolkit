import { ascRequest } from "./client.js";
import type { Resource } from "./types.js";
import type { PriceTierEntry } from "../store/types.js";

/** ISO 3166-1 alpha-2 → alpha-3 (Apple price-point ids use alpha-3 territory codes) */
const ISO2_TO_ISO3: Record<string, string> = {
  US: "USA", GB: "GBR", DE: "DEU", FR: "FRA", JP: "JPN", AU: "AUS", CA: "CAN",
  IT: "ITA", ES: "ESP", MX: "MEX", BR: "BRA", IN: "IND", CN: "CHN", KR: "KOR",
  NL: "NLD", SE: "SWE", NO: "NOR", DK: "DNK", FI: "FIN", BE: "BEL", AT: "AUT",
  CH: "CHE", PL: "POL", IE: "IRL", PT: "PRT", NZ: "NZL", SG: "SGP", HK: "HKG",
  TW: "TWN", AE: "ARE", SA: "SAU", ZA: "ZAF", IL: "ISR", TR: "TUR", RU: "RUS",
};

function toAlpha3(iso2: string): string {
  const alpha3 = ISO2_TO_ISO3[iso2.toUpperCase()];
  if (!alpha3) {
    throw new Error(`No ISO-3 mapping for territory '${iso2}'. Add it to ISO2_TO_ISO3.`);
  }
  return alpha3;
}

function priceIdFor(tier: number, iso2: string): string {
  return `${tier}_${toAlpha3(iso2)}`;
}

export interface PriceUpdate {
  defaultTier: number;
  perTerritory: PriceTierEntry[];
}

interface PriceScheduleAttributes {
  [key: string]: unknown;
}

/** Create a manual app price schedule replacing any existing schedule */
export async function setAppPriceSchedule(
  appId: string,
  update: PriceUpdate
): Promise<Resource<PriceScheduleAttributes>> {
  const manualPrices: { type: string; id: string }[] = [
    { type: "appPrices", id: priceIdFor(update.defaultTier, "US") },
  ];
  for (const t of update.perTerritory) {
    manualPrices.push({
      type: "appPrices",
      id: priceIdFor(t.priceTier, t.territory),
    });
  }
  const response = await ascRequest<PriceScheduleAttributes>(
    `/v1/appPriceSchedules`,
    {
      method: "POST",
      body: {
        data: {
          type: "appPriceSchedules",
          relationships: {
            app: { data: { type: "apps", id: appId } },
            manualPrices: { data: manualPrices },
          },
        },
      },
    }
  );
  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<PriceScheduleAttributes>;
  }
  return response.data as Resource<PriceScheduleAttributes>;
}
