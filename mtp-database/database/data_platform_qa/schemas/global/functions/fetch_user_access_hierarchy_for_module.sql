--liquibase formatted sql
--changeset akshay.jain1:fetch_user_access_hierarchy_for_module runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: updated table
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.fetch_user_access_hierarchy_for_module(dimension text);
CREATE OR REPLACE FUNCTION global.fetch_user_access_hierarchy_for_module(dimension text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
  declare
  	_final_access_hierarchy jsonb;
	hierarchy_info_for_client jsonb;
	product_hierarchy_columns text;
	user_access_data text;
	_user_id int;
  	_action text;
  	_module text;
  	_app_id int;
	_access_hierarchy_data jsonb;
	hierarchy_cols text;

	--select * from global.fetch_user_access_hierarchy_for_module(_user_id, _app_id, _module, _action) into _access_hierarchy_data;
	
  /*
                      
   */
  	begin

	select * from global.fetch_hierarchy_info_for_client() into hierarchy_info_for_client;

	BEGIN
	select current_setting('user_access.context') into user_access_data;
	

	_action := user_access_data::jsonb->>'action';
	_user_id := user_access_data::jsonb->>'user-id';
	_module := user_access_data::jsonb->>'module_name';
	_app_id := user_access_data::jsonb->>'application_code';

	
	select * from global.fetch_hierarchy_info_for_client() into hierarchy_info_for_client;
	
	SELECT STRING_AGG(value, ' || ') INTO hierarchy_cols
    	FROM jsonb_array_elements_text(hierarchy_info_for_client->dimension);



 	 	WITH module_code_data AS (
    SELECT module_code
    FROM global.module_master
    WHERE lower(module_name) IN (lower(_module), 'All') and application_code in (_app_id)
    ORDER BY CASE WHEN lower(module_name) = lower(_module) THEN 0 ELSE 1 end
    limit 1
),
access_module_map as (

	select * from global.role_action_module_mapping ramm join module_code_data on module_code_data.module_code = any(ramm.module_code) join global.enable_module_level_table_uam emltu on module_code_data.module_code = emltu.module_code and emltu.enable_uam=True 
),
user_data  as (
	select user_code, acl_code, access_hierarchy from global.user_access_hierarchy_mapping where user_code in (_user_id)
),
user_acl_data as(
	select * from user_data join global.acl_master am using (acl_code) where application_code in (_app_id)
)
SELECT case 
	when is_superuser then '[]'
	else access_hierarchy
end as access_hierarchy into _final_access_hierarchy
FROM access_module_map join user_acl_data using (role_code) join global.action_master am2 on am2.action_code = any(access_module_map.action_code) where action in (_action);

EXCEPTION
	WHEN others THEN
        NULL;
end;

	-- In case user_id doesn't exist or any other case also _final_access_hierarchy will be empty so fornow assuming it as full access
	return jsonb_build_object(
        'access_hierarchy', _final_access_hierarchy,
        'hierarchy_info_for_client', hierarchy_cols
    );
  	end
  	$function$
;
