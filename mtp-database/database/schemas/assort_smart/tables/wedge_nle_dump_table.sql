--liquibase formatted sql
--changeset liquibase:wedge_nle_dump_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for wedge_nle_dump_table
CREATE TABLE assort_smart.wedge_nle_dump_table (
	plan_wedge_opt_id varchar NULL,
	plan_code int4 NULL,
	levels jsonb NULL,
	attribute_value jsonb NULL,
	parent_wedge_id varchar(1024) NULL,
	image_name_url varchar(1024) NULL
);