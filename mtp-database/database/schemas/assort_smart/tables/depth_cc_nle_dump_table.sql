--liquibase formatted sql
--changeset liquibase:depth_cc_nle_dump_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for depth_cc_nle_dump_table
CREATE TABLE assort_smart.depth_cc_nle_dump_table (
	plan_cls_depth_id int4 NULL,
	plan_code int4 NULL,
	levels jsonb NULL,
	attribute_value jsonb NULL
);