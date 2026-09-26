--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:fix_oms_approve_order_15 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-133768.
--comment: MTP-101722-9
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_approve_order_store(_text, _text, _text, _text, _text, _text, _text, _text, _text, _text, text, text, text, jsonb, int4, jsonb, _text);
CREATE OR REPLACE FUNCTION inventory_smart.oms_approve_order_store(l0_name text[], l1_name text[], l2_name text[], l3_name text[], l5_name text[], l6_name text[], order_type text[], region_name text[], sales_org_name text[], article text[], start_order_placement_date text, end_order_placement_date text, order_batch_name text, product_filter jsonb, user_id integer, store_filter jsonb, order_group_ids text[])
 RETURNS TABLE(order_id integer)
 LANGUAGE plpgsql
AS $function$ 

declare
v_pa_sql text := '';
v_recommended_orders_sql text := '';
v_approve_orders_sql text := '';
v_sa_sql text :='';
v_user_id int := user_id;
v_where_conditions text := '';

begin 
IF end_order_placement_date ~ '^\d{4}-\d{1,2}-\d{1,2}$' OR  start_order_placement_date ~ '^\d{4}-\d{1,2}-\d{1,2}$' THEN
        -- check if date is in format of yyyy-mm-dd
        start_order_placement_date := '';
        end_order_placement_date := '';
        RAISE NOTICE 'ISO format detected - setting both dates to empty (no date filtering)';
END IF;
v_pa_sql := inventory_smart.form_main_table_filters(
	'ph_master',
	 product_filter
	 );
v_sa_sql := global.form_main_table_filters(
    'store_attributes_filter'::Text,
    store_filter
  );
IF l0_name IS NOT NULL AND array_length(l0_name, 1) > 0 THEN
	v_where_conditions := v_where_conditions || format(' and oors.l0_name = ANY(%L::text[])', l0_name);
end if;

IF l1_name IS NOT NULL AND array_length(l1_name, 1) > 0 THEN
	v_where_conditions := v_where_conditions || format(' and oors.l1_name = ANY(%L::text[])', l1_name);
end if;

if l2_name IS NOT NULL AND array_length(l2_name, 1) > 0 THEN
	v_where_conditions := v_where_conditions || format(' and oors.l2_name = ANY(%L::text[])', l2_name);
end if;

if l3_name IS NOT NULL AND array_length(l3_name, 1) > 0 THEN
	v_where_conditions := v_where_conditions || format(' and oors.l3_name = ANY(%L::text[])', l3_name);
end if;

if l6_name IS NOT NULL AND array_length(l6_name, 1) > 0 THEN
	v_where_conditions := v_where_conditions || format(' and oors.l6_name = ANY(%L::text[])', l6_name);
end if;

if l5_name IS NOT NULL AND array_length(l5_name, 1) > 0 THEN
	v_where_conditions := v_where_conditions || format(' and oors.l5_name = ANY(%L::text[])', l5_name);
end if;

if order_type IS NOT NULL AND array_length(order_type, 1) > 0 THEN
	v_where_conditions := v_where_conditions || format(' and oors.order_type = ANY(%L::text[])', order_type);
end if;

if region_name IS NOT NULL AND array_length(region_name, 1) > 0 THEN
	v_where_conditions := v_where_conditions || format(' and oors.region_name = ANY(%L::text[])', region_name);
end if;

if sales_org_name IS NOT NULL AND array_length(sales_org_name, 1) > 0 THEN
 	v_where_conditions := v_where_conditions || format(' and oors.sales_org_name = ANY(%L::text[])', sales_org_name);
end if;

if article IS NOT NULL AND array_length(article, 1) > 0 THEN
	v_where_conditions := v_where_conditions || format(' and oors.article = ANY(%L::text[])', article);
end if;

IF end_order_placement_date IS NOT NULL AND start_order_placement_date IS NOT NULL 
       AND end_order_placement_date <> '' AND start_order_placement_date <> '' THEN
        v_where_conditions := v_where_conditions || ' and oors.order_placement_date between TO_DATE(' || 
            quote_literal(start_order_placement_date) || ', ''DD-MM-YYYY'') and TO_DATE(' || 
            quote_literal(end_order_placement_date) || ', ''DD-MM-YYYY'')';
END IF;


v_recommended_orders_sql := 'With store_filter AS (
          SELECT store_code
          FROM global.store_attributes_filter
          ' || v_sa_sql || '
        ),
		oors_product_filter AS (
          SELECT oors.*
          FROM inventory_smart.oms_orders_recommended_store oors
		      inner join store_filter saf on oors.store_code = saf.store_code
          ' || v_pa_sql || ' and oors.order_status_id = 0 and oors.order_quantity > 0 ' || v_where_conditions || '
        )
		update inventory_smart.oms_orders_recommended_store oors 
                              set order_status_id = 3, order_batch_name= '|| quote_literal(order_batch_name) ||', is_deleted = true, order_placement_date = now(), updated_by = '|| quote_nullable(v_user_id) ||', updated_at = now()
                              from oors_product_filter opf
                                where oors.id = opf.id and oors.order_group_id = ANY(' || quote_literal(order_group_ids) || ')
								RETURNING oors.id';

v_approve_orders_sql := 'INSERT INTO inventory_smart.oms_orders_approved_store
       (
         id, order_gen_type, product_code, article, size, store_code, min_order_quantity_sku, max_order_quantity_sku, min_order_quantity_style, vendor_code, rop, grade, order_quantity, unit_cost, roq_constrained, roq_unconstrained, order_placement_date, order_placement_recom_date, expected_receipt_date,editable_expected_receipt_date, rop_ideal, lead_time, effective_lead_time, inventory_hold, order_status_id, created_by, created_at, updated_by, edit_by_date, is_deleted
       )
    	(With store_filter AS (
          SELECT saf.store_code
          FROM global.store_attributes_filter saf
          ' || v_sa_sql || '
        ),
		oors_product_filter AS (
          SELECT oors.*
          FROM inventory_smart.oms_orders_recommended_store oors
		      inner join store_filter saf on saf.store_code = oors.store_code
          ' || v_pa_sql || ' and oors.order_quantity > 0 ' || v_where_conditions || '
        )
		SELECT
        oors.id, oors.order_gen_type, oors.product_code,oors.article, oors.size, oors.store_code, oors.min_order_quantity_sku, oors.max_order_quantity_sku,oors.min_order_quantity_style, oors.vendor_code, oors.rop, oors.grade, oors.order_quantity, oors.unit_cost, oors.roq_constrained, oors.roq_unconstrained, CURRENT_DATE AS order_placement_date, oors.order_placement_recom_date, oors.expected_receipt_date::DATE, oors.editable_expected_receipt_date::DATE, oors.rop_ideal, oors.lead_time, oors.effective_lead_time, oors.inventory_hold::int, 3 AS order_status_id, '||v_user_id||' AS created_by, CURRENT_TIMESTAMP AS created_at, NULL AS updated_by, CURRENT_DATE + 28 AS edit_by_date, FALSE AS is_deleted
       FROM oors_product_filter oors
       	WHERE 1=1 and oors.order_group_id = ANY(' || quote_literal(order_group_ids) || ') )
       ';

raise notice 'v_recommended_orders_sql %', v_recommended_orders_sql;

raise notice 'v_approve_orders_sql %', v_approve_orders_sql;

EXECUTE v_approve_orders_sql;

RETURN QUERY EXECUTE v_recommended_orders_sql;

end 
$function$
;
