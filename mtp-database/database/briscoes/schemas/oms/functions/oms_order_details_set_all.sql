--liquibase formatted sql
--changeset nikhil.dhoot:inventory_smart_order_details_set_all_3 runOnChange:true stripComments:false splitStatements:false context:MTP-98967_3 labels:MTP-132262
--comment: Added fallback for order_quantity

DROP FUNCTION IF EXISTS inventory_smart.inventory_smart_order_details_set_all(jsonb, jsonb, jsonb, int4, _int4);
DROP FUNCTION IF EXISTS inventory_smart.inventory_smart_order_details_set_all(jsonb, jsonb, jsonb, int4, text);
CREATE OR REPLACE FUNCTION inventory_smart.inventory_smart_order_details_set_all(
   order_group_control jsonb,   -- holds set_all_on, order_group_ids, unchecked_order_group_ids, is_select_all_records
   product_filters jsonb,       -- product filters
   store_filters jsonb,         -- store filters
   user_id integer,
   fiscal_weeks_text text
)
RETURNS void
LANGUAGE plpgsql
AS $function$

DECLARE
   v_pa_sql text := '';
   v_sa_sql text := '';
   v_sql text := '';

   v_set_all_on text;
   v_is_select_all boolean;
   v_order_group_ids varchar[];
   v_unchecked_order_group_ids varchar[];
   v_fiscal_weeks integer[];
   exclusion_conditions text := '';
   locked_children_by_order_group jsonb := '[]'::jsonb;
   exclusion_group record;
   ids_str text;
BEGIN
   -- Extract JSON values
   v_set_all_on := order_group_control->>'set_all_on';
   v_is_select_all := COALESCE((order_group_control->>'is_select_all_records')::boolean, false);
   v_order_group_ids := COALESCE(ARRAY(SELECT jsonb_array_elements_text(order_group_control->'order_group_ids')), '{}');
   v_unchecked_order_group_ids := COALESCE(ARRAY(SELECT jsonb_array_elements_text(order_group_control->'unchecked_order_group_ids')), '{}');
   locked_children_by_order_group := COALESCE(order_group_control->'locked_children_by_order_group', '[]'::jsonb);

   -- Build exclusion filter for locked orders
   IF locked_children_by_order_group IS NOT NULL AND jsonb_typeof(locked_children_by_order_group) = 'object' THEN
      FOR exclusion_group IN SELECT key, value FROM jsonb_each(locked_children_by_order_group)
      LOOP
         IF jsonb_typeof(exclusion_group.value) = 'array' AND jsonb_array_length(exclusion_group.value) > 0 THEN
            SELECT string_agg((elem->>'id')::text, ',')
            INTO ids_str
            FROM jsonb_array_elements(exclusion_group.value) elem
            WHERE (elem ? 'id') AND (elem->>'id') ~ '^[0-9]+$';

            IF ids_str IS NOT NULL AND ids_str <> '' THEN
               exclusion_conditions := exclusion_conditions || format(
                  ' AND NOT (order_group_id = %L AND id IN (%s))',
                  exclusion_group.key,
                  ids_str
               );
            END IF;
         END IF;
      END LOOP;
   END IF;

   -- Parse fiscal_weeks_text like "[202635, 202636, ...]" into integer[]
   IF fiscal_weeks_text IS NULL OR btrim(fiscal_weeks_text) = '' THEN
      v_fiscal_weeks := NULL;
   ELSE
      v_fiscal_weeks := string_to_array(
                           regexp_replace(
                              regexp_replace(fiscal_weeks_text, '^\s*\[|\]\s*$', '', 'g'), -- remove surrounding brackets
                              '\s+', '', 'g' -- remove all whitespace
                           ),
                           ','
                        )::int[];
   END IF;

   -- Safety rail: if fiscal weeks is null or empty, exit
   IF v_fiscal_weeks IS NULL OR array_length(v_fiscal_weeks, 1) IS NULL THEN
      RAISE NOTICE 'No fiscal weeks provided, exiting without update';
      RETURN;
   END IF;

   -- Generate product attribute filter SQL
   v_pa_sql := inventory_smart.form_main_table_filters('ph_master', product_filters);

   -- Generate store filter SQL
   v_sa_sql := inventory_smart.form_main_table_filters('store_attributes_filter', store_filters);

   -- Case 1: user selected specific rows
   IF NOT v_is_select_all THEN
      v_sql := format($q$
            UPDATE inventory_smart.inventory_smart_orders_recommended_store
            SET order_quantity = CASE 
                                    WHEN %L = 'raw_roq' THEN raw_roq
                                    WHEN %L = 'roq_unconstrained' THEN roq_unconstrained
                                    WHEN %L = 'ia_shipment_order_quantity' THEN ia_shipment_order_quantity
                                    WHEN %L = 'roq_constrained' THEN roq_constrained
                                    ELSE order_quantity
                                 END,
               updated_by = %L::integer,
               updated_at = CURRENT_TIMESTAMP
            WHERE order_group_id = ANY(%L)
            AND fiscal_year_week = ANY(%L)
            %s
      $q$, v_set_all_on, v_set_all_on, v_set_all_on, v_set_all_on,
            user_id, v_order_group_ids, v_fiscal_weeks, exclusion_conditions);

   -- Case 2: user selected all rows with exclusions
   ELSE
      -- Clean up filter SQLs to avoid duplicate WHERE
      IF v_pa_sql IS NOT NULL AND v_pa_sql <> '' THEN
         v_pa_sql := regexp_replace(v_pa_sql, '^\s*WHERE', 'AND', 'i');
      END IF;

      IF v_sa_sql IS NOT NULL AND v_sa_sql <> '' THEN
         v_sa_sql := regexp_replace(v_sa_sql, '^\s*WHERE', 'AND', 'i');
      END IF;

      v_sql := format($q$
         UPDATE inventory_smart.inventory_smart_orders_recommended_store
         SET order_quantity = CASE 
                                 WHEN %L = 'raw_roq' THEN raw_roq
                                 WHEN %L = 'roq_unconstrained' THEN roq_unconstrained
                                 WHEN %L = 'ia_shipment_order_quantity' THEN ia_shipment_order_quantity
                                 WHEN %L = 'roq_constrained' THEN roq_constrained
                                 ELSE order_quantity
                              END,
               updated_by = %L::integer,
               updated_at = CURRENT_TIMESTAMP
         WHERE fiscal_year_week = ANY(%L)
            %s
            %s
            %s
            %s
      $q$, v_set_all_on, v_set_all_on, v_set_all_on, v_set_all_on,
            user_id,
            v_fiscal_weeks,
            v_pa_sql, 
            v_sa_sql,
            CASE WHEN array_length(v_unchecked_order_group_ids, 1) IS NOT NULL
               THEN 'AND order_group_id NOT IN (' || quote_literal(array_to_string(v_unchecked_order_group_ids, ',')) || ')'
               ELSE ''
            END,
            exclusion_conditions);
   END IF;

   -- Debug output
   RAISE NOTICE 'Final SQL: %', v_sql;

   -- Execute dynamic SQL
   EXECUTE v_sql;

END;
$function$;