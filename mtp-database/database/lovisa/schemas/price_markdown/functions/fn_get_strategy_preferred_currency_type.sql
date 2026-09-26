--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_get_strategy_preferred_currency_type_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_get_strategy_preferred_currency_type_1
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_get_strategy_preferred_currency_type;


CREATE OR REPLACE FUNCTION price_markdown.fn_get_strategy_preferred_currency_type(_strategy_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    _currency_type TEXT;
BEGIN
    with unique_countries_cte as(
	    select 
	        tsh.strategy_id,
	        array_agg(tsh.hierarchy_value) as selected_countries
	    from 
	        price_markdown.tb_strategy_hierarchy tsh 
	    where 
	        tsh.strategy_id = _strategy_id
	        and tsh.is_product_hierarchy = 0 
	        and tsh.hierarchy_level = 1
	    group by 
	        tsh.strategy_id 
	)
	select 
	    (
	        case 
	            when tsm.store_recommendation_level = 0 and array_length(ucc.selected_countries, 1) > 1 -- Territory Reco selection with multiple countries
	                then 'dominating'
	            when tsm.store_recommendation_level = 0 -- Territory Reco selection with single country
	                then 'local'
	            when tsm.store_recommendation_level = 2 and array_length(ucc.selected_countries, 1) > 1 -- Channel Reco selection with multiple countries
	                then 'dominating'
	            when tsm.store_recommendation_level = 2 -- Channel Reco selection with single country
	                then 'local'
	            else 'local' -- Country or Store Reco Level
	        end
	    ) into _currency_type
	from 
	    price_markdown.tb_strategy_master tsm
	left join 
	    unique_countries_cte ucc on tsm.strategy_id = ucc.strategy_id 
	where 
	    tsm.strategy_id = _strategy_id;

    RETURN _currency_type;
END;
$function$
;
