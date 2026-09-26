--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:send_order_for_approval_10 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-90722.
--comment: MTP-56602
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.send_order_for_approval(class text[], collection text[], l1_name text[], order_type text[], season text[], style text[], style_description text[], subclass text[],  start_order_placement_date date, end_order_placement_date date, order_batch_name text, product_filter jsonb, user_id int);
CREATE OR REPLACE FUNCTION inventory_smart.send_order_for_approval(class text[], collection text[], l1_name text[], order_type text[], season text[], style text[], style_description text[], subclass text[],  start_order_placement_date date, end_order_placement_date date, order_batch_name text, product_filter jsonb, user_id int, order_group_ids text[])
RETURNS TABLE(order_id int) 
LANGUAGE plpgsql
AS $function$ 

declare
v_pa_sql text := '';
v_recommended_orders_sql text := '';

v_order_type text := '';
v_collection text := '';
v_class text := '';
v_season text := '';
v_subclass text := '';
v_style text := '';
v_style_description text := '';
v_l1_name text := '';
v_order_placement_date text := '';
v_user_id int := user_id;
v_order_group_ids text := '';

begin 
v_pa_sql := inventory_smart.form_main_table_filters('ph_master', product_filter);

IF order_type IS NOT NULL AND array_length(order_type, 1) > 0 THEN
	v_order_type := 'and oor.order_type = ANY('|| quote_literal(order_type) ||')';
end if;

if collection IS NOT NULL AND array_length(collection, 1) > 0 THEN
	v_collection := 'and paf.collection = ANY('|| quote_literal(collection) ||')';
end if;

if class IS NOT NULL AND array_length(class, 1) > 0 THEN
	v_class := 'and paf.class = ANY('|| quote_literal(class) ||')';
end if;

if season IS NOT NULL AND array_length(season, 1) > 0 THEN
	v_season := 'and paf.season = ANY('|| quote_literal(season) ||')';
end if;

if subclass IS NOT NULL AND array_length(subclass, 1) > 0 THEN
	v_subclass := 'and paf.subclass = ANY('|| quote_literal(subclass) ||')';
end if;

if style IS NOT NULL AND array_length(style, 1) > 0 THEN
	v_style := 'and paf.style = ANY('|| quote_literal(style) ||')';
end if;

if style_description IS NOT NULL AND array_length(style_description, 1) > 0 THEN
	v_style_description := 'and paf.style_description = ANY('|| quote_literal(style_description) ||')';
end if;

if l1_name IS NOT NULL AND array_length(l1_name, 1) > 0 THEN
	v_l1_name := 'and paf.l1_name = ANY('|| quote_literal(l1_name) ||')';
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
								and oor.order_group_id = vg.order_group_id
								'|| v_order_placement_date ||'
								'|| v_collection ||'
								'|| v_class ||'
								'|| v_season ||'
								'|| v_subclass ||'
								'|| v_style ||'
								'|| v_style_description ||'
								'|| v_l1_name ||'
								'|| v_order_group_ids ||'
								 RETURNING oor.id'; 

raise notice 'v_recommended_orders_sql %', v_recommended_orders_sql;

RETURN QUERY EXECUTE v_recommended_orders_sql;

end 
$function$
;
