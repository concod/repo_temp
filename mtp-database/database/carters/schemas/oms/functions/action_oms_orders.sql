--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:Updated_action_oms_orders_8 runOnChange:true stripComments:false splitStatements:false context:MTP-135352 labels:MTP-135352
--comment: implementing soft delete for oms_orders_approved table
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
   v_gen_random_uuid text  := gen_random_uuid()::varchar;
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
       WHERE oms_orders_recommended.id = ANY(v_order_id)
       RETURNING oms_orders_recommended.id
     )
     SELECT ARRAY_AGG(id) INTO approved_ids FROM t;

     UPDATE inventory_smart.oms_orders_approved 
     SET is_deleted = TRUE, 
         updated_at = CURRENT_TIMESTAMP,
         updated_by = v_user_id
     WHERE id = ANY(v_order_id);

     DELETE FROM inventory_smart.oms_orders_approval_hist ooah where ooah.order_id = ANY(v_order_id);
   ELSIF v_order_status_id = 3 THEN
     RAISE NOTICE 'start %', v_order_status_id;

     WITH base AS (
        SELECT DISTINCT
          oor.id,
          CONCAT (
            CONCAT(
              paf.style, '_',
              paf.size, '_',
              UPPER(LEFT(SPLIT_PART(name, ' ', 2), 3)),
              RIGHT(SPLIT_PART(name, ' ', 1),2),
              UPPER(LEFT(paf.l2_name, 1)),
              UPPER(LEFT(paf.l1_name, 1)),
              TO_CHAR(oor.editable_expected_receipt_date, 'MMDDYYYY'),
              'B'
            ),
            CONCAT(
              UPPER(LEFT(paf.l2_name, 1)),
              CASE 
                WHEN UPPER(paf.l3_name) = 'ACCESSORIES' THEN '6'
                WHEN UPPER(paf.l3_name) = 'BABY' THEN '1'
                WHEN UPPER(paf.l3_name) = 'BOYS PLAYWEAR' THEN '5'
                WHEN UPPER(paf.l3_name) = 'GIRLS PLAYWEAR' THEN '4'
                WHEN UPPER(paf.l3_name) = 'OUTERWEAR' THEN '7'
                WHEN UPPER(paf.l3_name) = 'SHOES' THEN '9'
                WHEN UPPER(paf.l3_name) = 'SKIP HOP' THEN '10'
                WHEN UPPER(paf.l3_name) = 'SLEEPWEAR' THEN '3'
                WHEN UPPER(paf.l3_name) = 'SWIMWEAR' THEN '8'
                WHEN UPPER(paf.l3_name) = 'LITTLE PLANET' THEN '11'
              END,
              CASE
                WHEN UPPER(paf.l3_name) = 'OUTERWEAR' THEN 'O'
                WHEN UPPER(paf.l3_name) = 'SHOES' THEN 'S'
                WHEN UPPER(paf.l3_name) = 'ACCESSORIES' THEN 'A'
                WHEN paf.l4_name = '4-14' THEN 'B'
                WHEN paf.l4_name = '0-24M' THEN 'I'
                WHEN paf.l4_name = '2T-5T' THEN 'T'
                ELSE 'X'
              END,
              CASE
                WHEN paf.l1_name = 'Brick __ia_char_13 Mortar' THEN 'S'
                WHEN paf.l1_name = 'E-Commerce' THEN 'E'
                ELSE 'X'
              END,
              LEFT(paf.collection_id, 8)
            )
          ) as reconciliation_id
        FROM
          inventory_smart.oms_orders_recommended oor
        JOIN
          global.product_attributes_filter paf USING (product_code)
        JOIN
          global.season_master sm 
          ON oor.editable_expected_receipt_date BETWEEN sm.season_start_date AND sm.season_end_date
        WHERE
          oor.id = ANY(v_order_id)
    ),
     t AS (
       INSERT INTO inventory_smart.oms_orders_approved
       (
         id, order_gen_type, product_code, vendor_code, rop, grade,
         order_quantity, unit_cost, order_cost, roq_constrained, roq_unconstrained,
         order_placement_date, order_placement_recom_date, expected_receipt_date,
         rop_ideal, lead_time, effective_lead_time, store_inv, dc_inv, system_inv,
         mrpc, order_multiple, inventory_hold, order_status_id, created_by, created_at,
         updated_by, edit_by_date, is_deleted, comment,
         article, size, style, channel, min_order_quantity_sku, max_order_quantity_sku,
         min_order_quantity_style, editable_expected_receipt_date,
         min_order_quantity_shipment, max_order_quantity_style, max_order_quantity_shipment,
         order_type, order_batch_name, reconciliation_id, raw_roq
       )
       SELECT
         oor.id, oor.order_gen_type, oor.product_code,
         oor.vendor_code, oor.rop, oor.grade, oor.order_quantity,
         oor.unit_cost, oor.order_cost, oor.roq_constrained, oor.roq_unconstrained,
         CURRENT_DATE AS order_placement_date, oor.order_placement_recom_date,
         oor.expected_receipt_date, oor.rop_ideal, oor.lead_time,
         oor.effective_lead_time, ok.store_inv, ok.dc_inv, ok.system_inv,
         ok.mrpc, oor.order_multiple, oor.inventory_hold::int, 3 AS order_status_id,
         v_user_id AS created_by, CURRENT_TIMESTAMP AS created_at,
         NULL AS updated_by, CURRENT_DATE + 28 AS edit_by_date,
         FALSE AS is_deleted, v_comment::text,oor.article, oor.size, oor.style, oor.channel, oor.min_order_quantity_sku, oor.max_order_quantity_sku,
         oor.min_order_quantity_style, oor.editable_expected_receipt_date,
         oor.min_order_quantity_shipment, oor.max_order_quantity_style, oor.max_order_quantity_shipment, oor.order_type, 
         oor.order_batch_name, b.reconciliation_id as reconciliation_id, oor.raw_roq
       FROM inventory_smart.oms_orders_recommended AS oor
       LEFT JOIN inventory_smart.oms_kpi AS ok
       ON oor.product_code = ok.product_code
       LEFT JOIN base AS b
       ON b.id = oor.id
       WHERE oor.id = ANY(v_order_id)
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

   perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.action_oms_orders','Before returning approved ids',null,$1);
  	  
   RETURN approved_ids;
END
$function$
;
