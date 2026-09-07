import { z } from "zod";

/** Generic cursor-paginated page shape. */
export const cursorPageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z
    .object({
      items: z.array(item),
      nextCursor: z.string().nullable(),
      hasMore: z.boolean(),
    })
    .superRefine((page, ctx) => {
      if (page.hasMore && page.nextCursor === null) {
        ctx.addIssue({
          code: "custom",
          path: ["nextCursor"],
          message: "A page with more results must provide a next cursor.",
        });
      }
    });

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};