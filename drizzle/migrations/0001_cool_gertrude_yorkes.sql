ALTER TABLE "chats" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "title" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "model" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "role" varchar NOT NULL;