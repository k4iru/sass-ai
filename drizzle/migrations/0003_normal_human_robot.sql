ALTER TABLE "messages" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "id" SET DATA TYPE uuid;