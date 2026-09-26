--liquibase formatted sql
--changeset liquibase:plan_cluster_opt_attribute_update runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_opt_attribute_update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.plan_cluster_opt_attribute_update(jsonb);
CREATE OR REPLACE FUNCTION assort.plan_cluster_opt_attribute_update(jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
_PT_query_combine text := '';
_ST_query_combine text := '';
_key text;
_value text;
_key1 text;
_value1 text;
_key2 text;
_value2 text;
_master_attribue_value json;
_plan_clu_opt_id integer;
_input_json json ;
_attribute_value json;

begin       
        for _input_json in select json_array_elements(value::json) input_json from 
            (select value from jsonb_each_text($1::jsonb)) x
           
        loop
        for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) 
        loop 
                raise notice '%',_key;
                raise notice '%',_value;
               
                if _key ='plan_clu_opt_id' then 
                 	_plan_clu_opt_id := _value::integer;
                elsif _key ='master_attribue_value' then 
	                _master_attribue_value := _value::json;
	                _PT_query_combine := 'UPDATE assort.plan_cluster_opt_master
															  SET attribute_value= attribute_value::jsonb ||   '''|| _master_attribue_value||'''
													    WHERE plan_clu_opt_id='||_plan_clu_opt_id;
					raise notice '_PT_query_combine %',_PT_query_combine; 
					raise notice 'master_attribue_value %',_master_attribue_value;
					execute _PT_query_combine;
                elsif _key ='attribute_value' then
                	_attribute_value := _value::json;
                	raise notice '%','inside attt value '||_value;
        		end if;	       
        end loop;
       
        for _input_json in select json_array_elements(_attribute_value::json) 
        loop
	        for _key1, _value1 in SELECT * FROM jsonb_each_text(_input_json::jsonb) 
	        loop 
	              raise notice '%',_key1;
	              raise notice '%',_value1;
	             _ST_query_combine := 'UPDATE assort.plan_cluster_opt_attribute
											 SET attribute_value= attribute_value::jsonb ||   '''|| _value1||'''
									WHERE attribute_name = '''||_key1||''' AND plan_clu_opt_id= '||_plan_clu_opt_id;
								
				raise notice '_ST_query_combine %',_ST_query_combine; 
				execute _ST_query_combine;
	        end loop;
       	end loop;
    end loop;
end
;
$function$

;