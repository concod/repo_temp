--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_update_promo_stacked_offers_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_update_promo_stacked_offers_mapping

DROP FUNCTION if exists price_promo.fn_update_promo_stacked_offers_mapping;
CREATE OR REPLACE FUNCTION price_promo.fn_update_promo_stacked_offers_mapping(
    p_promo_ids int[]
)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    _promo_id int;
    _promo_ids_to_be_updated int[];
BEGIN

    _promo_ids_to_be_updated = array(
        select promo_id
        from price_promo.promo_master
        where promo_id = any(p_promo_ids) and has_stacked_offers is null 
        and promo_id in (
            select promo_id from price_promo.ps_rules where promo_id = any(p_promo_ids)
        )
    );

    raise notice 'promo_ids_to_be_updated: %', _promo_ids_to_be_updated;

    for _promo_id in (select unnest(_promo_ids_to_be_updated))
    loop
        delete from price_promo.tb_promo_stacked_offers_mapping
        where promo_id = _promo_id;

        insert into price_promo.tb_promo_stacked_offers_mapping
        (
            promo_id,
            stacked_promo_id,
            overlap_duration,
            stackable_type,
            offer_type_combined_display_name
        )
        select  
            promo_id,
            stacked_promo_id,
            overlap_duration,
            stackable_type,
            offer_type_combined_display_name
        from 
            price_promo.fn_get_promo_stacked_offers_util(_promo_id);

        update price_promo.promo_master
        set has_stacked_offers = case
                                    when coalesce(
                                        (select count(*) from price_promo.tb_promo_stacked_offers_mapping where promo_id = _promo_id),
                                        0
                                     ) > 0 then true
                                    else false
                                end
        where promo_id = _promo_id;

    end loop;

END
$function$
;
