--liquibase formatted sql
--changeset aman.pareek:oms_create_scenario_recommended_summary_14 runOnChange:true stripComments:false splitStatements:false context:MTP-109999 labels:oms_create_scenario_recommended_summary_Store
--comment:column table updated for original safety stock 
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_create_scenario_recommended_summary_store(jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_create_scenario_recommended_summary_store(input_params jsonb DEFAULT '{"additional_params": []}'::jsonb)
 RETURNS TABLE(id integer, product_code character varying, fiscal_year_week integer, order_type character varying, article character varying, size character varying, brand character varying, category character varying, dc_name character varying, vendor_name character varying, order_quantity_original numeric, order_cost numeric, safety_stock_original numeric, target_sl_original double precision, wos_original integer, total_inventory integer, on_order integer, minimum_order_qty integer, maximum_order_qty integer, moq_header integer, order_multiple integer, order_placement_date_original date, projected_delivery_date_original date, vendor_lead_time integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    -- Declare input structure variables
    v_additional_params JSONB[];
    param_json JSONB;
    -- Declare extract variables
    where_additional_condition TEXT := '';
    transform_query TEXT;
BEGIN
    -- Convert additional_params JSON array to JSONB array
    SELECT ARRAY(
        SELECT jsonb_array_elements(COALESCE(input_params->'additional_params', '[]'::jsonb))
    ) INTO v_additional_params;

   -- Generate additional params condition
	IF array_length(v_additional_params, 1) IS NOT NULL THEN
    	where_additional_condition := '';
    
    
    -- Build conditions for each parameter set
    FOR i IN 1..array_length(v_additional_params, 1) LOOP
        param_json := v_additional_params[i];
        
        
        -- Add OR between conditions except for the first one
        IF i > 1 THEN
            where_additional_condition := where_additional_condition || ' OR ';
        END IF;
        
        -- Build condition for current parameter set
        DECLARE
            param_conditions TEXT := '';
            param_keys TEXT[];
        BEGIN
            SELECT array_agg(key::TEXT)
            INTO param_keys
            FROM jsonb_object_keys(param_json) AS key;
            
            
            FOR j IN 1..array_length(param_keys, 1) LOOP
                IF j > 1 THEN
                    param_conditions := param_conditions || ' AND ';
                END IF;
                
                param_conditions := param_conditions || 
                    CASE 
                        WHEN param_json->>param_keys[j] IS NULL THEN 
                            format('oor.%I IS NULL', param_keys[j])
                        WHEN jsonb_typeof(param_json->param_keys[j]) = 'boolean' THEN 
                            format('oor.%I = %s', param_keys[j], param_json->>param_keys[j])
                        WHEN jsonb_typeof(param_json->param_keys[j]) = 'number' THEN 
                            format('oor.%I = %s', param_keys[j], param_json->>param_keys[j])
                        WHEN jsonb_typeof(param_json->param_keys[j]) = 'array' THEN 
                            format('oor.%I = ANY(%L::text[])', param_keys[j], 
                                array(SELECT jsonb_array_elements_text(param_json->param_keys[j])))
                        ELSE 
                            format('oor.%I = %L', param_keys[j], param_json->>param_keys[j])
                    END;
            END LOOP;
            
            
            where_additional_condition := where_additional_condition || '(' || param_conditions || ')';
        END;
    END LOOP;
    
    -- Wrap the entire condition in parentheses
    where_additional_condition := '(' || where_additional_condition || ')';
    
ELSE
    where_additional_condition := '1=1';
END IF;


    -- Construct the dynamic SQL query
    transform_query := FORMAT($q$
		WITH current_fiscal_week AS (
            SELECT fiscal_year_week
            FROM global.fiscal_date_mapping
            WHERE calendar_date = CURRENT_DATE
        ),
        immediate_orders AS (
            SELECT *, 
                row_number() OVER (
                    PARTITION BY oor.article, oor.size, oor.store_code
                    ORDER BY oor.fiscal_year_week
                ) as rn
            FROM inventory_smart.oms_orders_recommended_store oor
            WHERE oor.fiscal_year_week >= (SELECT fiscal_year_week FROM current_fiscal_week)
            AND oor.order_type = 'Immediate'
            AND %s
        ),
        order_cycle_orders AS (
            SELECT *, 
                row_number() OVER (
                    PARTITION BY oor.article, oor.size, oor.store_code
                    ORDER BY oor.fiscal_year_week
                ) as rn
            FROM inventory_smart.oms_orders_recommended_store oor
            WHERE oor.fiscal_year_week >= (SELECT fiscal_year_week FROM current_fiscal_week)
            AND oor.order_type = 'Order Cycle'
            AND %s
        ),
            valid_orders AS (
            SELECT 
                i.*,
                'Immediate' as source_type
            FROM immediate_orders i
            LEFT JOIN order_cycle_orders oc 
                ON i.article = oc.article 
                AND i.size = oc.size
                AND i.store_code = oc.store_code
                AND oc.rn = 1
            WHERE i.rn = 1 
            AND (oc.fiscal_year_week IS NULL OR i.fiscal_year_week <= oc.fiscal_year_week)
            
            UNION ALL
            
            SELECT 
                oc.*,
                'Order_Cycle' as source_type
            FROM order_cycle_orders oc
            WHERE oc.rn = 1
        ),
        filtered_data AS (
            SELECT DISTINCT
					oor.id,
					oor.product_code::varchar,
		    		oor.fiscal_year_week,
					oor.order_type::varchar,
		        	oor.article::VARCHAR,
					oor.size::VARCHAR,
					oor.l0_name as brand,
					oor.l1_name as category,
					COALESCE(oor.store_code::varchar, '-') as dc_name,
					COALESCE(oor.vendor_name::varchar, '-') as vendor_name,
					oor.raw_roq::NUMERIC as order_quantity_original,
					(oor.order_quantity * oor.unit_cost)::NUMERIC AS order_cost,
					COALESCE(oor.elt_projected_safety_stock, 0)::NUMERIC AS safety_stock_original,
                    COALESCE(ocss.service_level_pct, 0)::double precision AS target_sl_original,
                    COALESCE(ocss.safety_stock_twos, 0)::integer AS wos_original,
                    COALESCE(kpi.system_inv, 0)::integer AS total_inventory,
                    COALESCE(kpi.open_receipt_units, 0)::integer AS on_order,
                    COALESCE(oor.min_order_quantity_sku, 0)::integer AS minimum_order_qty,
                    COALESCE(oor.max_order_quantity_sku, 0)::integer AS maximum_order_qty,
                    COALESCE(oor.max_order_quantity_style, 0)::integer AS moq_header,
                    COALESCE(oor.order_multiple, 0)::integer AS order_multiple,
			        oor.order_placement_date::date AS order_placement_date_original,
                	oor.editable_expected_receipt_date::date AS projected_delivery_date_original,
                	COALESCE(oor.effective_lead_time, 0)::integer AS vendor_lead_time
            FROM valid_orders oor

            LEFT JOIN inventory_smart.oms_kpi_store kpi
                ON oor.product_code = kpi.product_code 
                AND oor.store_code = kpi.store_code
            left join inventory_smart.oms_constraints_safety_stock_store ocss
            	 ON oor.article = ocss.article 
                AND oor.store_code = ocss.store_code
            WHERE oor.order_status_id = 0
        )
        SELECT *
        FROM filtered_data
    $q$, 
    where_additional_condition, where_additional_condition
);

    RAISE NOTICE 'Transform Query: %', transform_query;
    
    RETURN QUERY EXECUTE transform_query;
END;
$function$
;
