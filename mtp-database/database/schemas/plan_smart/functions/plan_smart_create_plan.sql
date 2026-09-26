--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:plan_smart_create_plan_chg3 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-24042
--comment: called SP populate_plans to create plan rows in DB henceforth
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.plan_smart_create_plan(jsonb);
CREATE OR REPLACE FUNCTION plan_smart.plan_smart_create_plan(jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 	
 declare
 	_key text;
 	_value text;
 	_key_attr text;
 	_value_attr text;
 	_vals_attr text[];
     _check_columns text[];
 	_input_query text;
     _plan_m_inq text := 'insert into plan_smart.plan_master (';
     _plan_m_values text := ' values(';
     _column_names text[];
     _in_planid int := 0;
     _attribute_keys text[];
     _attribute_values text[];
     _insert_attr_q text := 'insert into plan_smart.plan_attributes(plan_code,attribute_name,attribute_value) values(';
     _query text;
 	_check_week text[];
 	_list_weeks int[];
 	i int;
     begin
         _check_columns = array['name','plan_period_sdate','plan_period_edate','compare_year','channel','created_by','plan_type','special_classification','planning_level_hierarchy','plan_display_name'];
         _check_week = array['weeks'];    
         for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
 			if _key = any(_check_columns) then
                 _plan_m_inq := _plan_m_inq || _key || ',';
                 _plan_m_values := _plan_m_values ||'''' || _value ||''''|| ',';
                 raise notice '%',_value;
             else
                 _attribute_keys := array_append(_attribute_keys,_key);
                 _attribute_values := array_append(_attribute_values,_value);
             end if;
 			if _key = any(_check_week) then
 				for i in (select unnest(_value::int[]))
         		loop
 					_list_weeks := array_append(_list_weeks,i); 
 				end loop;
 			end if;
         end loop;
 		raise notice '%',_list_weeks;
         _plan_m_inq := left(_plan_m_inq,-1);
         _plan_m_inq := _plan_m_inq || ')';
         _plan_m_values := left(_plan_m_values,-1);
         _plan_m_values := _plan_m_values || ') RETURNING plan_code;';
         _plan_m_inq := _plan_m_inq || _plan_m_values;
         --raise notice '%',_plan_m_inq;
         execute _plan_m_inq into _in_planid;
         --raise notice '%',_in_planid;
         --raise notice '%', _attribute_keys[1];
         for i in 1 .. array_upper(_attribute_keys,1)
         loop
             _query := _insert_attr_q || _in_planid || ',' ||'''' || _attribute_keys[i] ||''', '''|| _attribute_values[i]||''''||');';
             --raise notice '%',_query;
             execute _query;
         end loop;
         perform plan_smart.populate_plan_filter_mappings(_in_planid);
         perform plan_smart.create_plan_modification_partition(_in_planid) ;
         perform plan_smart.populate_plans(_in_planid);
         RETURN _in_planid;    
 
     end
 $function$
;
