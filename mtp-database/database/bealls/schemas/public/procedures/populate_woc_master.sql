--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_article_instock runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:populate_woc_master
--comment: initial changeset for populate_woc_master sp

DROP PROCEDURE IF EXISTS public.populate_woc_master();

CREATE OR REPLACE PROCEDURE public.populate_woc_master()
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.populate_woc_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

    WITH src_l4 AS (
        SELECT DISTINCT TRIM(l4_name) AS l4_name
        FROM global.product_attributes_filter
        WHERE active = TRUE
          AND l4_name IS NOT NULL
    ),
    src_store AS (
        SELECT DISTINCT TRIM(store_code) AS store_code
        FROM global.store_attributes_filter
        WHERE active = TRUE
          AND special_classification = 'STORE'
          AND store_code IS NOT NULL
    ),
    pairs AS (
        SELECT l4.l4_name, st.store_code
        FROM src_l4 l4
        CROSS JOIN src_store st
    )
    INSERT INTO inventory_smart.woc_master (
        l4_name,
        store_code,
        woc,
        max_mod,
        status,
        created_at,
        updated_at,
        created_by,
        updated_by,
        upload_flag
    )
    SELECT
        p.l4_name,
        p.store_code,
        8::float4   AS woc,
        1::float4   AS max_mod,
        TRUE        AS status,
        NOW()       AS created_at,
        NULL        AS updated_at,
        49          AS created_by,
        NULL        AS updated_by,
        'false'     AS upload_flag
    FROM pairs p
    ON CONFLICT (l4_name, store_code) DO NOTHING;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;
