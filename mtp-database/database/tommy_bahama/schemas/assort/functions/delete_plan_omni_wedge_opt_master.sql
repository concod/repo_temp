--liquibase formatted sql
--changeset liquibase:delete_plan_omni_wedge_opt_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for delete_plan_omni_wedge_opt_master
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.delete_plan_omni_wedge_opt_master(source_plan_code integer, destination_plan_code integer, is_full_delete text);
CREATE OR REPLACE FUNCTION assort.delete_plan_omni_wedge_opt_master(source_plan_code integer, destination_plan_code integer, is_full_delete text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
_delete_omni_query text;
_delete_plan_attr_query text;
_is_full_delete text;
_channel text;
_updated_channel_query text;
_updated_buy_units_query text;
   /*
    Function/Procedure name: assort.delete_plan_omni_wedge_opt_master
    Created by: Hemant Kumar Singh
    Created at: 27-Jun-2022
    No of input parameter: 3
    Parameter Description : $1 = source_plan_code, &2 = destination_plan_code, $3 = is_full_delete
    Purpose: This function been created to getting delete plan omni wedge   
    Calling Statement:
    SELECT assort.delete_plan_omni_wedge_opt_master(5001,1779,'false');
    Hemant Kumar SIngh:getting delete plan omni wedge opt master
    */
begin
    _is_full_delete:= lower($3);
    
    if _is_full_delete = 'true' then
        _delete_omni_query = 'DELETE FROM assort.plan_omni_wedge_opt_master
                        WHERE source_plan_code=' || $1 ||'  AND destination_plan_code=' || $2 ||'' ;
        _delete_plan_attr_query = 'DELETE FROM assort.plan_product_attributes
                        WHERE plan_code=' || $1 ||' ';
         
        UPDATE assort.plan_master
				SET  channel='{}'::character varying[]
				where plan_code =$1;
			
    	execute _delete_omni_query; 
    	execute _delete_plan_attr_query;
                                 
    elsif _is_full_delete = 'false'  then  
        _updated_buy_units_query = 'UPDATE assort.plan_omni_wedge_opt_master as pomwo 
                                SET  attribute_value  =attribute_value::jsonb || jsonb_build_object (''buy_units'',omni_wedge.updated_buy_units)
                                from (
                                SELECT distinct pom.source_plan_code, pom.source_choice_id,
                                ((pom.attribute_value->>''buy_units'')::float - (pom.destination_attribute_value->>''plan_buy_units'')::float) updated_buy_units
                                FROM assort.plan_omni_wedge_opt_master pom
                                inner join assort.plan_omni_wedge_opt_master pomw
                                on pom.source_plan_code = pomw.source_plan_code 
                                and pom.source_choice_id = pomw.source_choice_id 
                                where pom.source_plan_code =' || $1 ||' and pom.destination_plan_code =' || $2 ||' and pom.destination_choice_id !=''''
                                ) as omni_wedge
                                where pomwo.source_plan_code = omni_wedge.source_plan_code and pomwo.source_choice_id = omni_wedge.source_choice_id
                                ';  
        
        execute _updated_buy_units_query;
       
        _delete_omni_query = 'DELETE FROM assort.plan_omni_wedge_opt_master
                        WHERE source_plan_code=' || $1 ||'  AND destination_plan_code=' || $2 ||' ';   
                       
       select channel[1]
       		into _channel
       	FROM assort.plan_master
        		where plan_code=$2 ;
        	
       _updated_channel_query = ' update assort.plan_master
									set channel= array_remove(channel,'''||_channel||''')
                                    where plan_code =' || $1 ||'';

        raise notice '_updated_channel_query%',_updated_channel_query;

        execute _updated_channel_query;
       	execute _delete_omni_query;
    end if;
    
   
end;
$function$
;
