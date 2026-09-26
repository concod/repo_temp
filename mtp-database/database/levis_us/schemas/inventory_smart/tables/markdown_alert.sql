--liquibase formatted sql
--changeset liquibase:markdown_alert stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for markdown_alert
CREATE TABLE inventory_smart.markdown_alert (
	l7_code varchar NULL,
	article varchar NULL,
	color varchar NULL,
    l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	l6_name varchar NULL,
	available_dc_oh int4 NULL,
	store_oh int4 NULL,
	store_it int4 NULL,
	store_oo int4 NULL,
	planned_clearance_date timestamptz NULL,
	dc_mapped text NULL,
	vir_reservation_remaining_pdu_remaining int4 NULL,
	iob int4 NULL,
	fwos float4 NULL,
	instock_percentage float4 NULL,
	markdown_flag int4 NULL,
	markdown_is_resolved int4 NULL,
	article_description varchar NULL
);

--changeset himansh.bhardwaj@impactanalytics.co:create_display_column stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: create new column in alerts table
ALTER TABLE inventory_smart.markdown_alert ADD COLUMN IF NOT EXISTS display_article varchar NULL;

--changeset himansh.bhardwaj@impactanalytics.co:create_product_group stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: adding product_group column
ALTER TABLE inventory_smart.markdown_alert ADD COLUMN IF NOT EXISTS product_group TEXT[];

--changeset himansh.bhardwaj@impactanalytics.co:alter_product_group_type stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: changing data type of product_group from TEXT[] to VARCHAR[]
ALTER TABLE inventory_smart.markdown_alert 
ALTER COLUMN product_group 
TYPE VARCHAR[] 
USING product_group::VARCHAR[];

--changeset sri.harsha@impactanalytics.co:create_display_column stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: create new column in alerts table
ALTER TABLE inventory_smart.markdown_alert ADD COLUMN IF NOT EXISTS l1_name varchar NULL;

--changeset himansh.bhardwaj@impactanalytics.co:adding pk stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: adding pk
ALTER TABLE inventory_smart.markdown_alert ADD CONSTRAINT markdown_alert_primary_key PRIMARY KEY (article);

--changeset himansh.bhardwaj@impactanalytics.co:dc_vir_iob_json stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: dc_vir_iob_json
ALTER TABLE inventory_smart.markdown_alert
ALTER COLUMN available_dc_oh TYPE jsonb USING to_jsonb(available_dc_oh),
ALTER COLUMN vir_reservation_remaining_pdu_remaining TYPE jsonb USING to_jsonb(vir_reservation_remaining_pdu_remaining),
ALTER COLUMN iob TYPE jsonb USING to_jsonb(iob);

--changeset himansh.bhardwaj@impactanalytics.co:planned_clearance_date_from_timestamp_to_date stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: planned_clearance_date_from_timestamp_to_date
ALTER TABLE inventory_smart.markdown_alert
ALTER COLUMN planned_clearance_date TYPE date;

--changeset himansh.bhardwaj@impactanalytics.co:dc_assignment stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: dc_assignment
ALTER TABLE inventory_smart.markdown_alert ADD COLUMN IF NOT EXISTS dc_assignment varchar NULL;

--changeset prince.kumar@impactanalytics.co:adding_on_floor_date_1 and markdown_date_1 stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: adding_on_floor_date and markdown_date
ALTER TABLE inventory_smart.markdown_alert 
ADD COLUMN IF NOT EXISTS on_floor_date date NULL,
ADD COLUMN IF NOT EXISTS markdown_date date NULL;