--liquibase formatted sql
--changeset fn_is_promo_conflicting_on_products_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: fn_is_promo_conflicting_on_products_create_1 for fn_is_promo_conflicting_on_products_1

Drop function if exists price_promo.fn_is_promo_conflicting_on_products();

CREATE OR REPLACE FUNCTION price_promo.fn_is_promo_conflicting_on_products(_promo_id integer, _products_query text)
 RETURNS TABLE(is_conflicted boolean, conflicted_products_count integer)
 LANGUAGE plpgsql
AS $function$
declare
	_product_selection_type integer;
	_products_count integer;
	_conflicted_products_count integer := 0;
	target_promo_products_query text;
	final_query text;
begin
	--return query(select false as is_conflicted, 0 as conflicted_products_count);

	select 
		product_selection_type,
		products_count
		into 
		_product_selection_type,
		_products_count
	from 
		price_promo.promo_master pm where pm.promo_id = _promo_id;
	if _product_selection_type = 1 then 
		_conflicted_products_count = _products_count;
	else
		target_promo_products_query = price_promo.fn_get_promo_pg_products_with_lifecycle_indicator(_promo_id, _product_selection_type);
		final_query = 	format('	WITH source_promo_products_cte AS (
									    %1$s
									),
									target_promo_products_cte AS (
									    %2$s
									)
									SELECT 
									    count(distinct sp.product_id) as conflicted_products_count
									FROM 
									    source_promo_products_cte sp
									INNER JOIN 
									    target_promo_products_cte tp ON sp.product_id = tp.product_id AND sp.lifecycle_indicator_id = tp.lifecycle_indicator_id
							   ', _products_query, target_promo_products_query);
		raise notice 'query to find conflict products : %', final_query;
		execute final_query into _conflicted_products_count;
	end if;
	return query(select (_conflicted_products_count > 0) as is_conflicted, _conflicted_products_count as conflicted_products_count);
end;
$function$
;
