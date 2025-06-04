import { z } from "zod";

export const uploadSchema = z.object({
  file: z.object({
    size: z.number().max(2 * 1024 * 1024 * 1024), // 2GB
    type: z.string(),
  }),
}); 