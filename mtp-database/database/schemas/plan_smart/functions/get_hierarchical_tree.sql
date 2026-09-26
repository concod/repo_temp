--liquibase formatted sql
--changeset liquibase:get_hierarchical_tree runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_hierarchical_tree
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_hierarchical_tree(p_refcursor refcursor, p_product_filter jsonb);
CREATE OR REPLACE FUNCTION plan_smart.get_hierarchical_tree(p_refcursor refcursor, p_product_filter jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_query_filter  text;
  v_query_combine text;
 Begin
  v_query_filter := "plan_smart".form_main_table_filters('plan_master', p_product_filter);
	
  v_query_combine :=' 
	select
		l0_name, 
		l1_name, 
		array_agg(distinct(l2_name)) l2_name
	from 
		plan_smart.product_hierarchies_filter phv'
		 || v_query_filter || '
	group by   
		l0_name, 
		l1_name';
raise notice '%', v_query_combine;
  OPEN $1 FOR execute v_query_combine;
  RETURN $1;
end
$function$

;