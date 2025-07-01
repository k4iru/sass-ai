ALTER TABLE "refresh_tokens" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" DROP DEFAULT;