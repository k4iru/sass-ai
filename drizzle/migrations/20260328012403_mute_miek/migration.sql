ALTER TABLE "api_keys" ALTER COLUMN "llm_provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "llm_provider" DROP DEFAULT;--> statement-breakpoint
DROP TYPE "llm_provider";--> statement-breakpoint
CREATE TYPE "llm_provider" AS ENUM('openai', 'anthropic');--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "llm_provider" SET DATA TYPE "llm_provider" USING "llm_provider"::"llm_provider";--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "llm_provider" SET DEFAULT 'openai'::"llm_provider";--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "access_token" SET DATA TYPE varchar(1000) USING "access_token"::varchar(1000);