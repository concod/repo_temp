--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:mfp_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for mfp_master

CREATE TABLE if not EXISTS item_smart.mfp_master (
	dept text NULL,
	channel text NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	l5_name text NULL,
	current_week int4 NULL,
	written_sales_units float4 NULL,
	written_sales_dollars float4 NULL,
	written_sales_msrp float4 NULL,
	written_sales_cost float4 NULL,
	written_aur float4 NULL,
	written_auc float4 NULL,
	written_air float4 NULL,
	written_gm_dollar float4 NULL,
	product_type int8 DEFAULT 0 NULL,
CONSTRAINT mfp_master_pk PRIMARY KEY (dept, channel,l0_name,l1_name,l2_name,l3_name,l4_name,l5_name, current_week)
);

--changeset shreyansh.pathak@impactanalytics.co:mfp_master_1_chg1 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: data type changes

ALTER TABLE item_smart.mfp_master ALTER COLUMN written_sales_units TYPE float8 USING written_sales_units::float8;
ALTER TABLE item_smart.mfp_master ALTER COLUMN written_sales_dollars TYPE float8 USING written_sales_dollars::float8;
ALTER TABLE item_smart.mfp_master ALTER COLUMN written_sales_msrp TYPE float8 USING written_sales_msrp::float8;
ALTER TABLE item_smart.mfp_master ALTER COLUMN written_sales_cost TYPE float8 USING written_sales_cost::float8;
ALTER TABLE item_smart.mfp_master ALTER COLUMN written_aur TYPE float8 USING written_aur::float8;
ALTER TABLE item_smart.mfp_master ALTER COLUMN written_auc TYPE float8 USING written_auc::float8;
ALTER TABLE item_smart.mfp_master ALTER COLUMN written_air TYPE float8 USING written_air::float8;
ALTER TABLE item_smart.mfp_master ALTER COLUMN written_gm_dollar TYPE float8 USING written_gm_dollar::float8;


--changeset madhumitha.s@impactanalytics.co:is_active_1 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for columns

ALTER TABLE item_smart.mfp_master ADD COLUMN IF NOT EXISTS is_active BOOLEAN;