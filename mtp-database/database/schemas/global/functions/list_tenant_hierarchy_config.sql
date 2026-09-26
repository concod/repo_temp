--liquibase formatted sql
--changeset liquibase:list_tenant_hierarchy_config runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for list_tenant_hierarchy_config
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.list_tenant_hierarchy_config(character varying, jsonb);
CREATE OR REPLACE FUNCTION global.list_tenant_hierarchy_config(character varying, jsonb)
 RETURNS TABLE(attribute jsonb)
 LANGUAGE plpgsql
AS $function$
/** Function/Procedure name: global.list_tenant_hierarchy_config
 * Created by: Kailash Yadav
 * Created at: 18-Feb-2022
 * No of input parameter: 2
 * Parameter Description : $1 = Application Name
 * 						   $2 = JSON for hierarchy	 
 * Purpose: This function been created to update/insert in tenant_hierarchy_mapping table based on application and given hierachy.
 * Calling Statement:   
select * from global.list_tenant_hierarchy_config
('assort','{
    "l0_name": [{
        "operator": "in",
        "type": "list",
        "values": ["Accessories", "Apparel"]
    }],
    "l1_name": [{
        "operator": "in",
        "type": "list",
        "values": ["MNS", "WNS", "Youth", "Pre-School"]
    }],
"l2_name": [{
        "operator": "in",
        "type": "list",
        "values": ["Other Business", "Teamsport", "Sportstyle Kids", "Ecosphere"]
    }]
}')
 * if any modification done in same function/procedure please record the changes in below format
 * 
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 *  */

 
declare 

	_query_combine text;
	_query_level_select text; 
	_application_code integer;
	_query_h_insert text;
	
	_query_delete text;
	_query_select_lvl text;
	
	_h_level text;
	
	_h_value text;
	
	_h_check_cnt integer := 0;
	
	_h_check boolean;
	
	_hierarchy_level_id integer;
	_h_match bool;
	_c_p_h text;

	_attribute jsonb;	

	_input_2 text;
	

begin
	
	
	begin 	


	 _input_2:= ''''||$2::text||'''';
	  
	
	_query_level_select:= 
		'select hierarchy_level_id,h_level from 	
	 	(select
		    hierarchy_level_id, 
		    jsonb_object_agg(hierarchy_level, o) h_level
		from
		    (
		    select
		        hierarchy_level_id,
		        hierarchy_level,
		        json_agg(o) as o
		    from
		        (
		        select
		                    hierarchy_level_id,
		                    hierarchy_level,
		                    jsonb_build_object(''values'', jsonb_agg(hierarchy_value), ''type'', ''list'', ''operator'', ''in'') as o
		        from
		                    global.tenant_hierarchy_levels thl
		        group by
		                    hierarchy_level_id,
		                    hierarchy_level
		    ) x
		    group by
		        hierarchy_level_id,
		        hierarchy_level
		) x
		group by
		    hierarchy_level_id ) a 
		    where h_level = '||_input_2  ||' limit 1 ' ;
		   
		execute    _query_level_select into _hierarchy_level_id,_h_level;
		
	
		  
	  if _h_level is not null and  _hierarchy_level_id is not null then
	  	_h_match = true;
	  else 
	  	_h_match = false;
	  end if;
	  
	
	exception when others then 
		_h_match :=false;
		_hierarchy_level_id:=0;
		raise notice 'Failure: Please check input paramater';
	end ;
   
    select application_code into _application_code  from global.application_master am where lower(am."name") = lower ($1);	
    
   	--raise notice '%','_hierarchy_level_id'||_hierarchy_level_id;
     
    
    -- if given hierarchy level is available then delete/ insert the attribute mapping  
	 if _h_match is true then 
		 _query_combine := 
		 	' select jsonb_build_object(''attributes'',attr)
		 	 	from 
				  (
				  select json_agg(json_build_object(
				  						  ''attribute_name'', attribute_type,
				  						  ''attribute_valte'', attribute_value 	
				  )) attr from global.tenant_hierarchy_mapping thm  
				  where hierarchy_level_id ='||_hierarchy_level_id||' 
						and application_code ='||_application_code||'
					) a';
				
		--raise notice '%',_query_combine;	  
	 	RETURN query execute _query_combine;
	 
	 else 
	 	_query_combine :=  'select json_build_object(''attributes'',null )';
	 
	 end if;
		
	
	--raise notice '%', _query_combine;
		
	
	
end
;

$function$
;
