--liquibase formatted sql
--changeset vishnu.vardhan@impactanalytics.co:tb_comment_reply stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_comment_reply
CREATE TABLE IF NOT EXISTS pricesmart.tb_comment_reply (
	reply_id uuid DEFAULT gen_random_uuid() NOT NULL,
	comment_id uuid NOT NULL,
	"text" text NOT NULL,
	tagged_users _int4 NULL,
	created_by int4 NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_by int4 NULL,
	updated_at timestamp NULL,
	ntf_meta jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT tb_comment_reply_pk PRIMARY KEY (reply_id),
	CONSTRAINT tb_comment_reply_comment_fk FOREIGN KEY (comment_id) REFERENCES pricesmart.tb_comment(comment_id) ON DELETE CASCADE,
	CONSTRAINT tb_comment_reply_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT tb_comment_reply_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code)
);
CREATE INDEX IF NOT EXISTS idx_tb_comment_reply_comment_id ON pricesmart.tb_comment_reply USING btree (comment_id);



