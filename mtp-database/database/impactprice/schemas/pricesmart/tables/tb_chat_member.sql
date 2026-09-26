--liquibase formatted sql
--changeset vishnu.vardhan@impactanalytics.co:tb_chat_member stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chat_member
CREATE TABLE IF NOT EXISTS pricesmart.tb_chat_member (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	topic_id uuid NOT NULL,
	user_id int4 NOT NULL,
	is_pinned bool DEFAULT false NOT NULL,
	created_by int4 NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_by int4 NULL,
	updated_at timestamp NULL,
	CONSTRAINT tb_chat_member_pk PRIMARY KEY (id),
	CONSTRAINT tb_chat_member_unique UNIQUE (topic_id, user_id),
	CONSTRAINT tb_chat_member_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT tb_chat_member_topic_fk FOREIGN KEY (topic_id) REFERENCES pricesmart.tb_chat_topic(topic_id) ON DELETE CASCADE,
	CONSTRAINT tb_chat_member_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT tb_chat_member_user_fk FOREIGN KEY (user_id) REFERENCES "global".user_master(user_code)
);
CREATE INDEX IF NOT EXISTS idx_tb_chat_member_created_by ON pricesmart.tb_chat_member USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_tb_chat_member_is_pinned ON pricesmart.tb_chat_member USING btree (is_pinned);
CREATE INDEX IF NOT EXISTS idx_tb_chat_member_topic_id ON pricesmart.tb_chat_member USING btree (topic_id);
CREATE INDEX IF NOT EXISTS idx_tb_chat_member_user_id ON pricesmart.tb_chat_member USING btree (user_id);



