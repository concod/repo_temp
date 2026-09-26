--liquibase formatted sql
--changeset chandranil.ghosh:oms_delete_orders_cb_2 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:oms_delete_orders_briscoes_1
--comment: Added SP for OMS delete orders with minor fix
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_delete_orders(jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.oms_delete_orders(p_orders jsonb, p_user_id integer)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
/*
   Deletes orders from oms_orders_recommended and oms_orders_approved
   id - sku id
*/
DECLARE
    _sku_ids int[] := ARRAY[]::int[];
    _query text;
    v_date_rec record;
BEGIN
    -- loop through all records in the input JSON
    FOR v_date_rec IN 
        SELECT * 
        FROM jsonb_to_recordset(p_orders) AS x(
            id text, 
            order_status_id int, 
            order_gen_type text, 
            order_id text, 
            order_gen_type_category text
        )
    LOOP
        _query := NULL; -- reset each iteration

        -- If it's recommended/scenario/edited/other → soft delete + reset status
        IF v_date_rec.order_gen_type IN ('Recommended', 'Scenario', 'Edited') 
           OR v_date_rec.order_gen_type_category IN ('Recommended', 'Other',  'Scenario', 'Edited') THEN
            _query := format(
                $sql$
                UPDATE inventory_smart.oms_orders_recommended oor
                SET
                    is_deleted = false,
                    updated_at = now(),
                    order_status_id = 0,
                    updated_by = %s
                WHERE oor.id = %s
                $sql$,
                p_user_id,
                v_date_rec.id
            );
        END IF;

        -- If it's manual → hard delete from recommended
        IF v_date_rec.order_gen_type = 'Manual' 
           OR v_date_rec.order_gen_type_category = 'Manual' THEN
            _query := format(
                $sql$
                DELETE FROM inventory_smart.oms_orders_recommended oor 
                WHERE oor.id = %s
                RETURNING oor.id
                $sql$,
                v_date_rec.id
            );
        END IF;

        -- If approved status → delete from approved table
        IF v_date_rec.order_status_id = 3 THEN
            _query := format(
                $sql$
                DELETE FROM inventory_smart.oms_orders_approved ooa
                WHERE ooa.id = %s
                RETURNING ooa.id
                $sql$,
                v_date_rec.id
            );
        END IF;

        -- Execute if we built a query
        IF _query IS NOT NULL THEN
            EXECUTE _query;
        END IF;

        -- Track sku ids
        _sku_ids := array_append(_sku_ids, v_date_rec.id::int);
    END LOOP;

    -- Deduplicate ids
    _sku_ids := ARRAY(SELECT DISTINCT unnest(_sku_ids));

    RETURN jsonb_build_object(
        'sku_ids', _sku_ids
    );
END;
$function$;
