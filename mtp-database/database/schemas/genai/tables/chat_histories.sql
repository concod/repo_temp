--liquibase formatted sql
--changeset biplab.malaklar@impactanalytics.co:chat_histories stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for acl_master

CREATE TABLE IF NOT exists genai.chat_histories (
	chat_id serial4 NOT NULL,
	conversation_id int4 NULL,
	"content" text NULL,
	content_type varchar(100) DEFAULT 'string'::character varying NULL,
	sender int4 NULL,
	external_link text NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	read_status bool DEFAULT false NULL,
	read_time timestamptz NULL,
	is_deleted bool DEFAULT false NOT NULL,
	CONSTRAINT chat_histories_pk PRIMARY KEY (chat_id),
	CONSTRAINT chat_histories_conversation_fk FOREIGN KEY (conversation_id) REFERENCES genai.conversations(conversation_id) ON DELETE SET NULL
);

--changeset shannonnelson.d@impactanalytics.co:ada_table_metadata stripComments:false splitStatements:false context:Release_2_1 labels:chat_histories_1
--comment: replaced content and external_link columns with chat_object jsonb column in chat histories

ALTER TABLE genai.chat_histories DROP COLUMN IF EXISTS content;
ALTER TABLE genai.chat_histories DROP COLUMN IF EXISTS external_link;
ALTER TABLE genai.chat_histories ADD COLUMN IF NOT EXISTS chat_object jsonb DEFAULT '{}'::jsonb NOT NULL;