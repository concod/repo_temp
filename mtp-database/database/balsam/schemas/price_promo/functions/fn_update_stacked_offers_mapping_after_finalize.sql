--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_update_promo_stacked_offers_mapping_after_finalize-281120240252 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated fn_update_promo_stacked_offers_mapping_after_finalize to update has_stacked_offers flag in promo_master

DROP FUNCTION if exists price_promo.fn_update_promo_stacked_offers_mapping_after_finalize;
CREATE OR REPLACE FUNCTION price_promo.fn_update_promo_stacked_offers_mapping_after_finalize(
    p_promo_ids int[]
)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    _promo_id int;
BEGIN

    perform price_promo.fn_update_promo_stacked_offers_mapping_with_flag_updates(p_promo_ids); 
    for _promo_id in (select unnest(p_promo_ids))
    loop

        delete from price_promo.tb_promo_stacked_offers_mapping where stacked_promo_id = _promo_id;
        
        insert into price_promo.tb_promo_stacked_offers_mapping
        (
            promo_id,
            stacked_promo_id,
            overlap_duration,
            stackable_type,
            offer_type_combined_display_name
        )
        with stacked_offers_data_cte as (
            select
            * 
            from 
            price_promo.fn_get_promo_stacked_offers_util(_promo_id,true)
        ),
        promo_offer_type_data_cte as (
            select
                psrfa.promo_id,
                max(psrfa.offer_type_combined_display_name) as offer_type_combined_display_name
            from price_promo.ps_recommended_finalized_agg psrfa
            where promo_id = _promo_id
            group by promo_id
        )
        select  
            sodc.stacked_promo_id,
            sodc.promo_id,
            sodc.overlap_duration,
            sodc.stackable_type,
            potdc.offer_type_combined_display_name
        from stacked_offers_data_cte sodc
        left join promo_offer_type_data_cte potdc
        on sodc.promo_id = potdc.promo_id;

        update 
            price_promo.promo_master
        set has_stacked_offers = true
        where promo_id in (
            select promo_id from price_promo.tb_promo_stacked_offers_mapping where stacked_promo_id = _promo_id
        );



    end loop;

END
$function$
;
