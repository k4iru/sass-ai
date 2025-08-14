CREATE TYPE "public"."llm_provider" AS ENUM('openai', 'anthropic', 'deepseek', 'google');--> statement-breakpoint
CREATE TYPE "public"."login_provider" AS ENUM('email', 'google');--> statement-breakpoint
CREATE TYPE "public"."verification_type" AS ENUM('email', 'password');