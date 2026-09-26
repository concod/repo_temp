--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:send_order_for_approval_cbocs_5 runOnChange:true stripComments:false splitStatements:false context:MTP-90722 labels:MTP-90722.
--comment: MTP-90722
--rollback: SELECT 1

DROP FUNCTION if exists oms.send_order_for_approval(_text, _text, _text, _text, _text, _text, _text, _text, _text, _text, date, date, text, jsonb, int);
DROP FUNCTION if exists oms.send_order_for_approval(_text, _text, _text, _text, _text, _text, _text, _text, _text, _text, date, date, text, jsonb, int, _text);
DROP FUNCTION if exists oms.send_order_for_approval(_text, _text, _text, _text, _text, _text, _text, _text, date, date, text, jsonb, int, _text);


CREATE OR REPLACE FUNCTION oms.send_order_for_approval(
	article text[],
	l1_name text[],
	l2_name text[],
	l3_name text[],
	order_type text[],
	l0_name text[],
	primary_vendor_name text[],
	product_type text[],
	start_order_placement_date date,
	end_order_placement_date date,
	order_batch_name text,
	product_filter jsonb,
	user_id int,
	order_group_ids text[])
 RETURNS TABLE(order_id int)
 LANGUAGE plpgsql
AS $function$ 

declare
v_pa_sql text := '';
v_recommended_orders_sql text := '';
v_approve_orders_sql text := '';


v_l1_name text := '';
v_l2_name text := '';
v_l3_name text := '';
v_loc_code text := '';
v_order_type text := '';
v_article text := '';
v_order_placement_date text := '';
v_user_id int := user_id;
v_order_group_ids text := '';

begin 
v_pa_sql := oms.form_main_table_filters('ph_master', product_filter);



if l1_name IS NOT NULL AND array_length(l1_name, 1) > 0 THEN
	v_l1_name := 'and paf.l1_name = ANY('|| quote_literal(l1_name) ||')';
end if;

if l2_name IS NOT NULL AND array_length(l2_name, 1) > 0 THEN
	v_l2_name := 'and paf.l2_name = ANY('|| quote_literal(l2_name) ||')';
end if;

if l3_name IS NOT NULL AND array_length(l3_name, 1) > 0 THEN
	v_l3_name := 'and paf.l3_name = ANY('|| quote_literal(l3_name) ||')';
end if;

/*if loc_code IS NOT NULL AND array_length(loc_code, 1) > 0 THEN
	v_loc_code := 'and oor.loc_code = ANY('|| quote_literal(loc_code) ||')';
end if;*/

if article IS NOT NULL AND array_length(article, 1) > 0 THEN
	v_article := 'and oor.article = ANY('|| quote_literal(article) ||')';
end if;

if end_order_placement_date is not null and start_order_placement_date is not null then
	v_order_placement_date := 'and oor.order_placement_date between '''|| start_order_placement_date ||''' and '''|| end_order_placement_date ||'''';
end if;

if order_group_ids IS NOT NULL AND array_length(order_group_ids, 1) > 0 THEN
	v_order_group_ids := 'and oor.order_group_id = ANY('|| quote_literal(order_group_ids) ||')';
end if;

v_recommended_orders_sql := 'update oms.oms_orders_recommended oor 
                              set order_status_id = 1, order_batch_name= '|| quote_literal(order_batch_name) ||', order_placement_date = now(), updated_by = '|| quote_nullable(v_user_id) ||', updated_at = now()
                              from "global".product_attributes_filter paf  
                                where
                                paf.product_code = oor.product_code
                                and oor.order_status_id = 0 and oor.order_quantity > 0
								'|| v_order_placement_date ||'
							'|| v_l1_name ||'
							'|| v_l2_name ||'
								'|| v_l3_name ||'
								'|| v_loc_code ||'
								'|| v_order_type ||'
								'|| v_article ||'
								'|| v_order_group_ids ||'
								RETURNING oor.id';


raise notice 'v_recommended_orders_sql %', v_recommended_orders_sql;

RETURN QUERY EXECUTE v_recommended_orders_sql;

end 
$function$
;