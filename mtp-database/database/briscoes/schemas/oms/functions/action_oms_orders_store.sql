--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:Updated_action_oms_orders_7 runOnChange:true stripComments:false splitStatements:false context:MTP-97176 labels:MTP-80452_6
--comment: Status 1/2/-1 also sets recommended_store.comment from payload; summary SP reads this column

DROP FUNCTION IF EXISTS inventory_smart.action_oms_orders_store(jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.action_oms_orders_store(jsonb)
 RETURNS integer[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
   _key              text;
   _value            text;
   i                 record;
   v_order_status_id int;
   v_action_id       int;
   v_order_id        int[];
   v_comment         text;
   v_user_id         int;
   v_affected_rows   int := 0;
   approved_ids      int[];
   v_order_group_id  varchar[];
   
   -- Dynamic SQL query variables
   v_update_query    text;
   v_insert_query    text;
   v_delete_query    text;
   v_select_query    text;
   
BEGIN
   -- Parse input JSON parameters
   FOR _key, _value IN SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL LOOP
     IF _key = 'status' THEN
       v_order_status_id := _value::int;
       RAISE NOTICE 'order_status_id %', v_order_status_id;
     ELSIF _key = 'action_code' THEN
       v_action_id := _value;
       RAISE NOTICE 'action_code %', v_action_id;
     ELSIF _key = 'orders_id' THEN
       v_order_id := _value::int[];
       RAISE NOTICE 'orders_id %', array_to_string(v_order_id, ',');
     ELSIF _key = 'orders_group_id' THEN
       v_order_group_id := ARRAY(SELECT value FROM jsonb_array_elements_text(_value::jsonb));
       RAISE NOTICE 'v_order_group_id %', v_order_group_id;
     ELSIF _key = 'comment' THEN
       v_comment := _value;
       RAISE NOTICE 'comment %', v_comment;
     ELSIF _key = 'user_id' THEN
       v_user_id := _value;
       RAISE NOTICE 'user_id %', v_user_id;
     END IF;
   END LOOP;
   
    -- Handle status updates for orders (1, 2, -1)
    IF v_order_status_id IN (1, 2, -1) THEN
        -- Build update query
        v_update_query := '
            WITH t AS (
                UPDATE inventory_smart.oms_orders_recommended_store
                SET order_status_id = $1,
                    updated_by = $2,
                    updated_at = CURRENT_TIMESTAMP,
                    approve_by_date = CURRENT_DATE + 7,
                    comment = $4
                WHERE id = ANY($3)
                RETURNING id
            )
            SELECT ARRAY_AGG(id) FROM t';
        
        -- Execute update query ($4 = v_comment)
        EXECUTE v_update_query INTO approved_ids USING v_order_status_id, v_user_id, v_order_id, v_comment;
        
        GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
        
        -- Build insert query for approval history
        v_insert_query := '
            INSERT INTO inventory_smart.oms_orders_approval_hist_store 
            SELECT a.id, a.ord_id, b.action_id, b.comment, b.actioned_by, b.actioned_at
            FROM (
                SELECT nextval(''inventory_smart.oms_orders_approval_hist_store_id_seq'') AS id,
                       UNNEST($1) AS ord_id
            ) a
            CROSS JOIN (
                SELECT $2 AS action_id,
                       $3 AS comment,
                       $4 AS actioned_by,
                       CURRENT_TIMESTAMP AS actioned_at
            ) b';
        
        -- Execute insert query
        EXECUTE v_insert_query USING v_order_id, v_action_id, v_comment, v_user_id;
	
    -- Handle status -2 (restore orders)
    ELSIF v_order_status_id = -2 THEN
        -- Build update query for restoring orders
        v_update_query := '
            WITH t AS (
                UPDATE inventory_smart.oms_orders_recommended_store
                SET order_status_id = 1,
                    updated_by = $1,
                    is_deleted = false,
                    updated_at = CURRENT_TIMESTAMP,
                    order_placement_date = order_placement_recom_date
                WHERE id = ANY($2) OR order_group_id = ANY($3)
                RETURNING id
            )
            SELECT ARRAY_AGG(id) FROM t';
        
        -- Execute update query
        EXECUTE v_update_query INTO approved_ids USING v_user_id, v_order_id, v_order_group_id;
        
        RAISE NOTICE 'approved_ids %', approved_ids;
        
        -- Build delete queries
        v_delete_query := 'DELETE FROM inventory_smart.oms_orders_approved_store WHERE id = ANY($1)';
        EXECUTE v_delete_query USING approved_ids;
        
        v_delete_query := 'DELETE FROM inventory_smart.oms_orders_approval_hist_store WHERE order_id = ANY($1)';
        EXECUTE v_delete_query USING approved_ids;
    
    -- Handle status 3 (approve orders)
    ELSIF v_order_status_id = 3 THEN
        RAISE NOTICE 'start %', v_order_status_id;
        
        -- Build complex insert query for approved orders
        v_insert_query := '
            WITH t AS (
                INSERT INTO inventory_smart.oms_orders_approved_store
                (
                    id, order_gen_type, product_code, article, size, store_code, fiscal_year_week,
                    min_order_quantity_sku, max_order_quantity_sku, min_order_quantity_style,
                    vendor_code, rop, grade, order_quantity, unit_cost, roq_constrained, roq_unconstrained,
                    order_placement_date, order_placement_recom_date, expected_receipt_date, 
                    editable_expected_receipt_date, projected_delivery_date, rop_ideal, lead_time, 
                    effective_lead_time, dc_inv, system_inv, inventory_hold, order_status_id, 
                    created_by, created_at, updated_by, edit_by_date, is_deleted, comment, 
                    order_batch_name, reconciliation_id
                )
                WITH oms_orders_recommended_store AS (
                    SELECT * FROM inventory_smart.oms_orders_recommended_store 
                    WHERE id = ANY($1) AND order_quantity > 0
                )
                SELECT
                    oors.id, oors.order_gen_type, oors.product_code, oors.article, oors.size, 
                    oors.store_code, oors.fiscal_year_week, oors.min_order_quantity_sku, 
                    oors.max_order_quantity_sku, oors.min_order_quantity_style, oors.vendor_code, 
                    oors.rop, oors.grade, oors.order_quantity, oors.unit_cost, oors.roq_constrained, 
                    oors.roq_unconstrained, CURRENT_DATE AS order_placement_date, 
                    oors.order_placement_recom_date, oors.expected_receipt_date::DATE, 
                    oors.editable_expected_receipt_date::DATE, oors.projected_delivery_date::DATE,
                    oors.rop_ideal, oors.lead_time, oors.effective_lead_time, ok.dc_inv, ok.system_inv,
                    oors.inventory_hold::int, 3 AS order_status_id, $2 AS created_by, 
                    CURRENT_TIMESTAMP AS created_at, NULL AS updated_by, CURRENT_DATE + 28 AS edit_by_date,
                    FALSE AS is_deleted, $3::text, oors.order_batch_name as order_batch_name,
                    CONCAT(oors.product_code, ''-'', oors.store_code, ''-'') as reconciliation_id
                FROM oms_orders_recommended_store AS oors
                LEFT JOIN inventory_smart.oms_kpi_store AS ok 
                    ON oors.product_code = ok.product_code AND oors.store_code = ok.store_code
                ON CONFLICT DO NOTHING
                RETURNING id
            )
            SELECT ARRAY_AGG(id) FROM t';
        
        -- Execute insert query
        EXECUTE v_insert_query INTO approved_ids USING v_order_id, v_user_id, v_comment;
        
        GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
        
        -- Update recommended orders if records were inserted
        IF v_affected_rows > 0 THEN
            v_update_query := '
                UPDATE inventory_smart.oms_orders_recommended_store
                SET is_deleted = TRUE,
                    order_placement_date = CURRENT_DATE,
                    order_status_id = 3
                WHERE id = ANY($1)';
            
            EXECUTE v_update_query USING approved_ids;
        END IF;

        -- Insert approval history
        v_insert_query := '
            INSERT INTO inventory_smart.oms_orders_approval_hist_store 
            SELECT a.id, a.ord_id, b.action_id, b.comment, b.actioned_by, b.actioned_at
            FROM (
                SELECT nextval(''inventory_smart.oms_orders_approval_hist_store_id_seq'') AS id,
                       UNNEST($1) AS ord_id
            ) a
            CROSS JOIN (
                SELECT $2 AS action_id,
                       $3 AS comment,
                       $4 AS actioned_by,
                       CURRENT_TIMESTAMP AS actioned_at
            ) b';
        
        EXECUTE v_insert_query USING approved_ids, v_action_id, v_comment, v_user_id;
    END IF;
  
    RETURN approved_ids;
END
$function$;
