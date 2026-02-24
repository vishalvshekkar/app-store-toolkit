import { ascRequest, ascRequestAllPages } from "./client.js";
import type {
  CustomerReviewAttributes,
  CustomerReviewResponseAttributes,
  Resource,
} from "./types.js";

/** Get customer reviews for an app */
export async function getCustomerReviews(
  appId: string,
  options?: {
    sort?: string;
    limit?: number;
  }
): Promise<Resource<CustomerReviewAttributes>[]> {
  const params: Record<string, string> = {
    "fields[customerReviews]":
      "rating,title,body,reviewerNickname,createdDate,territory",
    limit: String(options?.limit ?? 20),
  };
  if (options?.sort) {
    params.sort = options.sort;
  }

  const response = await ascRequestAllPages<CustomerReviewAttributes>(
    `/v1/apps/${appId}/customerReviews`,
    params
  );

  return (
    Array.isArray(response.data) ? response.data : [response.data]
  ) as Resource<CustomerReviewAttributes>[];
}

/** Post a response to a customer review */
export async function postReviewResponse(
  reviewId: string,
  responseBody: string
): Promise<Resource<CustomerReviewResponseAttributes>> {
  const response = await ascRequest<CustomerReviewResponseAttributes>(
    "/v1/customerReviewResponses",
    {
      method: "POST",
      body: {
        data: {
          type: "customerReviewResponses",
          attributes: {
            responseBody,
          },
          relationships: {
            review: {
              data: {
                type: "customerReviews",
                id: reviewId,
              },
            },
          },
        },
      },
    }
  );

  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<CustomerReviewResponseAttributes>;
  }
  return response.data as Resource<CustomerReviewResponseAttributes>;
}
