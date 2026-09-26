--liquibase formatted sql
--changeset liquibase:alerts_product_store_level stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for alerts_product_store_level
CREATE TABLE inventory_smart.alerts_product_store_level (
	l7_code varchar(50) NULL,
	article varchar NULL,
	color varchar NULL,
    l0_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	l6_name varchar(50) NULL,
	store_oh float4 NULL,
	store_it float4 NULL,
	store_oo float4 NULL,
	available_dc_oh int4 NULL,
	last_week_sales int4 NULL,
	last_week_revenue int4 NULL,
	last_4_week_sales int4 NULL,
	instock_perc float4 NULL,
	fwos_target float4 NULL,
	door_count int4 NULL,
	vir_reservation_remaining_pdu_remaining int4 NULL,
	iob int4 NULL,
	forecast float4 NULL,
	dc_mapped text NULL,
	stockout_flag int4 NULL,
	shortfall_flag int4 NULL,
	overstock_flag int4 NULL,
	last_4_weeks_actuals int4 NULL,
	last_4_weeks_forecast int4 NULL,
	next_4_weeks_forecast int4 NULL,
	deviation_percentage float4 NULL,
	ly_past_4_week_actual float4 NULL,
	ly_next_4_week_actual float4 NULL,
	ly_deviation_percentage float4 NULL,
	past_4_week_actual float4 NULL,
	forecast_deviation_percentage float4 NULL,
	past_4_week_actual_store_count float4 NULL,
	next_4_week_store_count float4 NULL,
	store_count_deviation_percentage float4 NULL,
	past_4_week_actual_promo float4 NULL,
	next_4_week_planned_promo float4 NULL,
	promo_deviation_percentage float4 NULL,
	absolute_error float4 NULL,
	accuracy float4 NULL,
	past_4_week_forecast int4 NULL,
	forecast_error_perc_flag int4 NULL,
	recent_deviation_flag int4 NULL,
	new_products_flag int4 NULL,
	in_season_flag int4 NULL,
	stockout_is_resolved int4 NULL,
	shortfall_is_resolved int4 NULL,
	overstock_is_resolved int4 NULL,
	forecast_error_perc_is_resolved int4 NULL,
	recent_deviation_is_resolved int4 NULL,
	new_products_is_resolved int4 NULL,
	in_season_is_resolved int4 NULL,
	store_code varchar NULL,
	channel varchar NULL,
	country_id varchar NULL,
	state varchar NULL,
	store_group varchar NULL,
	store_cluster varchar NULL,
	store_grade varchar NULL,
	territory varchar NULL,
	district varchar NULL,
	store_name varchar NULL,
	article_description varchar NULL
);

--changeset liquibase:apsl stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_2
--comment: column name for alerts_product_store_level
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN instock_perc TO instock_percentage;

--changeset steveabraham.eapen@impactanalytics.co:create_display_column stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: create new column in alerts table
ALTER TABLE inventory_smart.alerts_product_store_level ADD display_article varchar NULL;

--changeset himansh.bhardwaj@impactanalytics.co:create_product_group stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: adding product_group column
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS product_group TEXT[];

--changeset himansh.bhardwaj@impactanalytics.co:alter_product_group_type stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: changing data type of product_group from TEXT[] to VARCHAR[]
ALTER TABLE inventory_smart.alerts_product_store_level 
ALTER COLUMN product_group 
TYPE VARCHAR[] 
USING product_group::VARCHAR[];

--changeset sri.harsha@impactanalytics.co:create_display_column stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: create new column in alerts table
ALTER TABLE inventory_smart.alerts_product_store_level ADD l1_name varchar NULL;


--changeset himansh.bhardwaj@impactanalytics.co:adding pk stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: adding pk
ALTER TABLE inventory_smart.alerts_product_store_level ADD CONSTRAINT alerts_product_store_level_primary_key PRIMARY KEY (article,store_code);