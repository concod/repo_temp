--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:send_order_for_approval_lovisa_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-90722..
--comment: MTP-56602
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.send_order_for_approval(l1_name text[], l2_name text[], l3_name text[], l4_name text[], loc_code text[], order_type text[],range_africa text[], range_asia text[], range_au_nz text[], range_eu_uk text[], range_usa text[], style_name text[], start_order_placement_date text, end_order_placement_date text, product_filter jsonb, order_group_id_list text[], meta_filter jsonb) ;
DROP FUNCTION IF EXISTS inventory_smart.send_order_for_approval(l1_name text[], l2_name text[], l3_name text[], l4_name text[], loc_code text[], order_type text[], range_africa text[], range_asia text[], range_au_nz text[], range_eu_uk text[], range_usa text[], style_name text[], start_order_placement_date text, end_order_placement_date text, order_batch_name text, comment text, user_id integer, product_filter text, order_group_ids text[]) ;
DROP FUNCTION IF EXISTS inventory_smart.send_order_for_approval(l1_name text[], l2_name text[], l3_name text[], l4_name text[], loc_code text[], order_type text[], range_africa text[], range_asia text[], range_au_nz text[], range_eu_uk text[], range_usa text[], style_name text[], start_order_placement_date text, end_order_placement_date text, order_batch_name text, user_id integer, product_filter text, order_group_ids text[]) ;

CREATE OR REPLACE FUNCTION inventory_smart.send_order_for_approval(l1_name text[], l2_name text[], l3_name text[], l4_name text[], loc_code text[], order_type text[], range_africa text[], range_asia text[], range_au_nz text[], range_eu_uk text[], range_usa text[], style_name text[], start_order_placement_date text, end_order_placement_date text, order_batch_name text, user_id integer, product_filter text, order_group_ids text[])
 RETURNS TABLE(order_id integer)
 LANGUAGE plpgsql
AS $function$ 

declare
v_pa_sql text := '';
v_recommended_orders_sql text := '';

v_l1_name text := '';
v_l2_name text := '';
v_l3_name text := '';
v_l4_name text := '';
v_range_usa text := '';
v_range_eu_uk text := '';
v_range_au_nz text := '';
v_range_asia text := '';
v_range_africa text := '';
v_style_name text := '';
v_loc_code text := '';
v_order_type text := '';
v_order_placement_date text := '';
v_user_id int := user_id;
v_order_group_id_filter text := '';


begin 
--v_pa_sql := inventory_smart.form_main_table_filters('ph_master', product_filter);

IF l1_name IS NOT NULL AND array_length(l1_name, 1) > 0 THEN
	v_l1_name := 'and paf.l1_name = ANY('|| quote_literal(l1_name) ||')';
end if;

if l2_name IS NOT NULL AND array_length(l2_name, 1) > 0 THEN
	v_l2_name := 'and paf.l2_name = ANY('|| quote_literal(l2_name) ||')';
end if;

if l3_name IS NOT NULL AND array_length(l3_name, 1) > 0 THEN
	v_l3_name := 'and paf.l3_name = ANY('|| quote_literal(l3_name) ||')';
end if;

if l4_name IS NOT NULL AND array_length(l4_name, 1) > 0 THEN
	v_l4_name := 'and paf.l4_name = ANY('|| quote_literal(l4_name) ||')';
end if;

IF loc_code IS NOT NULL AND array_length(loc_code, 1) > 0 THEN
	v_loc_code := 'and oor.loc_code = ANY('|| quote_literal(loc_code) ||')';
END IF;

-- article parameter removed - no longer needed
IF end_order_placement_date IS NOT NULL AND start_order_placement_date IS NOT NULL 
	AND end_order_placement_date <> '' AND start_order_placement_date <> '' THEN
	v_order_placement_date := 'and oor.order_placement_date between TO_DATE(' || 
		quote_literal(start_order_placement_date) || ', ''DD-MM-YYYY'') and TO_DATE(' || 
		quote_literal(end_order_placement_date) || ', ''DD-MM-YYYY'')';
END IF;

IF order_type IS NOT NULL AND array_length(order_type, 1) > 0 THEN
	v_order_type := 'and oor.order_type = ANY('|| quote_literal(order_type) ||')';
END IF;

IF order_group_ids IS NOT NULL AND array_length(order_group_ids, 1) > 0 THEN
	v_order_group_id_filter := 'and oor.order_group_id = ANY('|| quote_literal(order_group_ids) ||')';
END IF;

v_recommended_orders_sql := 'update inventory_smart.oms_orders_recommended oor 
                              set order_status_id = 1, order_batch_name= '|| quote_literal(order_batch_name) ||', updated_by = '|| quote_nullable(v_user_id) ||', updated_at = now()
                              from (
									SELECT DISTINCT ON (l4_name)
										l1_name,
										l2_name,
										l3_name,
										l4_name,
										product_code
									FROM "global".product_attributes_filter
									ORDER BY l4_name
								) paf,
								(
									SELECT order_group_id
									FROM inventory_smart.oms_orders_recommended
									WHERE order_status_id = 0
									GROUP BY order_group_id
									HAVING SUM(order_quantity) > 0
								) vg
							where
							paf.l4_name = oor.product_code
							and oor.order_status_id = 0
							AND oor.order_group_id = vg.order_group_id
							            ' || v_order_type || '
										' || v_l1_name || '
										' || v_l2_name || '
										' || v_l3_name || '
										' || v_l4_name || '
										' || v_order_placement_date || '
										' || v_loc_code || '
										' || v_order_group_id_filter || '
							RETURNING oor.id';

raise notice 'v_recommended_orders_sql %', v_recommended_orders_sql;

RETURN QUERY EXECUTE v_recommended_orders_sql;

end 
$function$
;
