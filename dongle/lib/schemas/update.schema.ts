/**
 * Zod schema validation for project update forms
 */

import { z } from "zod";
import { UPDATE_TYPES } from "@/types/update";

const UPDATE_CONSTRAINTS = {
  TITLE_MIN_LENGTH: 1,
  TITLE_MAX_LENGTH: 100,
  CONTENT_MIN_LENGTH: 20,
  CONTENT_MAX_LENGTH: 5000,
  VERSION_MIN_LENGTH: 1,
  VERSION_MAX_LENGTH: 50,
};

export const updateFormSchema = z
  .object({
    type: z.enum(
      [
        UPDATE_TYPES.ANNOUNCEMENT,
        UPDATE_TYPES.RELEASE,
        UPDATE_TYPES.MILESTONE,
        UPDATE_TYPES.AUDIT,
      ],
      {
        errorMap: () => ({ message: "Invalid update type" }),
      }
    ),
    title: z
      .string()
      .min(
        UPDATE_CONSTRAINTS.TITLE_MIN_LENGTH,
        `Title must be at least ${UPDATE_CONSTRAINTS.TITLE_MIN_LENGTH} character`
      )
      .max(
        UPDATE_CONSTRAINTS.TITLE_MAX_LENGTH,
        `Title must be ${UPDATE_CONSTRAINTS.TITLE_MAX_LENGTH} characters or less`
      )
      .transform((val) => val.trim()),
    content: z
      .string()
      .min(
        UPDATE_CONSTRAINTS.CONTENT_MIN_LENGTH,
        `Content must be at least ${UPDATE_CONSTRAINTS.CONTENT_MIN_LENGTH} characters`
      )
      .max(
        UPDATE_CONSTRAINTS.CONTENT_MAX_LENGTH,
        `Content cannot exceed ${UPDATE_CONSTRAINTS.CONTENT_MAX_LENGTH} characters`
      )
      .transform((val) => val.trim()),
    version: z
      .string()
      .min(1, "Version is required for releases")
      .max(
        UPDATE_CONSTRAINTS.VERSION_MAX_LENGTH,
        `Version must be ${UPDATE_CONSTRAINTS.VERSION_MAX_LENGTH} characters or less`
      )
      .transform((val) => val.trim())
      .optional(),
    link: z
      .string()
      .url("Link must be a valid URL")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      // Version is required for RELEASE type
      if (data.type === UPDATE_TYPES.RELEASE) {
        return !!data.version && data.version.length > 0;
      }
      return true;
    },
    {
      message: "Version is required for release updates",
      path: ["version"],
    }
  );

export type UpdateFormData = z.infer<typeof updateFormSchema>;

export { UPDATE_CONSTRAINTS };
