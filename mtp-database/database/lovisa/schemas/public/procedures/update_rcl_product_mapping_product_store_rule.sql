--liquibase formatted sql
--changeset aleena.reji@impactanalytics.co:update_rcl_product_mapping_product_store_rule runOnChange:true stripComments:false splitStatements:false context:lovisa_inv_smart labels:update_rcl_product_mapping_product_store_rule
--comment: Changeset for update_rcl_product_mapping_product_store_rule
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.update_rcl_product_mapping_product_store_rule();
CREATE OR REPLACE PROCEDURE public.update_rcl_product_mapping_product_store_rule()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.update_rcl_product_mapping_product_store_rule';
    _log_step varchar;
    _st       TIMESTAMP := clock_timestamp();
BEGIN
    -- start log
    CALL global.data_ingestion_logs(
        _log_code,
        _sp_name,
        'start',
        NULL,
        (clock_timestamp() - _st)::text,
        NULL
    );

    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN

    WITH base AS (
        SELECT 
            paf.article,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            paf.range_name
        FROM "global".product_attributes_filter paf
    )

    UPDATE global.rcl_product_mapping_product_store_rule rpmpsr
    SET rcl_dimension =
        jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        rpmpsr.rcl_dimension,
                        '{l1_name}', to_jsonb(b.l1_name), true
                    ),
                    '{l2_name}', to_jsonb(b.l2_name), true
                ),
                '{l3_name}', to_jsonb(b.l3_name), true
            ),
            '{range_name}', to_jsonb(b.range_name), true
        )
    FROM base b
    WHERE 
        CONCAT(
            rpmpsr.rcl_dimension ->> 'l4_name',
            '-',
            rpmpsr.rcl_dimension ->> 'l0_name'
        ) = b.article
        AND rpmpsr.rcl_code = 32
        AND (
            (rpmpsr.rcl_dimension ->> 'l1_name') IS DISTINCT FROM b.l1_name OR
            (rpmpsr.rcl_dimension ->> 'l2_name') IS DISTINCT FROM b.l2_name OR
            (rpmpsr.rcl_dimension ->> 'l3_name') IS DISTINCT FROM b.l3_name OR
            (rpmpsr.rcl_dimension ->> 'range_name') IS DISTINCT FROM b.range_name
        );

        CALL global.data_ingestion_logs(
            _log_code,
            _sp_name,
            'end',
            NULL,
            (clock_timestamp() - _st)::text,
            NULL
        );

    END;
END
$procedure$
;
