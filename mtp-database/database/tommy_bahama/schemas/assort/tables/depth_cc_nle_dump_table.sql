--liquibase formatted sql
--changeset sanath.kumar@impactanalytics.co:depth_cc_nle_dump_tables_1 stripComments:false splitStatements:false context:MTP-29813 labels:depth_cc_nle_dump_tables
--comment: initial changeset for depth_cc_nle_dump_tables
CREATE TABLE if not exists assort.depth_cc_nle_dump_table (
	plan_cls_depth_id int4 NULL,
	plan_code int4 NULL,
	levels jsonb NULL,
	attribute_value jsonb NULL
);