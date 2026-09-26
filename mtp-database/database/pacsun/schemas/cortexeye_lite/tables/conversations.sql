--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:conversations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for conversations

CREATE TABLE cortexeye_lite.conversations (
	id text NOT NULL,
	thread_id text NOT NULL,
	"mode" text NULL,
	confidence_score float8 NULL,
	is_podcast_suitable bool DEFAULT false NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	steps jsonb DEFAULT '[]'::jsonb NOT NULL,
	attachments jsonb DEFAULT '{}'::jsonb NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT conversations_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_conversations_thread ON cortexeye_lite.conversations USING btree (thread_id, created_at);

ALTER TABLE cortexeye_lite.conversations ADD CONSTRAINT conversations_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES cortexeye_lite.threads(id) ON DELETE CASCADE;