--liquibase formatted sql
--changeset liquibase:fetch_aggregation_level runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fetch_aggregation_level
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.fetch_aggregation_level();
CREATE OR REPLACE FUNCTION global.fetch_aggregation_level()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
 /*
  
  Calling statement:
  select * from global.fetch_aggregation_level
 
 
 
 Updated_by       Updated_on      	Purpose
 ----------       -----------     --------
 Akshay Jian    21-Aug-2022    fetch aggregation level for client
 */
 
 declare
 	 
 	_final_query text;
 	begin
	 	
		select
				(attribute_value->>'dynamicLabelKeys')::json->>'style' as atr_val
						from
				global.tenant_attribute_master tam
							where
				name = 'core_screen_configuration' into _final_query;
			
		if _final_query is null then
		
			_final_query := 'product_code';
			
		end if;
		
 		
 		return _final_query;
  	end
 $function$
;

