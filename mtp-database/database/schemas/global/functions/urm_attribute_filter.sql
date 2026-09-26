--liquibase formatted sql
--changeset gautam.baruah@impactanalytics.co:mtp_39323 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: updated function to fetch from view urm_master_without_hierarchies
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.urm_attribute_filter(refcursor, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.urm_attribute_filter(refcursor, jsonb, jsonb, jsonb, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 
 /*  
 * Function/Procedure name: global.urm_attribute_filter
 * Created by: Ashish Gupta
 * Created at: 15-Dec-2021
 * No of input parameter: 4
 * Parameter Description : $1 = refcursor
 *                         $2 = JSON master table name (not required)
 * 						   $3 = Urm attributes list
 * 						   $4 = Json for filter and sort	
 * Purpose: This function been create to give the dynamic filter for users. 
 * Calling Statement:   
 *  select * from global.urm_attribute_filter ( 
 * 			'abc','{}',
 * 			'{"application_name": [{"type": "list", "operator": "in", "values": ["User Access Management"]}], 
			   "role_name": [{"type": "list", "operator": "in", "values": ["admin"]}],
			  "channel": [{"type": "list", "operator": "in", "values": ["Full Line Retail"]}],
				 "l0_name": [{"type": "list", "operator": "in", "values": ["Accessories"]}]
				}'
			,' {"search": null, "sort": null, "range": null, "limit": null}')
 * 
 * if any modification done in same function/procedure please record the changes in below format
 * 
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * Kailash Yadav    29-Mar-2022:    To resolve the update issue in application master.attribute_code    
 * Kailash Yadav    5-Apr-2023:    To resolve the duplicate  user records issue in UAM screen    
 * Gautam Baruah    21-Mar-2024:   To fetch the urm details without the access_hierarchy details
 */
 
 
 */
declare
	_query_sm text := '';
	_query_sa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	_where text;
	_key text;
	_value text;
	_cnt int :=0;
	_filter text;
	_operator text;
	_values text;
	_hierarchy text;
	_final_query text;
	begin
		_query_sm := 'SELECT * FROM "global".urm_master_without_hierarchies' || ("global".form_main_table_filters('urm_master_without_hierarchies', $2));
		
		--raise notice '%',_query_sm;
	
 		_query_sa := "global".form_attribute_table_filters('urm_attributes', 'user_code', $3);
 	
 		--raise notice '_query_sa%',_query_sa;  
		_query_table_filters := "global".form_table_query($4);
--	_query_combine := 'SELECT * FROM (SELECT * FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.user_code = attributes.user_code) X '|| _query_table_filters;
 		
		--raise notice '_query_table_filters%',_query_table_filters; 
	
		/*for _key, _value in SELECT * FROM json_each_text($3::json)  loop 
			for _filter in SELECT * FROM json_array_elements(_value::json) loop
			
				
			if (_filter::json)->>'operator' = 'in' then 
				_operator:=' in ';
				_values:=	replace (replace(replace(_filter::json->>'values', '[', '('), ']', ')'),'"','''');
			   
			else 
				_operator := ' = ';
				_values:=	replace (replace(replace(_filter::json->>'values', '[', '('), ']', ')'),'"','''');
			end if;
			
			
			
 			_cnt := _cnt+1;
			if _cnt = 1 then
			 _where :=' where ';
			elsif _cnt>1 then
			 	_where:=concat(_where,' and ')::text;
			end if;
			--_where:= concat(_where,  _key || ''|| _operator || ' ' || _values)::text;  
		
		  if _key like 'application%' then
          --   
			 _key := 'application';
			
			_where:= concat(_where,  _key || ' '|| _operator || ' ' || _values)::text;
			
          elseif _key like 'role%' then 
             _key := 'roles';
		   --  _where:= concat(_where, ' roles->>'''|| _key || ''''|| _operator || ' ' || _values)::text;
			 _where:= concat(_where,  _key || ' '|| _operator || ' ' || _values)::text;
			else  
				 
				--raise notice '%',	_key;
				
				
				--_where:= concat(_where, ' hierarcies->>'''|| _key || ''''|| _operator || ' ' || _values)::text;
			_where:= concat(_where,  _key || ' '|| _operator || ' ' || _values)::text;
			  
            end if;
       
	    end loop;
		end loop;
		
	raise notice '_where%',_where;
	*/
	 if $3 <> '{}' then
	  _query_combine := 'SELECT * FROM (SELECT distinct main.* FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.user_code = attributes.user_code) X 
		'|| _query_table_filters;
 		
	 else 
		 _query_combine := 'SELECT * FROM (SELECT distinct main.* FROM (' || _query_sm || ') main ) X '|| _query_table_filters;
	 end if;
	if $5 is true then 
		_final_query := 'select count(*) from (' || _query_combine || ') temp' ;
	else
		_final_query := _query_combine;
	end if;
	raise notice '%', _final_query;
 	OPEN $1 FOR execute _final_query;
		RETURN $1;
	end
$function$
;
