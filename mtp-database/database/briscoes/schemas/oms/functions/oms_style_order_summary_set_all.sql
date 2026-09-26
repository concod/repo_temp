--liquibase formatted sql
--changeset mssprakash.yashwant:Added_oms_style_order_summary_set_all_test_update3 runOnChange:true stripComments:false splitStatements:false context:MTP-95903 labels:oms_style_order_summary_set_all_test_update3
--comment: Added selected_linked_store_codes to the function
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_style_order_summary_set_all(text, text, _varchar, _varchar, text, _varchar);
DROP FUNCTION IF EXISTS inventory_smart.oms_style_order_summary_set_all(text, text, _varchar, _varchar, text);

CREATE OR REPLACE FUNCTION inventory_smart.oms_style_order_summary_set_all(set_all_on text, update_level text, week_month_list character varying[], orders_list character varying[], user_id text, selected_linked_store_codes character varying[] DEFAULT NULL)
 RETURNS SETOF integer
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF update_level = 'fiscal_year_week' THEN
        -- Update and return updated row IDs when update_level is 'fiscal_year_week'
        RETURN QUERY
        UPDATE inventory_smart.oms_orders_recommended AS o
        SET order_quantity = CASE 
                                WHEN set_all_on = 'raw_roq' THEN raw_roq
                                WHEN set_all_on = 'roq_unconstrained' THEN roq_unconstrained
                             END
        WHERE o.order_group_id = ANY(orders_list)
          AND o.fiscal_year_week = ANY(week_month_list::int[])  -- Match fiscal_year_week
          AND (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR o.loc_code = ANY(selected_linked_store_codes))
        RETURNING o.id;
    ELSE
        -- Update and return updated row IDs for other update_level values
        RETURN QUERY
        UPDATE inventory_smart.oms_orders_recommended AS o
        SET order_quantity = CASE 
                                WHEN set_all_on = 'raw_roq' THEN raw_roq
                                WHEN set_all_on = 'roq_unconstrained' THEN roq_unconstrained
                             END
        WHERE o.order_group_id = ANY(orders_list)
          AND (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR o.loc_code = ANY(selected_linked_store_codes))
        -- keeping this in comments for any reverts in future
        -- AND upper(month::text) = ANY(ARRAY(SELECT upper(unnest(week_month_list))))
        RETURNING o.id;
    END IF;
END;
$function$
;
