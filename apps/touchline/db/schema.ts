import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const matches = sqliteTable(
  "matches",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    title: text("title").notNull(),
    payload: text("payload").notNull(),
    version: integer("version").notNull().default(1),
    readKey: text("read_key").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("matches_owner_updated_idx").on(t.ownerId, t.updatedAt)],
);
