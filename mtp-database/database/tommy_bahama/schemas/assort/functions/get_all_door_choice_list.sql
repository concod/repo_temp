--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co liquibase:get_all_door_choice_list runOnChange:true stripComments:false splitStatements:false context:MTP-33618 labels:liquibase_project_start
--comment: initial changeset for get_all_door_choice_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_all_door_choice_list(input jsonb);
CREATE OR REPLACE FUNCTION assort.get_all_door_choice_list(input jsonb)
 RETURNS TABLE(core_choice_id integer, l0_name text, l1_name text, l2_name text, l3_name text, sub_channel text, channel text, year character varying, quarter character varying, all_door_cc bigint, season_id character varying, season_name character varying,created_by integer, is_finalised_plan boolean, mapped text, unmapped text)
 LANGUAGE plpgsql
AS $function$
	/*
Function/Procedure name: assort.get_core_choice_list
Created by: Hemant Kumar Singh
Created at: 26-Sep-2022
No of input parameter: 1
Parameter Description : $1 = jsonb

Purpose: This function been created to getting all door core choice 

Calling Statement:

SELECT assort.get_core_choice_list(896);


Hemant Kumar SIngh:getting all door core choice 
*/
declare
	_query_combine text;
	_where text;
	_input_data jsonb;
	_filter_data jsonb;
	begin
		
		_where:=null;
		_input_data:= $1::jsonb;
		_filter_data:=(_input_data->>'filters')::jsonb;

    	-- prepare where clause
    	_where:=(select * from assort.prepare_where_clause_from_json_filters(_filter_data) );
    	
    	if length(coalesce (_where,''))=0 then 
    		_where:=' ';
    		
    	end if;
		_query_combine := 'WITH
							  all_door_choice_2_2 AS (
							  SELECT l0_name,l1_name,l2_name,l3_name,sub_channel,channel,season_name,all_door_cc_enabled,all_door_cc_2_2_screen,plan_name AS plan_names
							  FROM (
							    SELECT
							      plan_code,
							      levels->>''l0_name'' AS l0_name,
							      levels->>''l1_name'' AS l1_name,
							      levels->>''l2_name'' AS l2_name,
							      levels->>''l3_name'' AS l3_name,
							      levels->>''sub_channel'' AS sub_channel,
							      levels->>''channel'' AS channel,
							      attribute_value->>''all_door_cc_enabled'' all_door_cc_enabled,
							      COALESCE(CAST(attribute_value->>''all_door_cc'' AS int),0) AS all_door_cc_2_2_screen
							    FROM
							      assort.plan_l3_aps
							    WHERE
							      attribute_value->>''all_door_cc_enabled'' = ''true''
							    GROUP BY 1,2,3,4,5,6,7,8,9)all_door_cc
							  JOIN (
							    SELECT
							      plan_code,
							      attribute_value AS season_name
							    FROM
							      assort.plan_attributes
							    WHERE
							      attribute_name = ''season'') season
							  USING
							    (plan_code)
							  JOIN (
							    SELECT
							      plan_code,
							      CAST(name AS varchar) AS plan_name
							    FROM
							      assort.plan_master ) plan_name
							  USING
							    (plan_code)),
							    
							  finalised_hierarchies AS (
							  SELECT l0_name,l1_name,l2_name,l3_name,sub_channel,channel,season_name,''true'' AS is_finalised_plan
							  FROM (
							    SELECT
							      plan_code,
							      levels->>''l0_name'' AS l0_name,
							      levels->>''l1_name'' AS l1_name,
							      levels->>''l2_name'' AS l2_name,
							      levels->>''l3_name'' AS l3_name,
							      levels->>''sub_channel'' AS sub_channel,
							      levels->>''channel'' AS channel,
							      season_name
							    FROM
							      assort.plan_l3_aps
							    JOIN
							      assort.plan_master
							    USING
							      (plan_code)
							    JOIN (
							      SELECT
							        plan_code,
							        attribute_value AS season_name
							      FROM
							        assort.plan_attributes
							      WHERE
							        attribute_name = ''season'') season
							    USING
							      (plan_code)
							    WHERE
							      attribute_value->>''all_door_cc_enabled'' = ''true''
							      AND steps > 2.4
							    GROUP BY 1,2,3,4,5,6,7,8) finalised_plans
							  GROUP BY 1,2,3,4,5,6,7,8)
							  
							SELECT
							  core_choice_id,l0_name,l1_name,l2_name,l3_name,sub_channel,channel,year,quarter,all_door_cc,season_id,season_name,created_by,
							  CASE WHEN is_finalised_plan = ''true'' THEN TRUE ELSE FALSE END AS is_finalised_plan,
							  CASE WHEN STRING_AGG(REGEXP_REPLACE(mapped::TEXT,''{}'',''''),'''') = '''' THEN ''{}'' ELSE STRING_AGG(REGEXP_REPLACE(mapped::TEXT,''{}'',''''),'''') END AS mapped,
							  CASE WHEN STRING_AGG(REGEXP_REPLACE(unmapped::TEXT,''{}'',''''),'''') = '''' THEN ''{}'' ELSE STRING_AGG(REGEXP_REPLACE(unmapped::TEXT,''{}'',''''),'''') END AS unmapped
							FROM (
							  SELECT
							    core_choice_id,l0_name,l1_name,l2_name,l3_name,sub_channel,channel,year,quarter,all_door_cc,season_id,season_name,created_by,
							    CASE WHEN all_door_cc = all_door_cc_2_2_screen THEN array_remove(ARRAY_AGG(CASE WHEN plan_names IS NOT NULL THEN plan_names END),NULL) ELSE ''{}'' END AS mapped,
							    CASE WHEN all_door_cc != all_door_cc_2_2_screen THEN array_remove(ARRAY_AGG(CASE WHEN plan_names IS NOT NULL THEN plan_names END),NULL )ELSE ''{}'' END AS unmapped
							  FROM (
							    SELECT
							      core_choice_id,
							      levels->>''l0_name'' AS l0_name,
							      levels->>''l1_name'' AS l1_name,
							      levels->>''l2_name'' AS l2_name,
							      levels->>''l3_name'' AS l3_name,
							      levels->>''sub_channel'' AS sub_channel,
							      levels->>''channel'' AS channel,
							      adc.year,
							      quarter,
							      all_door_cc,
							      adc.season_id,
							      sm.name AS season_name,
							      all_door_cc_enabled,
							      coalesce (all_door_cc_2_2_screen,''9999999'') all_door_cc_2_2_screen,
							      plan_names,
								  created_by
							    FROM
							      assort.all_door_choice adc
							    JOIN
							      "global".season_master sm
							    ON
							      adc.season_id::int = sm.season_code
							    LEFT JOIN
							      all_door_choice_2_2 AS adc_2
							    ON
							      adc.levels->>''l0_name'' = adc_2.l0_name
							      AND adc.levels->>''l1_name'' = adc_2.l1_name
							      AND adc.levels->>''l2_name'' = adc_2.l2_name
							      AND adc.levels->>''l3_name'' = adc_2.l3_name
							      AND adc.levels->>''channel'' = adc_2.channel
							      AND adc.levels->>''sub_channel'' = adc_2.sub_channel
							      AND sm.name = adc_2.season_name
							      ' || _where ||' )all_door_choices
							  GROUP BY 1,2,3,4,5,6,7,8,9,10,11,12,all_door_cc_2_2_screen,created_by)mapping_plans
							LEFT JOIN
							  finalised_hierarchies
							USING
							  (l0_name,l1_name,l2_name,l3_name,sub_channel,channel,season_name)
							GROUP BY 1,2,3,4,5,6,7,8,9,10,11,12,13,14
							ORDER BY core_choice_id DESC	
							';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
