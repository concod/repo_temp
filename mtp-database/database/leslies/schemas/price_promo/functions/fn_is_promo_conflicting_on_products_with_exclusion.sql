--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_is_promo_conflicting_on_products_with_exclusion runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_is_promo_conflicting_on_products_with_exclusion


DROP FUNCTION if exists price_promo.fn_is_promo_conflicting_on_products_with_exclusion(int4, int4);

CREATE OR REPLACE FUNCTION price_promo.fn_is_promo_conflicting_on_products_with_exclusion(source_promo_id integer, target_promo_id integer)
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

		final_query = 	format('
							SELECT
							    count(distinct sp.product_id) as conflicted_products_count
							FROM
							    price_promo.promo_product_%1$s sp
							INNER JOIN
							    price_promo.promo_product_%2$s tp ON sp.product_id = tp.product_id
					   ', source_promo_id, target_promo_id);
		raise notice 'query to find conflict products : %', final_query;
		execute final_query into _conflicted_products_count;
	return query(select (_conflicted_products_count > 0) as is_conflicted, _conflicted_products_count as conflicted_products_count);
end;
$function$
;
