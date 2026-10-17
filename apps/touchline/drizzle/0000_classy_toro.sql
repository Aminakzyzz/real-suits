CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`payload` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`read_key` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `matches_owner_updated_idx` ON `matches` (`owner_id`,`updated_at`);