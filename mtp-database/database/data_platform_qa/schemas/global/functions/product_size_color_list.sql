--liquibase formatted sql
--changeset liquibase:product_size_color_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_size_color_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_size_color_list(input text[]);
CREATE OR REPLACE FUNCTION global.product_size_color_list(input text[])
 RETURNS TABLE(product_code character varying, style character varying, size character varying, color character varying, color_code character varying)
 LANGUAGE plpgsql
AS $function$
/*
 * Function/Procedure name: global.product_size_color_list
 * Created by: Kailash Yadav
 * Created at: 29-Mar-2022
 * No of input parameter: 1
 * Parameter Description : $1 = Array of styles
 * Purpose: This function been created to get the list of product for a given style.
 * Calling Statement:
 *  select * from global.product_size_color_list ('{"15365", "15366"}')
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 *
 */
declare
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text;
	begin

		_query_combine := 'select main.*, size.size
		, color.color, color_code.color_code
		from  (select pm.product_code , pa1.attribute_value style
		from
		(select product_code from "global".product_master pm) pm
		join "global".product_attributes pa1 on pm.product_code =pa1.product_code
		and attribute_name = ''style''
		and attribute_value::varchar = any(''' || concat($1) || '''::varchar[])
		)  main
		left join
		(select product_code,attribute_value::varchar as size
		from "global".product_attributes pa
			where
				pa.attribute_name = ''size'') size
				on size.product_code  = main.product_code
		left join
		(select product_code,attribute_value::varchar as color
		from "global".product_attributes pa
			where
				pa.attribute_name = ''color'') color
				on color.product_code  = main.product_code
		 left join (
			select
				product_code,
				attribute_value::varchar as color_code
			from
				"global".product_attributes
			where
				attribute_name = ''color_code'')	color_code
				on color_code.product_code  = main.product_code ';

        raise notice '%', _query_combine;

		RETURN QUERY execute _query_combine;
 	end
$function$
;
