--liquibase formatted sql
--changeset liquibase:fetch_aggregation_level new_config support runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Fetch aggregation level from product_status_config with core_screen_configuration fallback
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.fetch_aggregation_level();
CREATE OR REPLACE FUNCTION global.fetch_aggregation_level(p_config_name text DEFAULT NULL)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
 /*
  
  Calling statement:
  select * from global.fetch_aggregation_level
 
 
 
 Updated_by       Updated_on      	Purpose
 ----------       -----------     --------
 Akshay Jian    21-Aug-2022    fetch aggregation level for client
 Siddhant Gupta 03-Feb-2026    Added p_config_name parameter for module-specific config support
 */

 declare
	_final_query text;
	_config jsonb;
 begin
	-- Check for config from input key
	if p_config_name is not null and p_config_name != '' then
		select attribute_value::jsonb into _config
		from global.tenant_attribute_master
		where name = p_config_name and status = true;

		_final_query := _config->>'style_view_aggregation_level';
	end if;

	-- If not found -> fallback to old config/logic
	if _final_query is null then
		select (attribute_value->>'dynamicLabelKeys')::json->>'style' into _final_query
		from global.tenant_attribute_master
		where name = 'core_screen_configuration';
	end if;

	-- Final default
	if _final_query is null then
		_final_query := 'product_code';
	end if;

	return _final_query;
 end
$function$
;

