--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_update_promo_currency_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: function to update promo currency details based on product country

DROP FUNCTION if exists price_promo.fn_update_promo_currency_details;
CREATE OR REPLACE FUNCTION price_promo.fn_update_promo_currency_details(_promo_id integer)
 RETURNS void
 LANGUAGE plpgsql
 security definer
AS $function$
declare
	_query text;
begin

	_query = format(
		'UPDATE 
			price_promo.promo_master pm 
		SET 
			currency_id = (
				SELECT currency_id 
				FROM pricesmart.tb_country_currency_mapping 
				WHERE country_id = COALESCE(
					(
						SELECT 
							prod_m.%1$s::integer 
						FROM 
							price_promo.product_master prod_m 
						WHERE 
							prod_m.product_id = 
								(
									SELECT pp.product_id 
									FROM price_promo.promo_product pp 
									WHERE pp.promo_id = %2$s LIMIT 1
								)
                    ), 
                    1
				)
			) 
		WHERE pm.promo_id = %2$s',
		(
			select 
                * 
            from 
                price_promo.fn_get_configuration_value('application', 'country_column' )
		),
		_promo_id
	);

	raise notice 'promo master update query --- %', _query;
	execute _query;

end
$function$
;
