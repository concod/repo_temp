--liquibase formatted sql
--changeset liquibase:plan_l3_opt_master_optimization_level_update runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_l3_opt_master_optimization_level_update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_l3_opt_master_optimization_level_update(jsonb, text);
CREATE OR REPLACE FUNCTION assort_smart.plan_l3_opt_master_optimization_level_update(jsonb, text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$

/*
Function/Procedure name: assort_smart.plan_l3_opt_master_update
Created by: Hemant Kumar Singh
Created at: 15-Mar-2022
Updated at: 01-jun-2022
No of input parameter: 1
Parameter Description : $1 = json
Purpose: This function been created to update two table plan_l3_opt_master and plan_cluster_opt_master
Calling Statement:
Hemant Kumar SIngh: getting updating two table plan_l3_opt_master_update
*/

declare 
_query_combine text := '';
_query_combine2 text := '';
_query_combine3 text := '';
_filterkeys text[] ;
_filtervals text[] ;
_key text;
_value text;
_key1 text;
_value1 text;
_key2 text;
_value2 text;
_plan_code integer;
_plan_bud_opt_id integer;
_input_json json ;
_isactive text;
_attribute_value text;
_where text;
_l3_penetration_ty float;
_l3_penetration_ly float;
begin       
        for _input_json in select json_array_elements(value::json) input_json from 
            (select value from jsonb_each_text($1::jsonb)) x
            
        loop
        for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
                loop 
                if _key ='plan_code' then 
                 _plan_code = _value::integer;
                raise notice '%',_plan_code;
                elsif _key ='plan_bud_opt_id' then 
                    _plan_bud_opt_id = _value::integer;
                   raise notice '%',_plan_bud_opt_id;
                elsif _key = 'is_active' then 
                    _isactive = _value;
                elsif _key ='filters' then 
                    for _key1, _value1 in SELECT * FROM json_each_text(_value::json)  loop 
                        _filterkeys := array_append(_filterkeys, _key1);
                        _filtervals := array_append(_filtervals, '''' || _value1 || '''');
                    if _where IS NULL then
                         _where:= ('where levels->>'''|| _key1 || ''' ' || ' in ('''|| _value1||''')')::text;
                    else
                        _where:= concat(_where, ' and  levels->>'''|| _key1 || ''' ' || ' in ('''|| _value1||''')');
                    end if;
                  end loop;
                  raise notice '%',_where;
                elsif _key ='attribute_value' then 
                    _attribute_value:= _value::text;
                    --raise notice '_attribute_value %',_value;
                    for _key2,_value2 in SELECT * FROM json_each_text(_value::json)  loop 
                       if _key2 ='penetration_ty' then 
                          _l3_penetration_ty = _value2::float;
                          raise notice 'penetration_ty %',_l3_penetration_ty;
                       elsif _key2 = 'penetration_ly' then 
                         _l3_penetration_ly = _value2::float;
                         raise notice 'penetration_ly %',_l3_penetration_ly;
                     end if;
                  end loop;
                end if;
        end loop;
              _query_combine:= 'UPDATE assort_smart.plan_l3_opt_master
                                SET is_active= '''||_isactive||''',
                                attribute_value = attribute_value::jsonb || '''|| _attribute_value||'''
                                WHERE plan_bud_opt_id ='||_plan_bud_opt_id||' AND plan_code='||_plan_code;
								
		                       
       		 _query_combine2:= 'UPDATE assort_smart.plan_cluster_opt_master
                               SET  attribute_value =  attribute_value::jsonb||jsonb_build_object(''l3_penetration_ty'','||_l3_penetration_ty
								|| ',''l3_penetration_ly'','||_l3_penetration_ly||') '
								|| _where ||' AND plan_code='||_plan_code;
		 
				execute _query_combine;
			 	execute _query_combine2;
							
			if _isactive='NO' then
				_query_combine3:= 'DELETE FROM assort_smart.plan_cluster_opt_master
								'||_where ||' AND plan_code='||_plan_code;  
				 execute _query_combine3;			
		   end if;
		 _where:= NULL;
		 raise notice ' final where %',_where;
         raise notice '%',_query_combine;
         raise notice '%',_query_combine2;
         raise notice '%',_query_combine3;
       
		
    end loop;
end
;
$function$
;
