--liquibase formatted sql
--changeset liquibase:vendor_cascade_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vendor_cascade_filter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.vendor_cascade_filter(input text, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.vendor_cascade_filter(input text, jsonb, jsonb, jsonb)
 RETURNS TABLE(attribute character varying)
 LANGUAGE plpgsql
AS $function$
  /*
  * Function gets distict values for the drop down in vendor config filters.
  * args:
  * 	$1: column/filter to find distinct values
  * 	$2: vendor master filters
  * 	$3: vendor sku mapping fields filters
  * 	$4: product attributes filters
  *
  * Author :
  * 	Pradeep Nayak, 26-07-2022
  *
  */
 	declare
 		_distinct_query text ;
 		_main_query text;
 	begin
	 	raise notice ' inside %', _main_query;
		 _main_query := global.vendor_product_list_query($2,$3, $4);
		raise notice ' main query : %', _main_query;
		_distinct_query := ' select distinct('|| $1 ||') from (' || _main_query || ') X';
		raise notice ' distinct query : % ', _distinct_query;
	return query execute _distinct_query;
 	end
   $function$
;
