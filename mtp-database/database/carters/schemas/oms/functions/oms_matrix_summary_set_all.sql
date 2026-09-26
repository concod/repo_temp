--liquibase formatted sql
--changeset aman.pareek@impactanalytics.co:extensions runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Added selected_linked_store_codes to the function

DROP FUNCTION IF EXISTS inventory_smart.oms_matrix_summary_set_all(text, text, _varchar, _varchar, text, _varchar);
DROP FUNCTION IF EXISTS inventory_smart.oms_matrix_summary_set_all(text, text, _varchar, _varchar, text);
CREATE OR REPLACE FUNCTION inventory_smart.oms_matrix_summary_set_all(set_all_on text, update_level text, week_month_list integer[], styles_list character varying[], user_id text, selected_linked_store_codes character varying[] DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
AS $function$

 declare
 v_recommended_orders_sql text:= '';
  
 begin

 	 IF update_level = 'fiscal_year_week' THEN
        -- When update_level is 'fiscal_year_week', use fiscal_year_week in the condition
        UPDATE inventory_smart.oms_orders_recommended
        SET order_quantity = CASE 
                                WHEN set_all_on = 'raw_roq' THEN raw_roq
                                WHEN set_all_on = 'roq_unconstrained' THEN roq_unconstrained
                                WHEN set_all_on = 'ia_shipment_order_quantity' THEN ia_shipment_order_quantity
                                WHEN set_all_on = 'roq_constrained' THEN roq_constrained
                             END
        WHERE style = ANY(styles_list)
          AND fiscal_year_week = ANY(week_month_list)  -- Match fiscal_year_week
          AND (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR loc_code = ANY(selected_linked_store_codes));
    ELSE
        -- For any other value of update_level, use fiscal_year_month in the condition
        UPDATE inventory_smart.oms_orders_recommended
        SET order_quantity = CASE 
                                WHEN set_all_on = 'raw_roq' THEN raw_roq
                                WHEN set_all_on = 'roq_unconstrained' THEN roq_unconstrained
                                WHEN set_all_on = 'ia_shipment_order_quantity' THEN ia_shipment_order_quantity
                                WHEN set_all_on = 'roq_constrained' THEN roq_constrained
                             END
        WHERE style = ANY(styles_list)
          AND fiscal_year_month = ANY(week_month_list)  -- Match fiscal_year_month
          AND (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR loc_code = ANY(selected_linked_store_codes));
    END IF;
 end
 $function$
;
