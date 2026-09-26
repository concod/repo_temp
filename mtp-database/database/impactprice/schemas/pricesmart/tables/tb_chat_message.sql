--liquibase formatted sql
--changeset vishnu.vardhan@impactanalytics.co:tb_chat_message stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chat_message
CREATE TABLE IF NOT EXISTS pricesmart.tb_chat_message (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	topic_id uuid NOT NULL,
	sender_id int4 NOT NULL,
	"content" text NOT NULL,
	tagged_users _int4 NULL,
	priority pricesmart."chat_priority_enum" NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	edited bool DEFAULT false NOT NULL,
	deleted bool DEFAULT false NOT NULL,
	reply_to uuid NULL,
	is_pinned bool DEFAULT false NOT NULL,
	updated_by int4 NULL,
	updated_at timestamp NULL,
	ntf_meta jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT tb_chat_message_pk PRIMARY KEY (id),
	CONSTRAINT tb_chat_message_reply_fk FOREIGN KEY (reply_to) REFERENCES pricesmart.tb_chat_message(id),
	CONSTRAINT tb_chat_message_sender_fk FOREIGN KEY (sender_id) REFERENCES "global".user_master(user_code),
	CONSTRAINT tb_chat_message_topic_fk FOREIGN KEY (topic_id) REFERENCES pricesmart.tb_chat_topic(topic_id) ON DELETE CASCADE,
	CONSTRAINT tb_chat_message_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code)
);
CREATE INDEX IF NOT EXISTS idx_tb_chat_message_created_at ON pricesmart.tb_chat_message USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_tb_chat_message_deleted ON pricesmart.tb_chat_message USING btree (deleted);
CREATE INDEX IF NOT EXISTS idx_tb_chat_message_is_pinned ON pricesmart.tb_chat_message USING btree (is_pinned);
CREATE INDEX IF NOT EXISTS idx_tb_chat_message_priority ON pricesmart.tb_chat_message USING btree (priority);
CREATE INDEX IF NOT EXISTS idx_tb_chat_message_reply_to ON pricesmart.tb_chat_message USING btree (reply_to);
CREATE INDEX IF NOT EXISTS idx_tb_chat_message_sender_id ON pricesmart.tb_chat_message USING btree (sender_id);
CREATE INDEX IF NOT EXISTS idx_tb_chat_message_topic_id ON pricesmart.tb_chat_message USING btree (topic_id);



