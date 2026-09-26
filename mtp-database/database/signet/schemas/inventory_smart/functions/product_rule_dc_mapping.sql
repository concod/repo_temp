--liquibase formatted sql
--changeset anshuman.ghosh@impactanalytics.:product_rule_dc_mapping runOnChange:true stripComments:false splitStatements:false context:adding linked_store_code labels:adding linked_store_code
--comment: adding linked_store_code
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_rule_dc_mapping(input refcursor, text, character varying[], integer[], integer[]);
CREATE OR REPLACE FUNCTION inventory_smart.product_rule_dc_mapping(input refcursor, text, character varying[], integer[], integer[])
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 #variable_conflict use_column
 declare
 _query_combine text := '';
 _cache_payload jsonb := jsonb_build_object('article', $2, 'channel', $3, 'available_list', $4, 'default_list', $5);
 begin
 	_query_combine := 'select 
	      dc.linked_store_code, 
		  dc.dc_code, 
		  dc.name, 
		  case when mdc.selected_dc_code is null then false else true end as mapped 
		from 
		  global.distribution_centres dc  
		  left join (
		    select 
		      unnest('''||concat($5)||'''::int[]) as selected_dc_code
		  ) mdc on mdc.selected_dc_code = dc.dc_code 
		 join global.product_mapping_product_dc using (dc_code)
		 join global.product_attributes_filter paf using (product_code)
		where 
		  dc.is_active = true and dc.is_deleted = false and paf.article = '''|| $2 ||'''
		 order by mapped desc';
 		 
 		 raise notice '%',_query_combine;
 	open $1 for execute _query_combine;
 	RETURN $1;
  	end
 $function$
;
