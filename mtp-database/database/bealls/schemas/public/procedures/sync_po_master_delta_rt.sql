--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_po_master_delta_rt runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:custom_sync_po_master_delta_rt
--comment:  input for po_master_delta_rt

DROP PROCEDURE IF EXISTS public.sync_po_master_delta_rt();

CREATE OR REPLACE PROCEDURE public.sync_po_master_delta_rt()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _worker text;
    _st TIMESTAMP := clock_timestamp();
    _sql text;

    _final_cols_list text;
    _final_cols_list_excluded text;
    _final_cols_list_delta text;

    _sync_sql text;
    _error_sync_sql text;

    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_po_master_delta_rt_test';
    _log_step varchar;

    _pk_columns text;
BEGIN
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        CALL global.data_ingestion_logs(
            _log_code,
            _sp_name,
            'start',
            NULL,
            (clock_timestamp() - _st)::text,
            NULL
        );

        /* ------------------------------------------------------------------------
           ------------- Build column lists from generic schema mapping -------------
           ------------------------------------------------------------------------ */
        SELECT
            string_agg('"' || generic_column_name || '"', ', '),
            string_agg('excluded."' || generic_column_name || '"', ', '),
            string_agg('delta_src."' || generic_column_name || '"', ', ')
        INTO
            _final_cols_list,
            _final_cols_list_excluded,
            _final_cols_list_delta
        FROM global.po_generic_schema_mapping
        WHERE required_in_product
          AND NOT is_attribute;

        -- Deterministic PK column order
        SELECT string_agg('"' || generic_column_name || '"', ', ' ORDER BY generic_column_name)
        INTO _pk_columns
        FROM global.po_generic_schema_mapping
        WHERE is_pk = true;

        /* ------------------------------------------------------------------------
           ------------------------------- Step 1: po_master Sync -------------------
           ------------------------------------------------------------------------ */
        _log_step := 'po_master upsert operation';
        PERFORM set_config('local.log_step', _log_step, true);

        _sync_sql := '
WITH deduplicated_source AS (
    SELECT ' || _final_cols_list_delta || ',
           ROW_NUMBER() OVER (
               PARTITION BY
                   delta_src.po_id,
                   delta_src.receipt_id,
                   delta_src.ref_id,
                   delta_src.product_code,
                   delta_src.pack_id
               ORDER BY delta_src.ctid
           ) AS rn
    FROM public.po_delta_table_rt delta_src
    {where}
)
INSERT INTO inventory_smart.po_master (
    ' || _final_cols_list || ',
    is_deleted,
    created_at,
    updated_at
)
SELECT
    ' || _final_cols_list || ',
    false,
    now(),
    now()
FROM deduplicated_source
WHERE rn = 1
ON CONFLICT (' || _pk_columns || ') DO UPDATE
SET
    (' || _final_cols_list || ', is_deleted, updated_at) =
    (' || _final_cols_list_excluded || ', false, now())
';

        PERFORM public.parellel_insert(
            'WITH rows AS (
                ' || _sync_sql || '
                RETURNING 1
             )
             SELECT count(1) AS cnt FROM rows;',
            50,
            'public.po_delta_table_rt',
            'po_id',
            'idx_po_delta_table_rt_po_id',
            2000
        );

        /* ------------------------------------------------------------------------
           ----------------------- Step 2: po_master_errored Sync --------------------
           --------------------- (Aggregate ordered_quantity) -----------------------
           ------------------------------------------------------------------------ */
        _log_step := 'po_master_errored insertion';
        PERFORM set_config('local.log_step', _log_step, true);

        _error_sync_sql := '
WITH aggregated_source AS (
    SELECT
        delta_src.po_id,
        delta_src.receipt_id,
        MAX(delta_src.po_type) AS po_type,
        delta_src.product_code,
        SUM(COALESCE(delta_src.ordered_quantity, 0))::int4 AS ordered_quantity,
        MAX(delta_src.method_of_allocation) AS method_of_allocation,
        MAX(delta_src.error_code)::int4 AS error_code
    FROM public.po_delta_table_rt delta_src
    {where}
      AND delta_src.error_code IS NOT NULL
    GROUP BY
        delta_src.po_id,
        delta_src.receipt_id,
        delta_src.product_code
)
INSERT INTO inventory_smart.po_master_errored (
    po_id,
    receipt_id,
    po_type,
    product_code,
    ordered_quantity,
    method_of_allocation,
    error_code
)
SELECT
    po_id,
    receipt_id,
    po_type,
    product_code,
    ordered_quantity,
    method_of_allocation,
    error_code
FROM aggregated_source
ON CONFLICT (po_id, receipt_id, product_code) DO UPDATE
SET
    po_type = EXCLUDED.po_type,
    ordered_quantity = EXCLUDED.ordered_quantity,
    method_of_allocation = EXCLUDED.method_of_allocation,
    error_code = EXCLUDED.error_code
';

        PERFORM public.parellel_insert(
            'WITH rows AS (
                ' || _error_sync_sql || '
                RETURNING 1
             )
             SELECT count(1) AS cnt FROM rows;',
            50,
            'public.po_delta_table_rt',
            'po_id',
            'idx_po_delta_table_rt_po_id',
            2000
        );

        CALL global.data_ingestion_logs(
            _log_code,
            _sp_name,
            'end',
            NULL,
            (clock_timestamp() - _st)::text,
            NULL
        );

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(
                _log_code,
                _sp_name,
                _log_step,
                SQLERRM,
                (clock_timestamp() - _st)::text,
                NULL
            );
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;
END
$procedure$
;