import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const files = sqliteTable('files', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  filename: text('filename').notNull(),
  fileSize: integer('file_size', { mode: 'number' }),
  timestamp: text('timestamp').default(sql`(datetime('now','localtime'))`).notNull(),
  isEmbedded: integer('is_embedded', { mode: 'boolean' }).default(false).notNull(),
  embedModel: text('embed_model').default(''),
});

const ZFileSchema = createSelectSchema(files);

export type TFileSchema = z.infer<typeof ZFileSchema>;
