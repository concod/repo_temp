--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_promo_stacked_offers-2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated price_markdown.fn_get_promo_stacked_offers-2

DROP FUNCTION if exists price_promo.fn_get_promo_stacked_offers;
CREATE OR REPLACE FUNCTION price_promo.fn_get_promo_stacked_offers(p_promo_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
    declare
        _response jsonb;
		_query text;
	BEGIN
        _query = format(
        '
        with aggregated_response as (
            select  
                tpsom.stackable_type,
                jsonb_agg(
                    jsonb_build_object(
                        ''promo_id'', tpsom.stacked_promo_id,
                        ''promo_name'', pm.name,
                        ''start_date'', pm.start_date,
                        ''end_date'', pm.end_date,
                        ''duration'', (pm.end_date - pm.start_date) + 1,
                        ''overlap_duration'', tpsom.overlap_duration,
                        ''priority_number'', pr.priority_number,
                        ''priority_display_name'', tpn.priority_display_name,
                        ''products_count'', pm.products_count,
                        ''offer_type_combined_display_name'', tpsom.offer_type_combined_display_name
                    )
                ) offer_details
            from price_promo.tb_promo_stacked_offers_mapping tpsom
            inner join
            price_promo.promo_master pm 
            on tpsom.stacked_promo_id = pm.promo_id
            inner join
            price_promo.ps_rules pr
            on pr.promo_id = pm.promo_id
            left join
            price_promo.tb_priority_number tpn
            on tpn.priority_number = pr.priority_number
            where tpsom.promo_id = %1$s
            group by stackable_type
        )
        select jsonb_object_agg(
            stackable_type,
            offer_details
        ) as final_response
        from aggregated_response
        ',
        p_promo_id
        );
        raise notice 'final_response_query: %', _query;
        execute _query into _response;
        _response = _response || jsonb_build_object(
            'no_of_stacked_promos', (
                select count(*) from price_promo.tb_promo_stacked_offers_mapping
                where promo_id = p_promo_id
            )
        );

        return _response;
	END;
$function$
;
