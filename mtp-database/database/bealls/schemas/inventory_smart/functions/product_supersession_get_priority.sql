--liquibase formatted sql
--changeset karthikeswar:add_style_supersession_id runOnChange:true stripComments:false splitStatements:false context:initial_release labels:initial_release
--comment: initial_release
--rollback: SELECT 1
--function to get mapped product supersession;
DROP FUNCTION IF EXISTS inventory_smart.product_supersession_get_priority(refcursor,text);
CREATE OR REPLACE FUNCTION inventory_smart.product_supersession_get_priority(input refcursor, article text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_get_priority_sql  text:='';
begin
  v_get_priority_sql := '
	select store,array_agg(article) new_articles,array_agg(old_article) old_article,array_agg(priority) priority, array_agg(ps_code) ps_codes from
	(
	(select article, old_article,priority ,''default'' store, ps_code from inventory_smart.product_supersession_mapping smt
        where article = '''||article||'''
        group by article, old_article,priority, ps_code
        order by priority asc)
     union all

     (  select psm.article, psm.old_article, pssp.priority as priority , store, ps_code from inventory_smart.product_supersession_store_priority pssp
       inner join inventory_smart.product_supersession_mapping psm using (ps_code)
       where article = '''||article||'''
        group by 1,2,3,4,5
        order by priority asc)) pr
    group by  pr.store
  ';

  raise notice 'v_get_priority_sql %',v_get_priority_sql;

  open $1 for execute v_get_priority_sql;
  RETURN $1;
end
$function$
;

