--liquibase formatted sql
--changeset liquibase:newly_launched_skus_alert stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for newly_launched_skus_alert
CREATE TABLE inventory_smart.newly_launched_skus_alert (
	allocation_plan_name text NULL,
	article varchar NULL,
	creation_date timestamptz NULL,
	lw_sales_units numeric NULL,
	bulk_remaining int4 NULL,
	allocated_quantity int4 NULL,
	vir_reservation_remaining_pdu_remaining int4 NULL,
	iob int4 NULL,
	dc_mapped text NULL,
	newly_launched_flag int4 NULL,
	newly_launched_is_resolved int4 NULL,
	l0_name varchar NULL,
	l2_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	l6_name varchar NULL,
	l7_code varchar NULL
);

--changeset himansh.bhardwaj@impactanalytics.co:create_display_column stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: create new column in alerts table
ALTER TABLE inventory_smart.newly_launched_skus_alert ADD COLUMN IF NOT EXISTS display_article varchar NULL;

--changeset himansh.bhardwaj@impactanalytics.co:create_product_group stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: adding product_group column
ALTER TABLE inventory_smart.newly_launched_skus_alert ADD COLUMN IF NOT EXISTS product_group TEXT[];

--changeset himansh.bhardwaj@impactanalytics.co:alter_product_group_type stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: changing data type of product_group from TEXT[] to VARCHAR[]
ALTER TABLE inventory_smart.newly_launched_skus_alert 
ALTER COLUMN product_group 
TYPE VARCHAR[] 
USING product_group::VARCHAR[];

--changeset sri.harsha@impactanalytics.co:create_display_column stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: create new column in alerts table
ALTER TABLE inventory_smart.newly_launched_skus_alert ADD COLUMN IF NOT EXISTS l1_name varchar NULL;