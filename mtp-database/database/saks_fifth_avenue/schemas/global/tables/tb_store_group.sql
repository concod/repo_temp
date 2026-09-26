--liquibase formatted sql
--changeset liquibase:tb_store_group_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_store_group with if not exists
CREATE TABLE "global".tb_store_group (
	sg_id serial4 NOT NULL,
	sg_name varchar(250) NULL,
	sg_grouping_type int2 NULL DEFAULT 1,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	created_by int4 NOT NULL DEFAULT 0,
	updated_by int4 NULL DEFAULT 0,
	is_deleted int2 NOT NULL DEFAULT 0,
	description text NULL,
	stores_count int4 NULL DEFAULT 0,
	CONSTRAINT store_group_pkey PRIMARY KEY (sg_id)
);


--liquibase formatted sql
--changeset liquibase:added_column_is_under_processing_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added is_under_processing column, default set to false.
ALTER TABLE "global".tb_store_group ADD is_under_processing int2 DEFAULT 0 NULL;
CREATE INDEX tb_store_group_sg_id_idx_1 ON global.tb_store_group USING btree (sg_id);



--changeset liquibase:altered_column_sg_name_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: altered sg_name column, type set to text.
ALTER TABLE global.tb_store_group ALTER COLUMN sg_name TYPE text;


--changeset vamsi.balaga@impactanalytics.co:dropped_default_for_updated_at_in_tb_store_group stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: dropped default for updated_at in tb_store_group
ALTER TABLE "global".tb_store_group ALTER COLUMN updated_at DROP DEFAULT;


