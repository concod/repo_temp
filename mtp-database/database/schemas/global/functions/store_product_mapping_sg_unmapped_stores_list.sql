--liquibase formatted sql
--changeset liquibase:store_product_mapping_sg_unmapped_stores_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_product_mapping_sg_unmapped_stores_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_product_mapping_sg_unmapped_stores_list(input text[], text, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.store_product_mapping_sg_unmapped_stores_list(input text[], text, jsonb, jsonb, jsonb)
 RETURNS TABLE(store_code character varying, store_name character varying, region character varying)
 LANGUAGE plpgsql
AS $function$
declare
	_query_sm text := '';
	_query_sa text := '';
	_query_table_filters text := '';
	_query_combine text;
	_product_codes_len int := array_length($1, 1);
	begin
		_query_sm := 'SELECT * FROM "global".store_master' || ("global".form_main_table_filters('store_master', $3));
 		_query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $4);
		_query_table_filters := "global".form_table_query($5);
		_query_combine := 'SELECT * FROM (select sm.store_code,
	sm.store_name,
	sm.region
 from (SELECT main.*, region FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code) sm
join (
select
	x.store_code
from
	(select distinct store_code, ''' || $2 || ''' as product_code from global.store_groups_mapping where sg_code = any(''' || $1::varchar || '''::int[])) x
left join global.product_store_mapping psm on
	x.store_code = psm.store_code 
	and x.product_code = psm.product_code 
	where psm.product_code is null
) psm
		on
	sm.store_code = psm.store_code
group by
	sm.store_code,
	sm.store_name,
	sm.region
		) X ' || _query_table_filters;
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
