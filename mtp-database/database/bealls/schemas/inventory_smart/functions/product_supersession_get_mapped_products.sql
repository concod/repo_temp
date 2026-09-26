--liquibase formatted sql
--changeset raghunath:product_supersession_get_mapped_products runOnChange:true stripComments:false splitStatements:false context:initial_release labels:initial_release
--comment: initial_release of product_supersession_get_mapped_products, added brand and division columns, fixed priority column and start_date search issue for supersession
--rollback: SELECT 1
--function to get mapped product supersession;
DROP FUNCTION IF EXISTS inventory_smart.product_supersession_get_mapped_products(refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_supersession_get_mapped_products(input refcursor, product_filter jsonb, meta_filter jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_get_mapped_products_sql  text:='';
  v_new_pa_sql               text:='';
  v_meta_cls                 text:='';
  v_old_pa_sql               text:='';
  v_new_product_filter       jsonb:=NULL;
  v_old_product_filter       jsonb:=NULL;
begin

   v_new_product_filter := $2->1;
   v_old_product_filter := $2->0;
   if $3 <> '{}'
   then
     v_meta_cls := global.form_table_query($3) ;
   end if;

   if v_old_product_filter is not null and v_old_product_filter <> '{}'
   then
     v_old_pa_sql := inventory_smart.form_main_table_filters(
	  'ph_master',
	   v_old_product_filter
	 );
   end if;
   if v_new_product_filter is not null and v_new_product_filter <> '{}'
   then
     v_new_pa_sql := inventory_smart.form_main_table_filters(
	  'ph_master',
	   v_new_product_filter
	 );
   end if;

  v_get_mapped_products_sql :='
  SELECT * FROM (
	select
		psm.old_article, psm.article, psm.has_store_exception, um.name as created_by, old_paf.old_l1_name,
		old_paf.old_l2_name, old_paf.old_l3_name, old_paf.old_l4_name, old_paf.old_product_description, old_paf.old_product_name, old_paf.old_brand,
		new_paf.new_article, new_paf.new_l1_name, new_paf.new_l2_name, new_paf.new_l3_name, new_paf.new_l4_name, new_paf.new_product_description, new_paf.new_product_name, new_paf.new_brand,
		ARRAY_AGG(old_paf.old_size) as old_sizes, ARRAY_AGG(old_paf.old_product_code) as old_product_codes, ARRAY_AGG(new_paf.new_size) as new_sizes, ARRAY_AGG(new_paf.new_product_code) as new_product_codes,
		max(psm.end_date) as end_date, max(psm.start_date) as start_date, min(psm.priority) as priority, max(psm.created_at) as created_at
	from inventory_smart.product_supersession_mapping psm
    inner join (
		select
		  l1_name as old_l1_name,
	      l2_name as old_l2_name,
	      l3_name as old_l3_name,
	      l4_name as old_l4_name,
	      paf.article as old_article,
          product_description as old_product_description,
	      product_name as old_product_name,
		  paf.size as old_size,
	      paf.product_code as old_product_code,
	      paf.brand as old_brand
		from global.product_attributes_filter paf
   		 '||v_old_pa_sql||'
	) old_paf on  old_paf.old_product_code = psm.old_product_code
	inner join (
		select
		  l1_name as new_l1_name,
	      l2_name as new_l2_name,
	      l3_name as new_l3_name,
	      l4_name as new_l4_name,
	      paf.article as new_article,
          product_description as new_product_description,
	      product_name as new_product_name,
		  paf.size as new_size,
	      paf.product_code as new_product_code,
	      paf.brand as new_brand
		from global.product_attributes_filter paf
   		 '||v_new_pa_sql||'
   	) new_paf on  new_paf.new_product_code = psm.product_code
   	inner join
		global.user_master um
	on
		psm.created_by::int = um.user_code
   	group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19
	) X
	'||v_meta_cls; 

  raise notice 'v_get_mapped_products_sql %',v_get_mapped_products_sql;

  open $1 for execute v_get_mapped_products_sql;
  RETURN $1;
end
$function$
;
