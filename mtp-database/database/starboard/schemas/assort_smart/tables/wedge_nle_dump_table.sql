
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.wedge_nle_dump_table stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for wedge_nle_dump_table

CREATE TABLE IF not exists assort_smart.wedge_nle_dump_table (
	plan_wedge_opt_id varchar NULL,
	plan_code int4 NULL,
	levels jsonb NULL,
	attribute_value jsonb NULL,
	parent_wedge_id varchar(1024) NULL,
	image_name_url varchar(1024) NULL
);