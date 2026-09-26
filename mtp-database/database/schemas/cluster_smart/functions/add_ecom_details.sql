--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co:cluster_smart.add_ecom_delete_query_channel_fix liquibase:add_ecom_details runOnChange:true stripComments:false splitStatements:false context:MTP-86688 labels:liquibase_project_start
--comment: dynamic query for respective ecom for every client
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.add_ecom_details(integer, text, text, boolean);
DROP FUNCTION IF EXISTS cluster_smart.add_ecom_details(integer, text, text[], boolean);
CREATE OR REPLACE FUNCTION cluster_smart.add_ecom_details(input integer, text, text[], boolean)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    _delete_plan_cluster_final text;
    _insert_plan_cluster_final text;
    _insert_plan_cluster_store_final text;
    _cluster_code_id int;
    _plan_step_query text;
    _update_plan_step boolean;
    _store_code text;
BEGIN

    /*
    Function/Procedure name: assort.add_ecom_details
    Created by: Sadhana J
    Created at: 17-May-2022
	Updated by: Hemanth C S
	Updated at: 05-May-2025
    No of input parameters: 4
    Parameter Descriptions:
        - $1 = integer plan_code
        - $2 = text cluster_name
        - $3 = text[] store_codes (array, e.g. {'0234', '0456'})
        - $4 = boolean update_plan_step flag
    
    Purpose: To add eCommerce channel details in clusters.

    Calling Statement:
    select * from assort.add_ecom_details(plan_code, cluster_name, store_codes);
    */

    -- If update_plan_step is provided, assign it
    IF $4 THEN
        _update_plan_step := $4;
    END IF;

	_delete_plan_cluster_final := 'with channels as (
								  select json_array_elements_text((attribute_value->''value'')::json) as channel_name 
								  from global.tenant_attribute_master 
								  where name = ''all_possible_ecomm_channels''
								  )
								  delete from cluster_smart.plan_cluster_final pcf
								  where pcf.cluster_plan_code = ' || $1 || '
								  and exists (select 1 from channels where pcf.cluster_name ilike ''%'' || channel_name || ''%''
								  );';
	EXECUTE _delete_plan_cluster_final;
	RAISE NOTICE 'Deleted existing records for cluster plan: %', $1;

    -- Insert into plan_cluster_final and retrieve the cluster_code_id
	_insert_plan_cluster_final := 'INSERT INTO cluster_smart.plan_cluster_final (cluster_name, cluster_plan_code, attribute_value)
                                VALUES(''' || $2 || ''', ' || $1 || ', ''{"cluster_display_name": "' || replace($2, '"', '\"') || '"}'') 
                                RETURNING cluster_code_id;';
    
    EXECUTE _insert_plan_cluster_final INTO _cluster_code_id;
    RAISE NOTICE 'Generated cluster_code_id: %', _cluster_code_id;

    -- Insert into plan_cluster_store_final for each store_code in the array
    FOREACH _store_code IN ARRAY $3
    LOOP
        _insert_plan_cluster_store_final := 'INSERT INTO cluster_smart.plan_cluster_store_final (cluster_code_id, attribute_name, attribute_value)
                                              VALUES(' || _cluster_code_id || ', ''store_code'', ''' || _store_code || ''');';
        EXECUTE _insert_plan_cluster_store_final;
    END LOOP;

    -- If update_plan_step is true, execute the plan step update query
    IF _update_plan_step = true THEN
        _plan_step_query := 'SELECT * FROM cluster_smart.update_plan_step(' || $1 || ',' || 1.3 || ');';
        -- RAISE NOTICE '_plan_step_query %', _plan_step_query;
        EXECUTE _plan_step_query;
    END IF;

END;
$function$
;