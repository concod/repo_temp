--liquibase formatted sql
--changeset liquibase:column_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for column_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.column_list(jsonb);
CREATE OR REPLACE FUNCTION global.column_list(jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
/*
  
 * Function/Procedure name: global.column_list
 * Created by: Kailash Yadav
 * Created at: 22-Aug-2022
 * No of input parameter: 1
 * Parameter Description : $1 = Json
 * Purpose: This function been created to get the column name given in as json input (key).
 * Calling Statement:   
 *  select * from global.column_list('{"l0_name": [{"type": "list", "operator": "in", "values": ["Accessories"]}], "l1_name": [], "l2_name": [], "l3_name": [], "style": [],  "size": []}')
 * 
 * if any modification done in same function/procedure please record the changes in below format
 * 
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * 
 */
 
declare
	_keys text;
	_key text;
	_counter integer:=0;
	begin
        
    	for _key in 
			select 
			jsonb_object_keys( $1) keys order by 1
			loop
				_counter:=_counter+1;
				if _counter =1 then	
					_keys := concat( _keys , _key);
				else 
					_keys := concat( _keys , ','||_key);
				end if;
				--raise notice  '_key%',_key;
			end loop;
			raise notice '_keys%',_keys;

		return _keys;
	end
$function$
;
