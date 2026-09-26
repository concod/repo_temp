-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_product_store_hierarchy_mapping_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_bp_bucket_config
-- comment: derived table for sync_product_store_hierarchy_mapping_v1

DROP  PROCEDURE if exists public.sync_product_store_hierarchy_mapping();

CREATE OR REPLACE PROCEDURE public.sync_product_store_hierarchy_mapping()
LANGUAGE plpgsql
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_store_hierarchy_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    INSERT INTO global.product_store_hierarchy_mapping
    (
        l0_name,
        l1_name,
        l2_name,
        l3_name,
        channel,
        country
    )
    WITH prod_cte AS (
        SELECT
            l0_cuq AS l0_name,
            l1_cuq AS l1_name,
            l2_cuq AS l2_name,
            l3_cuq AS l3_name
        FROM price_promo.product_master
        GROUP BY 1, 2, 3, 4
    ),
    store_cte AS (
        SELECT s0_name
        FROM global.tb_store_master
        GROUP BY 1
        UNION ALL
        SELECT 'Marketplace'
    ),
    final_data AS (
        SELECT
            c1.l0_name,
            c1.l1_name,
            c1.l2_name,
            c1.l3_name,
            c2.s0_name AS channel,
            'USA' AS country
        FROM prod_cte c1
        CROSS JOIN store_cte c2
    )
    SELECT
        f.l0_name,
        f.l1_name,
        f.l2_name,
        f.l3_name,
        f.channel,
        f.country
    FROM final_data f
    WHERE NOT EXISTS (
        SELECT 1
        FROM global.product_store_hierarchy_mapping t
        WHERE
            t.l0_name = f.l0_name
            AND t.l1_name = f.l1_name
            AND t.l2_name = f.l2_name
            AND t.l3_name = f.l3_name
            AND t.channel = f.channel
            AND t.country = f.country
    );
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;
