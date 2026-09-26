--liquibase formatted sql
--changeset liquibase:update_tracker stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_tracker
CREATE TABLE "cache".update_tracker (
	update_code serial4 NOT NULL,
	table_name varchar NOT NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	filters jsonb NOT NULL,
	created_by int4 NOT NULL,
	table_type varchar NULL DEFAULT 'gbq'::character varying,
	is_deleted bool NOT NULL DEFAULT false,
	CONSTRAINT update_tracker_pk PRIMARY KEY (update_code)
);


--changeset ashish@impactanalytics.co:update_tracker_gbq_compatiable stripComments:false splitStatements:false context:Release_2 labels:Cold_Updates
--comment: Cold Updates Ada Visual Changes
ALTER TABLE IF EXISTS cache.update_tracker ALTER COLUMN table_type DROP DEFAULT;
ALTER TABLE IF EXISTS cache.update_tracker ALTER COLUMN table_type SET NOT NULL;
ALTER TABLE IF EXISTS cache.update_tracker ADD COLUMN status smallint NOT NULL DEFAULT 0;
COMMENT ON COLUMN cache.update_tracker.status IS '0 -> Draft, 1 -> Validated, 2 -> In Queue, 3 -> Merged';
ALTER TABLE IF EXISTS cache.update_tracker ADD COLUMN updated_at timestamp without time zone;

ALTER TABLE IF EXISTS cache.update_tracker ADD CONSTRAINT update_tracker_fk FOREIGN KEY (created_by) REFERENCES global.user_master (user_code) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE SET NULL;
ALTER TABLE IF EXISTS cache.update_tracker ADD CONSTRAINT update_tracker_status_check CHECK (status >= 0 AND status <= 3);
ALTER TABLE IF EXISTS cache.update_tracker ADD CONSTRAINT update_tracker_table_type_check CHECK (table_type::text = ANY (ARRAY['gbq'::character varying, 'pg'::character varying]::text[]));


--changeset ashish@impactanalytics.co:add_comment_column stripComments:false splitStatements:false context:Release_2 labels:Cold_Updates
--comment: Cold Updates Ada Visual Changes
ALTER TABLE "cache".update_tracker ADD "comments" text NULL;