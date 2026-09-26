--liquibase formatted sql
--changeset nikhil.madhudan@impactanalytics.co:Updated_action_oms_orders_3 runOnChange:true stripComments:false splitStatements:false context:MTP-80452_2 labels:MTP-80452_2
--comment: Updated action_oms_orders SP to add data to order_batch_name and reconciliation_id
DROP FUNCTION IF EXISTS inventory_smart.action_oms_orders(jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.action_oms_orders(jsonb)
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
   v_order_group_id        varchar[];
   
BEGIN
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
   
   IF v_order_status_id IN (1, 2, -1) THEN
     WITH t AS (
       UPDATE inventory_smart.oms_orders_recommended
       SET order_status_id = v_order_status_id,
           updated_by = v_user_id,
           updated_at = CURRENT_TIMESTAMP,
           approve_by_date = CURRENT_DATE + 7
       WHERE oms_orders_recommended.id = ANY(v_order_id)
       RETURNING oms_orders_recommended.id
     )
     SELECT ARRAY_AGG(id) INTO approved_ids FROM t;
      
     GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    
     INSERT INTO inventory_smart.oms_orders_approval_hist  
     SELECT a.id, a.ord_id, b.action_id, b."comment", b.actioned_by, b.actioned_at
     FROM (
       SELECT nextval('inventory_smart.oms_orders_approval_hist_id_seq') AS id,
              UNNEST(v_order_id) AS ord_id
     ) a
     CROSS JOIN (
       SELECT v_action_id AS action_id,
              v_comment AS "comment",
              v_user_id AS actioned_by,
              CURRENT_TIMESTAMP AS actioned_at
     ) b;
	
	ELSIF v_order_status_id = -2 THEN
      WITH t AS (
       UPDATE inventory_smart.oms_orders_recommended
       SET order_status_id = 1,
           updated_by = v_user_id,
           is_deleted = false,
           updated_at = CURRENT_TIMESTAMP,
           order_placement_date = order_placement_recom_date
       WHERE oms_orders_recommended.id = ANY(v_order_id) OR oms_orders_recommended.order_group_id IN (
              SELECT unnest(v_order_group_id)
          )
       RETURNING oms_orders_recommended.id
     )
     SELECT ARRAY_AGG(id) INTO approved_ids FROM t;
raise notice '%', approved_ids;
     DELETE FROM inventory_smart.oms_orders_approved ooa where ooa.id = ANY(approved_ids);
     DELETE FROM inventory_smart.oms_orders_approval_hist ooah where ooah.order_id = ANY(approved_ids);
    
    
   ELSIF v_order_status_id = 3 THEN
     RAISE NOTICE 'start %', v_order_status_id;

     WITH t AS (
       INSERT INTO inventory_smart.oms_orders_approved
       (
         id, order_gen_type, product_code, article, size, loc_code, 
         min_order_quantity_sku, max_order_quantity_sku, min_order_quantity_style,
         vendor_code, rop, grade,
         order_quantity, unit_cost, roq_constrained, roq_unconstrained,
         order_placement_date, order_placement_recom_date, expected_receipt_date, editable_expected_receipt_date,
         rop_ideal, lead_time, effective_lead_time, dc_inv, system_inv,
          inventory_hold, order_status_id, created_by, created_at,
         updated_by, edit_by_date, is_deleted, comment, order_batch_name,
         reconciliation_id, order_type
       )
       SELECT
         oor.id, oor.order_gen_type, oor.product_code,oor.article, oor.size, oor.loc_code,
         oor.min_order_quantity_sku, oor.max_order_quantity_sku,oor.min_order_quantity_style,
         oor.vendor_code, oor.rop, oor.grade, oor.order_quantity,
         oor.unit_cost, oor.roq_constrained, oor.roq_unconstrained,
         CURRENT_DATE AS order_placement_date, oor.order_placement_recom_date,
         oor.expected_receipt_date::DATE, oor.editable_expected_receipt_date::DATE, oor.rop_ideal, oor.lead_time,
         oor.effective_lead_time, ok.dc_inv, ok.system_inv,
         oor.inventory_hold::int, 3 AS order_status_id,
         v_user_id AS created_by, CURRENT_TIMESTAMP AS created_at,
         NULL AS updated_by, CURRENT_DATE + 28 AS edit_by_date,
         FALSE AS is_deleted, v_comment::text, oor.order_batch_name as order_batch_name,
         CONCAT(oor.product_code, '-', oor.loc_code, '-', coalesce(oor.channel,'-')) AS reconciliation_id,
         oor.order_type
       FROM inventory_smart.oms_orders_recommended AS oor
       LEFT JOIN inventory_smart.oms_kpi AS ok
       ON oor.product_code = ok.product_code and oor.loc_code = ok.loc_code
       WHERE oor.order_quantity > 0 AND oor.id = ANY(v_order_id)
       ON CONFLICT DO NOTHING
       RETURNING oms_orders_approved.id
     )
     SELECT ARRAY_AGG(id) INTO approved_ids FROM t;
     
     GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
     
     IF v_affected_rows > 0 THEN
       UPDATE inventory_smart.oms_orders_recommended
       SET is_deleted = TRUE,
           order_placement_date = CURRENT_DATE,
           order_status_id = 3
       WHERE oms_orders_recommended.id = ANY(approved_ids);
     END IF;
 
     INSERT INTO inventory_smart.oms_orders_approval_hist  
     SELECT a.id, a.ord_id, b.action_id, b."comment", b.actioned_by, b.actioned_at
     FROM (
       SELECT nextval('inventory_smart.oms_orders_approval_hist_id_seq') AS id,
              UNNEST(approved_ids) AS ord_id
     ) a
     CROSS JOIN (
       SELECT v_action_id AS action_id,
              v_comment AS "comment",
              v_user_id AS actioned_by,
              CURRENT_TIMESTAMP AS actioned_at
     ) b;
   END IF;
  
   RETURN approved_ids;
END
$function$
;