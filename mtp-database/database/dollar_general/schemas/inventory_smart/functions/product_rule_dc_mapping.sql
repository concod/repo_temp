--liquibase formatted sql
--changeset liquibase:product_rule_dc_mapping runOnChange:true stripComments:false splitStatements:false context:MTP-44300 labels:MTP-44300
--MTP-44300: added linked_store_code in pop-up 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_rule_dc_mapping(refcursor, _int4);
CREATE OR REPLACE FUNCTION inventory_smart.product_rule_dc_mapping(input refcursor, integer[])
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 #variable_conflict use_column
 declare
 _query_combine text := '';
 _cache_payload jsonb := jsonb_build_object('default_list', $2);
 begin
 	_query_combine := 'select 
		  dc.dc_code, 
		  linked_store_code,
		  dc.name, 
		  case when mdc.selected_dc_code is null then false else true end as mapped 
		from 
		  global.distribution_centres dc  
		  left join (
		    select 
		      unnest('''||concat($2)||'''::int[]) as selected_dc_code
		  ) mdc on mdc.selected_dc_code = dc.dc_code 
		where 
		  dc.is_active = true and dc.is_deleted = false
		 order by mapped desc';

 		 
 		 raise notice '%',_query_combine;
 	open $1 for execute _query_combine;
 	RETURN $1;
  	end
 $function$
;