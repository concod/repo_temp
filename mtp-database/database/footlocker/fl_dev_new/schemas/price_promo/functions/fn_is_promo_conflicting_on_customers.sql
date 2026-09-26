--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:fn_is_promo_conflicting_on_customers_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: fn_is_promo_conflicting_on_customers_create_1 for fn_is_promo_conflicting_on_customers_1

Drop function if exists price_promo.fn_is_promo_conflicting_on_customers;

CREATE OR REPLACE FUNCTION price_promo.fn_is_promo_conflicting_on_customers(p_promo_ids integer[], _customer_ids integer[])
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$
declare 
	_customer_conflicted_promo_ids integer[];
begin 
	SELECT ARRAY(
		SELECT DISTINCT pm.promo_id
		FROM price_promo.promo_master pm
		JOIN price_promo.tb_promo_customers tpc
			ON pm.promo_id = tpc.promo_id
		WHERE
			pm.promo_id = ANY(p_promo_ids)
			AND pm.customer_selection_type = 1
			AND tpc.customer_id = ANY(_customer_ids)
	) into _customer_conflicted_promo_ids;

	return _customer_conflicted_promo_ids;
end;
$function$
;