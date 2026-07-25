CREATE TABLE IF NOT EXISTS `agno_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`model_provider` text DEFAULT 'openai' NOT NULL,
	`model_name` text DEFAULT 'gpt-4o' NOT NULL,
	`instructions_json` text,
	`system_prompt` text,
	`tools_json` text,
	`memory_config_json` text,
	`knowledge_base_id` text,
	`is_published` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `agno_knowledge_bases` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`vector_db_type` text DEFAULT 'sqlite_vec' NOT NULL,
	`table_or_collection` text NOT NULL,
	`embedder_model` text DEFAULT 'text-embedding-3-small' NOT NULL,
	`document_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `agno_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`leader_agent_id` text NOT NULL,
	`member_agent_ids_json` text NOT NULL,
	`execution_mode` text DEFAULT 'hierarchical' NOT NULL,
	`instructions_json` text,
	`shared_memory` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `agno_workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`steps_json` text NOT NULL,
	`session_state_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `instances` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`base_url` text NOT NULL,
	`api_key` text,
	`is_default` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'unknown' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `saved_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`instance_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`title` text NOT NULL,
	`metadata_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
