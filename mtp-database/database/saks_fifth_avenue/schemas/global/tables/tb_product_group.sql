--liquibase formatted sql
--changeset liquibase:tb_product_group_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_product_group with if not exists
CREATE TABLE "global".tb_product_group (
	pg_id serial4 NOT NULL,
	pg_name varchar(250) NULL,
	pg_grouping_type int2 NULL DEFAULT 1,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	created_by int4 NOT NULL DEFAULT 0,
	updated_by int4 NULL DEFAULT 0,
	is_deleted int2 NOT NULL DEFAULT 0,
	description text NULL,
	products_count int4 NULL DEFAULT 0,
	CONSTRAINT product_group_pkey PRIMARY KEY (pg_id)
);


--liquibase formatted sql
--changeset liquibase:added_column_is_under_processing_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added is_under_processing column, default set to false.
ALTER TABLE "global".tb_product_group ADD is_under_processing int2 DEFAULT 0 NULL;
CREATE INDEX tb_product_group_pg_id_idx_1 ON global.tb_product_group USING btree (pg_id);



--changeset liquibase:altered_column_pg_name_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: altered pg_name column, type set to text.
ALTER TABLE global.tb_product_group ALTER COLUMN pg_name TYPE text;


--changeset vamsi.balaga@impactanalytics.co:dropped_default_for_updated_at_in_tb_product_group stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: dropped default value for updated_at column
ALTER TABLE "global".tb_product_group ALTER COLUMN updated_at DROP DEFAULT;

