--liquibase formatted sql
--changeset vishnu.vardhan@impactanalytics.co:tb_comment stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_comment
CREATE TABLE IF NOT EXISTS pricesmart.tb_comment (
	comment_id uuid DEFAULT gen_random_uuid() NOT NULL,
	obj_id varchar(255) NOT NULL,
	obj_type varchar(100) NOT NULL,
	cell_id varchar(255) NOT NULL,
	"text" text NOT NULL,
	created_by int4 NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_by int4 NULL,
	updated_at timestamp NULL,
	tagged_users _int4 NULL,
	status pricesmart."comment_status_enum" DEFAULT 'open'::pricesmart.comment_status_enum NOT NULL,
	ntf_meta jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT tb_comment_pk PRIMARY KEY (comment_id),
	CONSTRAINT tb_comment_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT tb_comment_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code)
);
CREATE INDEX IF NOT EXISTS idx_tb_comment_cell_id ON pricesmart.tb_comment USING btree (cell_id);
CREATE INDEX IF NOT EXISTS idx_tb_comment_obj_id ON pricesmart.tb_comment USING btree (obj_id);
CREATE INDEX IF NOT EXISTS idx_tb_comment_obj_type ON pricesmart.tb_comment USING btree (obj_type);



