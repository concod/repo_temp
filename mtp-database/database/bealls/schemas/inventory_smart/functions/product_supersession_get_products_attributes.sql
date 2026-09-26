--liquibase formatted sql
--changeset karthikeswar:product_supersession_get_products_attributes runOnChange:true stripComments:false splitStatements:false context:initial_release labels:initial_release
--comment: initial_release, MTP-113500
--rollback: SELECT 1
--function to get products eligible for supersession mapping;
DROP FUNCTION IF EXISTS inventory_smart.product_supersession_get_products_attributes(refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_supersession_get_products_attributes(input refcursor, product_filter jsonb, meta_filter jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql               text:='';
  v_get_proudcts_sql     text:='';
  v_meta_cls             text:='';
 _query_pa text:='';
begin
  raise notice '%',$2;

  _query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
   raise notice '%',_query_pa;

   if $3 <> '{}'
   then
     v_meta_cls := global.form_table_query($3) ;
   end if;

  v_get_proudcts_sql := '
	SELECT sq.*,
       CASE
         WHEN sq.article NOT IN (SELECT old_article FROM inventory_smart.product_supersession_mapping) AND
              sq.article NOT IN (SELECT article FROM inventory_smart.product_supersession_mapping)
         THEN true
         ELSE false
       END as old_eligible,
       CASE
         WHEN sq.article NOT IN (SELECT old_article FROM inventory_smart.product_supersession_mapping) THEN true
         ELSE false
       END as new_eligible
	FROM (
    (
            select
              l0_name,
              l1_name,
              l2_name,
              l3_name,
              l4_name,
              article,
              brand,
              MAX(product_description) product_description
            from global.product_attributes_filter '||_query_pa||'GROUP BY 1,2,3,4,5,6,7'||')'
            ||v_meta_cls||
    ') sq';

  raise notice 'v_get_proudcts_sql %',v_get_proudcts_sql;
  open $1 for execute v_get_proudcts_sql;
  RETURN $1;
end
$function$
;

