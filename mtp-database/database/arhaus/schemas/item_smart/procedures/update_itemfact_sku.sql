--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:update_itemfact_sku runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:update_itemfact_sku_initial_commit
--comment: initial changeset for update_itemfact_sku
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS item_smart.update_itemfact_sku();
CREATE OR REPLACE PROCEDURE item_smart.update_itemfact_sku()
LANGUAGE plpgsql
AS $procedure$
BEGIN
    -- Truncate the target table
    TRUNCATE TABLE item_smart.itemfact_sku;

    -- Insert data from the source table
    INSERT INTO item_smart.itemfact_sku
    SELECT dept text ,
	hierarchy_code int8 ,
	launch_date date ,
	markdown_date date ,
	vendor_name text ,
	exit_date date ,
	no_of_reg_weeks int8 ,
	lead_time int8 ,
	baseline_discount float8 ,
	moq int4 ,
	presentation_min int4 ,
	fwos_target int4 ,
	auc float4 ,
	aoh_flag bool ,
	launch_date_feed date ,
	markdown_date_feed date ,
	vendor_name_feed text ,
	exit_date_feed date ,
	no_of_reg_weeks_feed int8 ,
	lead_time_feed int8 ,
	moq_feed int4 ,
	presentation_min_feed int4 ,
	auc_feed float4 ,
	fwos_target_feed int4 ,
	baseline_discount_feed float8 ,
	aoh_flag_feed bool ,
	launch_date_is_source_feed bool  ,
	markdown_date_is_source_feed bool ,
	vendor_name_is_source_feed bool ,
	exit_date_is_source_feed bool ,
	no_of_reg_weeks_is_source_feed bool ,
	lead_time_is_source_feed bool ,
	moq_is_source_feed bool ,
	presentation_min_is_source_feed bool ,
	auc_is_source_feed bool ,
	fwos_target_is_source_feed bool ,
	baseline_discount_is_source_feed bool,
	aoh_flag_is_source_feed bool 
    FROM public.itemfact_sku_refreshed;

END;
$procedure$
;