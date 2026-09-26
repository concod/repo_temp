--liquibase formatted sql
--changeset liquibase:department_to_channels_distinct runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for department_to_channels_distinct
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.department_to_channels_distinct(input character varying[]);
CREATE OR REPLACE FUNCTION global.department_to_channels_distinct(input character varying[])
 RETURNS TABLE(attributes character varying)
 LANGUAGE plpgsql
 /*  
 * Function/Procedure name: global.department_to_channels_distinct
 * Created by: Ashish Gupta
 * Created at: XX-XX-XXXX
 * No of input parameter: 2
 * Parameter Description : $1 = Array of product
 * Purpose: This function been created to get the  channels for a product.
 * Calling Statement:   
 *  select *
    from
    global.department_to_channels_distinct('{Footwear}'::varchar[])
 * 
 * if any modification done in same function/procedure please record the changes in below format added "where channel is not null"
 * 
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * Kailash Yadav    02-Mar-2022     to filter out the channel which is not mapped to product. 
 */
AS $function$
	declare
	_l0_filter jsonb := '{"l0_name":[{"type":"list", "operator":"in", "values": ' || array_to_json($1) || '}]}';
	_sql text;
	begin
 		_sql := '
				select
					channel
				from (' || global.products_store_filters(
					'{}',
					_l0_filter,
					'{}',
					'{"channel":[]}'
				) || ') main where channel is not null group by 1';
		raise notice '%', _sql;
	return query execute _sql;
	end $function$
;
