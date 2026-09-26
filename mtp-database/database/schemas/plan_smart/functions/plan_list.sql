--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:plan_list_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:update_timestamp
--comment: include "update timestamb" column in plan list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.plan_list(input refcursor, jsonb, jsonb, jsonb);
-- DROP FUNCTION plan_smart.plan_list(refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION plan_smart.plan_list(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
 	_query_pm text := '';
 	_query_pa text := '';
 	_pa_input jsonb;
 	_query_table_filters text := '';
 	_query_combine text;
 	begin
 		raise notice 'step1: %',$2;
 		select jsonb_object_agg(key, value) into $2 from (select * from jsonb_each_text($2) where key != 'is_deleted' union select 'is_deleted', '[{"type":"custom","operator":"=","values":"false"}]') x;
 		raise notice 'step2: %',$2;
 		_query_pm := 'SELECT * FROM "plan_smart".plan_master' || ("plan_smart".form_main_table_filters('plan_master', $2));
 	    raise notice 'step3: %',_query_pm;
 		_pa_input := "plan_smart".form_attributes_list($3, 'plan_attributes');
 	   raise notice 'step4: %', _pa_input;
  		_query_pa := "plan_smart".form_attribute_table_filters('plan_attributes', 'plan_code', _pa_input);
  	    raise notice 'step5: %', _query_pa;
 		_query_table_filters := "plan_smart".form_table_query($4);
 	   raise notice 'step6: %', _query_table_filters;
 		_query_combine := 'select
 				*
 			from
 				(
 				select
 						main.plan_code,
 						main.name,
						main.plan_display_name,
 						main.description,
 						main.scenario_name,
 						to_char(main.plan_period_sdate,''yyyy-mm-dd'') as plan_period_sdate,
 						to_char(main.plan_period_edate,''yyyy-mm-dd'') as plan_period_edate,
 						main.channel,
 						to_char(main.created_at,''yyyy-mm-dd'') as created_at,
 						to_char(main.updated_at,''yyyy-mm-dd'') as updated_at,
						main.updated_at as updated_at_fullTimestamp,
 						u1.name as created_by,
 						u2.name as updated_by,
 						main.compare_year,
 						main.plan_type,
						main.eoh_boh_sync,
 						attributes.*
 					from
 						(' || _query_pm || ') main
 					join (' || _query_pa || ') attributes on
 						main.plan_code = attributes.plan_code
 					left join global.user_master u1 on main.created_by = u1.user_code
 					left join global.user_master u2 on main.updated_by = u2.user_code
 				) X ' || _query_table_filters;
 		raise notice 'step7: %', _query_combine;
 		-- RETURN QUERY execute _query_combine;
 		OPEN $1 FOR execute _query_combine;
 		RETURN $1;
  	end
 $function$
;
