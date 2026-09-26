--liquibase formatted sql
--changeset sanath.kumar@impactanalytics.co:wedge_nle_dump_tables stripComments:false splitStatements:false context:MTP-29813 labels:wedge_nle_dump_tables
--comment: initial changeset for wedge_nle_dump_tables
CREATE TABLE assort.wedge_nle_dump_table (
	plan_wedge_opt_id varchar NULL,
	plan_code int4 NULL,
	levels jsonb NULL,
	attribute_value jsonb NULL,
	parent_wedge_id varchar(1024) NULL,
	image_name_url varchar(1024) NULL
);