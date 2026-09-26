--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:update_itemfact_sku_week runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:update_itemfact_sku_week_initial_commit
--comment: initial changeset for update_itemfact_sku_week
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS item_smart.update_itemfact_sku_week();
CREATE OR REPLACE PROCEDURE item_smart.update_itemfact_sku_week()
LANGUAGE plpgsql
AS $procedure$
BEGIN
    -- Truncate the target table
    TRUNCATE TABLE item_smart.itemfact_sku_week;

    -- Insert data from the source table
    INSERT INTO item_smart.itemfact_sku_week
    SELECT 
		
		dept::text,
		hierarchy_code::int8,
		current_week::bigint,
		purchase_status::text,
		fwos int4,
		fwos_feed int4,
		fwos_is_source_feed bool,
		lead_time int4,
		lead_time_feed int4,
		lead_time_is_source_feed bool,
		damage_rate int4,
		damage_rate_feed int4,
		damage_rate_is_source_feed bool,
		moq float8,
		moq_feed float8,
		moq_is_source_feed bool
    FROM public.itemfact_sku_week_refreshed;

END;
$procedure$
;