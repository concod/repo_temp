--liquibase formatted sql
--changeset liquibase:validate_notification_tags runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for validate_notification_tags
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.validate_notification_tags(input character);
CREATE OR REPLACE FUNCTION global.validate_notification_tags(input character)
 RETURNS TABLE(tag_value json)
 LANGUAGE plpgsql
AS $function$
/*  
 * Function: global.validate_notification_tags
 * Created by: Kailash Yadav
 * Created at: 11-Jan-2021
 * No of input parameter: 1
 * Parameter Description : $1 = List of tag_values 
 * Purpose: This function been created to return the list of tag values which are missing in database 
 * after compare the given values
 *  select
	* from
	global.validate_notification_tags('{"DC Names", "FC Names", "SKU Description","Style Description",
	"N Mapped","XY Z","XYZ","ABC"}')
 * 
 * if any modification done in same function/procedure please record the changes in below format
 * 
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * 
 */
 
	declare
	_sql text;
	_sql_filter text;
	_array_filter text;
	_noticationtag_filter text[]  := $1 ;
	
	begin
		
	raise notice '%', $1;
		
	select replace(replace (replace ($1::varchar,'{', '['),'}', ']'),'"','''') into _array_filter ;
	raise notice '%', _array_filter;

	select replace(replace (replace ($1::varchar,'{', '('),'}', ')'),'"','''') into _sql_filter;
	raise notice '%', _sql_filter;


	

  _sql := 'select json_agg(tag_value) from 
		( 
      	select unnest(array'|| _array_filter||') tag_value
	 	except
		select tag_value from global.tags_master tm 
		where tag_value in '|| _sql_filter ||
		') a ';
 		
 	
		raise notice '%', _sql;
	    return query execute _sql;
	end $function$
;
