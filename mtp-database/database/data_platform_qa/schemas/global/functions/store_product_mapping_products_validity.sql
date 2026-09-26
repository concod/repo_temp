--liquibase formatted sql
--changeset akshay.jain@impactanalytics.co:store_product_mapping_products_validity_MTP-18485 runOnChange:true stripComments:false splitStatements:false context:MTP-18485_PROD labels:ADDED_UPDATED_AT_BY_INFO_prod
--comment: Added updated at and updated by column in response sync in prod
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_product_mapping_products_validity(input refcursor, text[], jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.store_product_mapping_products_validity(input refcursor, text[], jsonb, jsonb, jsonb, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
 	_query_pm text := '';
 	_query_pa text := '';
 	_query_table_filters text := '';
 	_query_combine text;
 	_final_query text;
 	_store_codes_len int := array_length($2, 1);
 	begin
 		_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $3));
  		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $4);
 		_query_table_filters := "global".form_table_query($5);
 		_query_combine := 'SELECT * FROM (
 			select pm.*,
 	/*case
 		when count(psm.store_code) > 0 then true
 		else false
 	end as is_mapped,
 	concat(count(psm.store_code), ''/'', ' || _store_codes_len || ') as num_stores_mapped,
 	array_agg(psm.store_code) as mapped_stores,
 	*/
 	psm.validity, psm.updated_by, psm.updated_at
  	from (
 	 	select
 		product_code,
 		store_code,
 		validity,
		name as updated_by,
		pg_xact_commit_timestamp(pmps.xmin) as updated_at
 	from
 		"global".product_mapping_product_store pmps left join global.user_master um on pmps.updated_by = um.user_code
 	where
 		store_code = any(''' || concat($2) || '''::varchar[])
 		) psm
 	join 
 	(
 	 SELECT main.product_name, main.product_description, attributes.*
 	FROM (' || _query_pm || ') main JOIN (' || _query_pa || ') attributes	
  	ON main.product_code = attributes.product_code
 	) pm
 	on
 	pm.product_code = psm.product_code
 	and psm.validity is not null
 		) X ' || _query_table_filters;
 	raise notice '%', _query_combine;
 	if $6 is true then 
 		_final_query := 'select count(*) from (' || _query_combine || ') temp' ;
 	else
 		_final_query := _query_combine;
 	end if;
 
 	OPEN $1 FOR execute _final_query;
 	RETURN $1;
  	end
 $function$
;

