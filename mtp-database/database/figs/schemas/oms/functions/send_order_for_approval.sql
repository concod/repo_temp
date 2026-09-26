--liquibase formatted sql
--changeset chandranil.ghosh:send_order_for_approval_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-90722.
--comment: MTP-56602
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.send_order_for_approval(color_id text[], l2_name text[], l3_name text[], article text[], loc_code text[], order_type text[],style_name text[],start_order_placement_date date, end_order_placement_date date, order_batch_name text, product_filter jsonb, user_id int, order_group_ids text[]) ;

CREATE OR REPLACE FUNCTION inventory_smart.send_order_for_approval(color_id text[], l2_name text[], l3_name text[], loc_code text[], order_type text[], style_name text[],article text[], start_order_placement_date date, end_order_placement_date date, order_batch_name text, product_filter jsonb, user_id integer, order_group_ids text[])
 RETURNS TABLE(order_id integer)
 LANGUAGE plpgsql
AS $function$ 

declare
v_pa_sql text := '';
v_recommended_orders_sql text := '';

v_color_id text := '';
v_l2_name text := '';
v_l3_name text := '';
v_article text := '';
v_loc_code text := '';
v_order_type text := '';
v_order_placement_date text := '';
v_user_id int := user_id;
v_order_group_ids text := '';

begin 
v_pa_sql := inventory_smart.form_main_table_filters('ph_master', product_filter);

IF color_id IS NOT NULL AND array_length(color_id, 1) > 0 THEN
	v_color_id := 'and paf.color_id = ANY('|| quote_literal(color_id) ||')';
end if;

if l2_name IS NOT NULL AND array_length(l2_name, 1) > 0 THEN
	v_l2_name := 'and paf.l2_name = ANY('|| quote_literal(l2_name) ||')';
end if;

if l3_name IS NOT NULL AND array_length(l3_name, 1) > 0 THEN
	v_l3_name := 'and paf.l3_name = ANY('|| quote_literal(l3_name) ||')';
end if;

if article IS NOT NULL AND array_length(article, 1) > 0 THEN
	v_article := 'and paf.article = ANY('|| quote_literal(article) ||')';
end if;

if loc_code IS NOT NULL AND array_length(loc_code, 1) > 0 THEN
	v_loc_code := 'and oor.loc_code = ANY('|| quote_literal(loc_code) ||')';
end if;

if order_type IS NOT NULL AND array_length(order_type, 1) > 0 THEN
	v_order_type := 'and oor.order_type = ANY('|| quote_literal(order_type) ||')';
end if;

if end_order_placement_date is not null and start_order_placement_date is not null then
	v_order_placement_date := 'and oor.order_placement_date between '''|| start_order_placement_date ||''' and '''|| end_order_placement_date ||'''';
end if;

if order_group_ids IS NOT NULL AND array_length(order_group_ids, 1) > 0 THEN
	v_order_group_ids := 'and oor.order_group_id = ANY('|| quote_literal(order_group_ids) ||')';
end if;

v_recommended_orders_sql := 'update inventory_smart.oms_orders_recommended oor 
                              set order_status_id = 1, order_batch_name= '|| quote_literal(order_batch_name) ||', updated_by = '|| quote_nullable(v_user_id) ||', updated_at = now()
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
								AND oor.order_group_id = vg.order_group_id
								'|| v_color_id ||'
								'|| v_l2_name ||'
								'|| v_l3_name ||'
								'|| v_article ||'
								'|| v_loc_code ||'
								'|| v_order_type ||'
								'|| v_order_placement_date ||'
								'|| v_order_group_ids ||'
								RETURNING oor.id';

raise notice 'v_recommended_orders_sql %', v_recommended_orders_sql;

RETURN QUERY EXECUTE v_recommended_orders_sql;

end 
$function$
;