import { z } from 'zod';

export const fabActionSchema = z.object({
  key: z.string().min(1).max(32),
  icon: z.string().min(1).max(8),
  label: z.string().min(1).max(24),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a #rrggbb hex color'),
  enabled: z.boolean(),
});

export const fabConfigUpdateSchema = z.object({
  actions: z.array(fabActionSchema).min(1).max(4),
});

export const actionEventSchema = z.object({
  key: z.string().min(1).max(32),
  firedAt: z.number().int().positive(),
});

export type FabAction = z.infer<typeof fabActionSchema>;
export type FabConfigUpdate = z.infer<typeof fabConfigUpdateSchema>;
export type ActionEvent = z.infer<typeof actionEventSchema>;

export type FabConfig = {
  version: number;
  updatedAt: number;
  actions: FabAction[];
};
