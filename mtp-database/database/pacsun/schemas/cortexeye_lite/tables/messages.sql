--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:messages stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for messages

CREATE TABLE cortexeye_lite.messages (
	id text NOT NULL,
	conversation_id text NOT NULL,
	thread_id text NOT NULL,
	sender text NOT NULL,
	message_type text NOT NULL,
	display bool DEFAULT true NOT NULL,
	"text" jsonb NULL,
	display_format jsonb NULL,
	metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
	user_feedback jsonb DEFAULT '{"flag": null}'::jsonb NULL,
	is_deleted bool DEFAULT false NOT NULL,
	execution_time float8 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT messages_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_messages_conversation ON cortexeye_lite.messages USING btree (conversation_id, created_at);
CREATE INDEX idx_messages_thread_time ON cortexeye_lite.messages USING btree (thread_id, created_at);
CREATE INDEX idx_messages_type ON cortexeye_lite.messages USING btree (thread_id, message_type) WHERE (is_deleted = false);

ALTER TABLE cortexeye_lite.messages ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES cortexeye_lite.conversations(id) ON DELETE CASCADE;
ALTER TABLE cortexeye_lite.messages ADD CONSTRAINT messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES cortexeye_lite.threads(id) ON DELETE CASCADE;