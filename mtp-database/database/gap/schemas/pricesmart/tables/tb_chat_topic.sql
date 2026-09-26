--liquibase formatted sql
--changeset vishnu.vardhan@impactanalytics.co:tb_chat_topic stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chat_topic
CREATE TABLE IF NOT EXISTS pricesmart.tb_chat_topic (
	topic_id uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	description text NULL,
	object_type varchar(100) NOT NULL,
	object_ids _text NOT NULL,
	created_by int4 NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_by int4 NULL,
	updated_at timestamp NULL,
	status pricesmart."chat_status_enum" DEFAULT 'open'::pricesmart.chat_status_enum NOT NULL,
	app_code pricesmart."chat_app_code_enum" NULL,
	ntf_meta jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT tb_chat_topic_pk PRIMARY KEY (topic_id),
	CONSTRAINT tb_chat_topic_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT tb_chat_topic_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code)
);
CREATE INDEX IF NOT EXISTS idx_tb_chat_topic_created_at ON pricesmart.tb_chat_topic USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_tb_chat_topic_created_by ON pricesmart.tb_chat_topic USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_tb_chat_topic_object_ids ON pricesmart.tb_chat_topic USING gin (object_ids);
CREATE INDEX IF NOT EXISTS idx_tb_chat_topic_object_type ON pricesmart.tb_chat_topic USING btree (object_type);
CREATE INDEX IF NOT EXISTS idx_tb_chat_topic_status ON pricesmart.tb_chat_topic USING btree (status);



