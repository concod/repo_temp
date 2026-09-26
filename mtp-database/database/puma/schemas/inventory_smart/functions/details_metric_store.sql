--liquibase formatted sql
--changeset liquibase:details_metric_store runOnChange:true stripComments:false splitStatements:false context:MTP-21810 labels:liquibase_project_start
--comment: MTP 21810
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.details_metric_store(input jsonb, character varying, character varying, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.details_metric_store(input jsonb, character varying, character varying, jsonb)
 RETURNS TABLE(store_code character varying, store_name character varying, store_id character varying, it integer, oo integer, oh integer, wos double precision, si double precision, lw_qty integer, lw_revenue real, lw_margin real)
 LANGUAGE plpgsql
AS $function$
 declare
 	_query_sa text := '';
 	_query_table_filters text := '';
 	_query_combine text := '';
 begin
 	--_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $1);
 	_query_sa := global.form_main_table_filters('store_attributes_filter', $1);
 	_query_table_filters := global.form_table_query($4);
 	_query_combine = '
 		select 
 		  sm.store_code, 
 		  sm.store_name, 
		  saf.store_id,
 		  it, 
 		  oo, 
 		  oh, 
 		  coalesce(wos,0)::double precision, 
 		  coalesce(si,0)::double precision, 
 		  lw_qty, 
 		  lw_revenue, 
 		  lw_margin 
 		from 
 		  inventory_smart.article_inventory_dashboard aid 
 		  join global.store_master sm on aid.store_code = sm.store_code 
 		  join (select * from global.store_attributes_filter ' || _query_sa || ') saf on sm.store_code = saf.store_code 
 		--  join global.store_attributes_filter saf on sm.store_code = saf.store_code 
 		where 
 		  article = ''' || $2 || ''' 
 		  and ' || $3 || ' = 1
 		order by lw_qty desc';
 		raise notice '%', 'select * from (' || _query_combine || ') X ' || _query_table_filters;
  		RETURN QUERY execute 'select * from (' || _query_combine || ') X ' || _query_table_filters;
  	end
 $function$
;
