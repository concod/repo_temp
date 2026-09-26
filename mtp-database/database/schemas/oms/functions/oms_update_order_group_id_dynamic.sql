--liquibase formatted sql
--changeset cascade:oms_update_order_group_id_dynamic runOnChange:true stripComments:false splitStatements:false
--comment: Dynamic version of oms_update_order_group_id - config-driven
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.oms_update_order_group_id_dynamic(success_orders INT[], sp_config jsonb);

CREATE OR REPLACE FUNCTION oms.oms_update_order_group_id_dynamic(
    success_orders INT[],
    sp_config jsonb DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    v_concat_columns TEXT;
    v_paf_source TEXT;
    v_paf_filter TEXT;
    v_update_sql TEXT;
    v_gen_random_uuid TEXT := gen_random_uuid()::varchar;
    v_error_message TEXT;
BEGIN
    -- Validate sp_config
    IF sp_config IS NULL THEN
        RAISE EXCEPTION 'sp_config is required for dynamic execution';
    END IF;

    -- Extract config keys from filters
    v_paf_source := COALESCE(sp_config->>'paf_source', 'global.product_attributes_filter paf');
    v_paf_filter := COALESCE(sp_config->>'paf_filter', 'oor.article = paf.article');

    -- Build concat columns from individual config entries
    v_concat_columns := COALESCE(sp_config->>'concat_col_article', '') || ', ' ||
                        COALESCE(sp_config->>'concat_col_placement_date', '') || ', ' ||
                        COALESCE(sp_config->>'concat_col_placement_recom_date', '') || ', ' ||
                        COALESCE(sp_config->>'concat_col_status_id', '');

    -- Build dynamic SQL
    v_update_sql := '
        UPDATE oms.oms_orders_recommended oor
        SET order_group_id = MD5(
            CONCAT(
                ' || v_concat_columns || '
            )
        )
        FROM ' || v_paf_source || '
        WHERE oor.id = ANY($1)
        AND ' || v_paf_filter;

    -- Execute dynamic SQL
    BEGIN
        EXECUTE v_update_sql USING success_orders;
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := SQLERRM;
            RAISE EXCEPTION 'Error executing dynamic SQL: % (SQLSTATE: %)', 
                v_error_message, SQLSTATE;
    END;

    -- Log execution for audit trail
    PERFORM global.sp_log(
        v_gen_random_uuid, 
        'oms.oms_update_order_group_id_dynamic', 
        'Execution completed',
        v_update_sql,
        jsonb_build_object(
            'config_provided', sp_config IS NOT NULL
        )
    );

    RETURN v_update_sql;

EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;
        
        -- Log error
        PERFORM global.sp_log(
            v_gen_random_uuid, 
            'oms.oms_update_order_group_id_dynamic', 
            'ERROR',
            v_error_message,
            jsonb_build_object(
                'success_orders_count', array_length(success_orders, 1),
                'sqlstate', SQLSTATE
            )
        );
        
        RAISE EXCEPTION 'Dynamic SP failed: % (SQLSTATE: %)', v_error_message, SQLSTATE;
END;
$function$;
