import { ascRequest } from "./client.js";
import type { Resource } from "./types.js";
import type { ReviewInfo } from "../store/types.js";

interface ReviewDetailAttributes {
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  demoAccountRequired?: boolean;
  demoAccountName?: string;
  demoAccountPassword?: string;
  notes?: string;
}

export async function setAppStoreReviewDetail(
  reviewDetailId: string,
  info: ReviewInfo
): Promise<Resource<ReviewDetailAttributes>> {
  const attributes: ReviewDetailAttributes = {
    contactFirstName: info.contact.firstName,
    contactLastName: info.contact.lastName,
    contactEmail: info.contact.email,
    contactPhone: info.contact.phone,
    demoAccountRequired: info.demo.required,
    notes: info.notes,
  };
  if (info.demo.required) {
    attributes.demoAccountName = info.demo.username;
    attributes.demoAccountPassword = info.demo.password;
  }
  const response = await ascRequest<ReviewDetailAttributes>(
    `/v1/appStoreReviewDetails/${reviewDetailId}`,
    {
      method: "PATCH",
      body: {
        data: {
          type: "appStoreReviewDetails",
          id: reviewDetailId,
          attributes,
        },
      },
    }
  );
  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<ReviewDetailAttributes>;
  }
  return response.data as Resource<ReviewDetailAttributes>;
}
