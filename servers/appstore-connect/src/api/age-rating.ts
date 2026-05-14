import { ascRequest } from "./client.js";
import type { Resource } from "./types.js";
import type { AgeRatingAnswer } from "../store/types.js";

interface AgeRatingDeclarationAttributes {
  [key: string]: string | undefined;
}

/** Convert UPPER_SNAKE_CASE → camelCase (e.g., VIOLENCE_CARTOON_OR_FANTASY → violenceCartoonOrFantasy) */
function questionIdToAttribute(id: string): string {
  return id
    .toLowerCase()
    .split("_")
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

/** Set the age rating declaration with the supplied answers */
export async function setAgeRatingDeclaration(
  declarationId: string,
  answers: AgeRatingAnswer[]
): Promise<Resource<AgeRatingDeclarationAttributes>> {
  const attributes: AgeRatingDeclarationAttributes = {};
  for (const a of answers) {
    attributes[questionIdToAttribute(a.questionId)] = a.level;
  }
  const response = await ascRequest<AgeRatingDeclarationAttributes>(
    `/v1/ageRatingDeclarations/${declarationId}`,
    {
      method: "PATCH",
      body: {
        data: {
          type: "ageRatingDeclarations",
          id: declarationId,
          attributes,
        },
      },
    }
  );
  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<AgeRatingDeclarationAttributes>;
  }
  return response.data as Resource<AgeRatingDeclarationAttributes>;
}
