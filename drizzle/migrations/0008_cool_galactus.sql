CREATE TABLE "chat_counter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"next_message_order" smallint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "message_order" smallint NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_counter" ADD CONSTRAINT "chat_counter_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;