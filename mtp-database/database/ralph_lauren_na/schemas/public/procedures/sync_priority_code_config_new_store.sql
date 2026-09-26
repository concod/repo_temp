--liquibase formatted sql
--changeset pooja.shekar:added sp for sync_priority_code_config_new_store runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-49482
--comment: 	created SP for sync_priority_code_config_new_store
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_priority_code_config_new_store();
CREATE OR REPLACE PROCEDURE public.sync_priority_code_config_new_store()
LANGUAGE plpgsql
AS $procedure$
DECLARE
    _worker TEXT;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_priority_code_config_new_store';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
    -- Insert operation
    PERFORM public.parellel_insert(
        'WITH rows AS (
            INSERT INTO inventory_smart.priority_code_configuration(article, store_code, priority_code, channel, l0_name) 
            WITH cte1 AS (
                SELECT 
                    store_code,
                    sister_store_code,
                    MAX(CASE WHEN elem->>''attribute_name'' = ''l0_name'' THEN elem->''values''->>0 END) AS l0_name,
                    MAX(CASE WHEN elem->>''attribute_name'' = ''l1_name'' THEN elem->''values''->>0 END) AS l1_name,
                    MAX(CASE WHEN elem->>''attribute_name'' = ''l2_name'' THEN elem->''values''->>0 END) AS l2_name,
                    MAX(CASE WHEN elem->>''attribute_name'' = ''l3_name'' THEN elem->''values''->>0 END) AS l3_name,
                    MAX(CASE WHEN elem->>''attribute_name'' = ''l4_name'' THEN elem->''values''->>0 END) AS l4_name
                FROM 
                    "global".new_store_mapping,
                    jsonb_array_elements(hierarchies::jsonb) AS elem
                GROUP BY store_code, sister_store_code
            )
            SELECT DISTINCT 
                a.article,
                d.store_code,
                a.priority_code,
                a.channel,
                d.l0_name
            FROM inventory_smart.priority_code_configuration a 
            JOIN "global".store_attributes_filter saf USING(channel)
            JOIN "global".product_attributes_filter paf USING(article)
            JOIN cte1 d 
				
				ON saf.retail_facility_code = d.sister_store_code
                AND paf.l0_name = d.l0_name
                AND paf.l1_name = d.l1_name
                AND paf.l2_name = d.l2_name
                AND paf.l3_name = d.l3_name
                AND paf.l4_name = d.l4_name
			JOIN "global".new_store_data f
			on d.store_code = f.store_code
            {where} 
            AND saf.active 
            AND paf.active
			and allocation_start_date >= current_date
            ON CONFLICT (article, store_code, l0_name) DO NOTHING
            RETURNING 1
        ) 
        SELECT COUNT(1) AS cnt 
        FROM rows;', 
        50, 'inventory_smart.article_status_tag', 'product_code', NULL, 500
    );
    
    RAISE NOTICE 'Insert step completed in: %', (clock_timestamp() - _st);
    -- Update operation
    PERFORM public.parellel_insert(
        'WITH rows AS (
            UPDATE inventory_smart.priority_code_configuration 
            SET instore_date = current_date 
            {where} 
            AND instore_date < current_date
            RETURNING 1
        ) 
        SELECT COUNT(1) AS cnt 
        FROM rows;', 
        50, 'inventory_smart.priority_code_configuration', 'article', NULL, 500
    );
    RAISE NOTICE 'Update step completed in: %', (clock_timestamp() - _st);
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'An error occurred: %', SQLERRM;  
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
END;
$procedure$;