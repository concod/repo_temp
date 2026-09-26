--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:fix_oms_approve_order_12 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-101722_2.
--comment: MTP-101722_2.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.oms_approve_order(collection text[], l0_name text[], l2_name text[], l3_name text[], l4_name text[], l5_name text[], loc_code text[], masterstyle_descr text[], product_lifecycle text[], subbrand_description text[], article text[], start_order_placement_date date, end_order_placement_date date, order_batch_name text, user_id int, product_filter jsonb);
DROP FUNCTION IF EXISTS inventory_smart.oms_approve_order(_text, _text, _text, _text, _text, _text, _text, _text, date, date, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.oms_approve_order(_text, _text, _text, _text, _text, _text, _text, _text, _text, date, date, _text, jsonb, jsonb, int);
DROP FUNCTION IF EXISTS inventory_smart.oms_approve_order(_text, _text, _text, _text, _text, _text, _text, _text, _text, text, text, _text, jsonb, jsonb, int);

CREATE OR REPLACE FUNCTION inventory_smart.oms_approve_order(
	l0_name text[],
	l1_name text[],
	l2_name text[],
	l3_name text[],
	l5_name text[],
	l6_name text[],
	loc_code text[],
	order_type text[],
	article text[],
	start_order_placement_date text,
	end_order_placement_date text,
	order_batch_name text, product_filter jsonb,
	user_id int,
	order_group_ids text[])
 RETURNS TABLE(order_id int)
 LANGUAGE plpgsql
AS $function$ 

declare
v_pa_sql text := '';
v_recommended_orders_sql text := '';
v_approve_orders_sql text := '';

v_l0_name text := '';
v_l1_name text := '';
v_l2_name text := '';
v_l3_name text := '';
v_l5_name text := '';
v_l6_name text := '';
v_loc_code text := '';
v_order_type text := '';
v_article text := '';
v_order_placement_date text := '';
v_user_id int := user_id;
v_order_group_ids text := '';

begin 
v_pa_sql := inventory_smart.form_main_table_filters('ph_master', product_filter);
IF end_order_placement_date ~ '^\d{4}-\d{1,2}-\d{1,2}$' OR  start_order_placement_date ~ '^\d{4}-\d{1,2}-\d{1,2}$' THEN
        -- check if date is in format of yyyy-mm-dd
        start_order_placement_date := '';
        end_order_placement_date := '';
        RAISE NOTICE 'ISO format detected - setting both dates to empty (no date filtering)';
    END IF;
IF l0_name IS NOT NULL AND array_length(l0_name, 1) > 0 THEN
	v_l0_name := 'and paf.l0_name = ANY('|| quote_literal(l0_name) ||')';
end if;

if l1_name IS NOT NULL AND array_length(l1_name, 1) > 0 THEN
	v_l1_name := 'and paf.l1_name = ANY('|| quote_literal(l1_name) ||')';
end if;

if l2_name IS NOT NULL AND array_length(l2_name, 1) > 0 THEN
	v_l2_name := 'and paf.l2_name = ANY('|| quote_literal(l2_name) ||')';
end if;

if l3_name IS NOT NULL AND array_length(l3_name, 1) > 0 THEN
	v_l3_name := 'and paf.l3_name = ANY('|| quote_literal(l3_name) ||')';
end if;

if l5_name IS NOT NULL AND array_length(l5_name, 1) > 0 THEN
	v_l5_name := 'and paf.l5_name = ANY('|| quote_literal(l5_name) ||')';
end if;

if l6_name IS NOT NULL AND array_length(l6_name, 1) > 0 THEN
	v_l6_name := 'and paf.l6_name = ANY('|| quote_literal(l6_name) ||')';
end if;

if loc_code IS NOT NULL AND array_length(loc_code, 1) > 0 THEN
	v_loc_code := 'and oor.loc_code = ANY('|| quote_literal(loc_code) ||')';
end if;

if article IS NOT NULL AND array_length(article, 1) > 0 THEN
	v_article := 'and oor.article = ANY('|| quote_literal(article) ||')';
end if;

 IF end_order_placement_date IS NOT NULL AND start_order_placement_date IS NOT NULL 
       AND end_order_placement_date <> '' AND start_order_placement_date <> '' THEN
        v_order_placement_date := 'and oor.order_placement_date between TO_DATE(' || 
            quote_literal(start_order_placement_date) || ', ''DD-MM-YYYY'') and TO_DATE(' || 
            quote_literal(end_order_placement_date) || ', ''DD-MM-YYYY'')';
    END IF;

if order_group_ids IS NOT NULL AND array_length(order_group_ids, 1) > 0 THEN
	v_order_group_ids := 'and oor.order_group_id = ANY('|| quote_literal(order_group_ids) ||')';
end if;

v_recommended_orders_sql := 'update inventory_smart.oms_orders_recommended oor 
                              set order_status_id = 3, order_batch_name= '|| quote_literal(order_batch_name) ||', is_deleted = true, order_placement_date = now(), updated_by = '|| quote_nullable(v_user_id) ||', updated_at = now()
                              from "global".product_attributes_filter paf,
							  (
								SELECT order_group_id
								FROM inventory_smart.oms_orders_recommended
								WHERE order_status_id = 0
								GROUP BY order_group_id
								HAVING SUM(order_quantity) > 0
							) vg 
                                where
                                paf.product_code = oor.product_code
                                and oor.order_status_id = 0
								and oor.order_group_id = vg.order_group_id
								'|| v_l0_name ||'
								'|| v_order_placement_date ||'
								'|| v_l2_name ||'
								'|| v_l3_name ||'
								'|| v_l1_name ||'
								'|| v_l5_name ||'
								'|| v_l6_name ||'
								'|| v_loc_code ||'
								'|| v_order_type ||'
								'|| v_article ||'
								'|| v_order_group_ids ||'
								RETURNING oor.id';

v_approve_orders_sql := 'INSERT INTO inventory_smart.oms_orders_approved
       (
         id, order_gen_type, product_code, article, size, loc_code, min_order_quantity_sku, 
		 max_order_quantity_sku, min_order_quantity_style, vendor_code, rop, grade, order_quantity, 
		 unit_cost, roq_constrained, roq_unconstrained, order_placement_date, order_placement_recom_date, 
		 expected_receipt_date,editable_expected_receipt_date, rop_ideal, lead_time, effective_lead_time, 
		 dc_inv, system_inv, inventory_hold, order_status_id, created_by, created_at, updated_by, 
		 edit_by_date, is_deleted, order_batch_name, reconciliation_id, order_type
       )
    	(SELECT
        oor.id, oor.order_gen_type, oor.product_code,oor.article, 
		oor.size, oor.loc_code, oor.min_order_quantity_sku, oor.max_order_quantity_sku,oor.min_order_quantity_style, 
		oor.vendor_code, oor.rop, oor.grade, oor.order_quantity, oor.unit_cost, oor.roq_constrained, 
		oor.roq_unconstrained, CURRENT_DATE AS order_placement_date, oor.order_placement_recom_date, 
		oor.expected_receipt_date::DATE, oor.editable_expected_receipt_date::DATE, oor.rop_ideal, oor.lead_time, 
		oor.effective_lead_time, ok.dc_inv, ok.system_inv, oor.inventory_hold::int, 3 AS order_status_id, 
		'||v_user_id||' AS created_by, CURRENT_TIMESTAMP AS created_at, NULL AS updated_by, CURRENT_DATE + 28 AS edit_by_date, 
		FALSE AS is_deleted, '|| quote_literal(order_batch_name) ||' as order_batch_name,
		CONCAT(oor.product_code, ''-'', oor.loc_code, ''-'', coalesce(oor.channel,''-'')) AS reconciliation_id, oor.order_type
       FROM inventory_smart.oms_orders_recommended AS oor
	   INNER JOIN "global".product_attributes_filter paf
       ON oor.product_code = paf.product_code
	   LEFT JOIN inventory_smart.oms_kpi AS ok
       ON oor.product_code = ok.product_code and oor.loc_code = ok.loc_code
	   INNER JOIN (
			SELECT order_group_id
			FROM inventory_smart.oms_orders_recommended
			WHERE order_status_id = 0
			GROUP BY order_group_id
			HAVING SUM(order_quantity) > 0
		) vg ON oor.order_group_id = vg.order_group_id
       	WHERE TRUE
	   	'|| v_l0_name ||'
		'|| v_order_placement_date ||'
		'|| v_l2_name ||'
		'|| v_l3_name ||'
		'|| v_l1_name ||'
		'|| v_l5_name ||'
		'|| v_l6_name ||'
		'|| v_loc_code ||'
		'|| v_order_type ||'
		'|| v_order_group_ids ||'
		'|| v_article ||')
       ';

raise notice 'v_recommended_orders_sql %', v_recommended_orders_sql;

raise notice 'v_approve_orders_sql %', v_approve_orders_sql;

EXECUTE v_approve_orders_sql;

RETURN QUERY EXECUTE v_recommended_orders_sql;

end 
$function$
;
