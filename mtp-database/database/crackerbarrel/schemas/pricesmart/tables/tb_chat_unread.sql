--liquibase formatted sql
--changeset vishnu.vardhan@impactanalytics.co:tb_chat_unread stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chat_unread
CREATE TABLE IF NOT EXISTS pricesmart.tb_chat_unread (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	topic_id uuid NOT NULL,
	user_id int4 NOT NULL,
	unread_count int4 DEFAULT 0 NOT NULL,
	last_read_at timestamp NULL,
	CONSTRAINT tb_chat_unread_pk PRIMARY KEY (id),
	CONSTRAINT tb_chat_unread_unique UNIQUE (topic_id, user_id),
	CONSTRAINT tb_chat_unread_topic_fk FOREIGN KEY (topic_id) REFERENCES pricesmart.tb_chat_topic(topic_id) ON DELETE CASCADE,
	CONSTRAINT tb_chat_unread_user_fk FOREIGN KEY (user_id) REFERENCES "global".user_master(user_code)
);
CREATE INDEX IF NOT EXISTS idx_tb_chat_unread_count ON pricesmart.tb_chat_unread USING btree (unread_count);
CREATE INDEX IF NOT EXISTS idx_tb_chat_unread_topic_id ON pricesmart.tb_chat_unread USING btree (topic_id);
CREATE INDEX IF NOT EXISTS idx_tb_chat_unread_user_id ON pricesmart.tb_chat_unread USING btree (user_id);



