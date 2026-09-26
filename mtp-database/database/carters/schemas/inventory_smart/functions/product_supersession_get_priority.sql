--liquibase formatted sql
--changeset jitendra.singh:add_style_supersession_id runOnChange:true stripComments:false splitStatements:false context:MTP-44014-CARTERS-SUPERSESSION labels:MTP-44014-CARTERS-SUPERSESSION
--comment: add style, supersession_id
--rollback: SELECT 1
--function to get mapped product supersession;
DROP FUNCTION IF EXISTS inventory_smart.product_supersession_get_priority(refcursor,text);
CREATE OR REPLACE FUNCTION inventory_smart.product_supersession_get_priority(input refcursor, article text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_get_priority_sql  text:='';
  v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin
  v_get_priority_sql := '
	select 
      new_l1_name as channel,
      array_agg(x.article) new_articles,
      array_agg(x.old_article) old_article,
      array_agg(x.priority) priority
    from
    (
	  	select new_l1_name, new_style as article, old_style as old_article, smt.priority from inventory_smart.product_supersession_mapping smt
		inner join (
					select * from crosstab(
					$$
					select ps_code, attribute_name, max(attribute_value) as attribute_value FROM inventory_smart.product_supersession_attribute group by 1,2 order by 1, 2
					$$,
					$$
					select unnest(''{"new_class", "new_collection", "new_gender", "new_l0_name", "new_l1_name", "new_l2_name", "new_l3_name", "new_l4_name", "new_l5_name", "new_season", "new_subclass", "new_style", "old_style", "old_prod_sku_key", "new_prod_sku_key"}''::text[])
					$$
					) as ct(ps_code int, "new_class" text, "new_collection" text, "new_gender" text, "new_l0_name" text, "new_l1_name" text, "new_l2_name" text, "new_l3_name" text, "new_l4_name" text, "new_l5_name" text, "new_season" text, "new_subclass" text, "new_style" text, "old_style" text, "old_prod_sku_key" text, "new_prod_sku_key" text)
		) supersession_attributes
		on supersession_attributes.ps_code = smt.ps_code
    	where smt.article = '''||article||'''
    	group by 1, 2, 3, 4
    ) x
    group by  1
  ';

  raise notice 'v_get_priority_sql %',v_get_priority_sql;
 
  open $1 for execute v_get_priority_sql;
      perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.product_supersession_get_priority', 'Before returning function value',v_get_priority_sql,jsonb_build_object('article',article)) ;		

  RETURN $1;
end
$function$
;

