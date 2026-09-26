--liquibase formatted sql
--changeset liquibase:product_store_attribute_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_attribute_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_store_attribute_list(input character varying[]);
CREATE OR REPLACE FUNCTION global.product_store_attribute_list(input character varying[])
 RETURNS TABLE(product_code character varying, attributes jsonb)
 LANGUAGE plpgsql
AS $function$
/*
 * Function/Procedure name: global.product_store_attribute_list
 * Created by: Kailash Yadav
 * Created at: 12-Jan-2021
 * No of input parameter: 1
 * Parameter Description : $1 = list of product
 *
 * Purpose: This function been created to get the list of product and storeattributes
 * Calling Statement:
 *  select * from global.product_store_attribute_list('{"190276166446","190276166447"}')
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
   Kailash Yadav	07-Apr-2022		remove unnecessary code.
 */
declare
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text;
begin
--raise notice '%',$1;
	_query_combine:=
			'select a.product_code, to_jsonb(a.*) attributes
				from (
				select   paf.* ,saf.*  from
					global.product_attributes_filter paf
							left join global.product_store_mapping  psm
							on trim(paf.product_code) =trim(psm.product_code)
							left join global.store_attributes_filter saf
							on trim(psm.store_code) = trim(saf.store_code)
							where paf.product_code =any('''||concat($1)||''')) a '
							;

        raise notice '%', _query_combine;

		RETURN QUERY execute _query_combine;
 	end
$function$
;
