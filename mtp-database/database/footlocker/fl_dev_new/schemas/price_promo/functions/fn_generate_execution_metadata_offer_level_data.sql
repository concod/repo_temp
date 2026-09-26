--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_generate_execution_metadata_offer_level_data_4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: changed promo_action values to DEL, MOD, ADD


DROP FUNCTION IF EXISTS price_promo.fn_generate_execution_metadata_offer_level_data;


CREATE OR REPLACE FUNCTION price_promo.fn_generate_execution_metadata_offer_level_data(p_promo_ids integer[], p_status text)
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$
    declare
        _query text;
       insert_ids int[];
    begin

--      perform price_promo.fn_generate_execution_metadata_product_group_data(p_promo_ids);

        raise notice 'here';
        _query = format('
            insert into price_promo.so5_integration_offer_execution_details
            (
                template_id,
                price_filter,
                target_folder,
                location_list,
                eligibility_condition,
                eligibility_condition_value,
                limits,
                discount_type,
                discount_value,
                no_of_tiers,
                tier,
                start_date,
                end_date,
                promo_code,
                receipt_text_eng,
                receipt_text_fr,
                sfcc_pip_text,
                sfcc_drop_ship,
                sfcc_tender_type_promo_msg,
                ia_offer_id,
                sfcc_pip_customer_group,
                sfcc_customer_group,
                sfcc_pip_rank,
                sfcc_rank,
                sfcc_ats_check,
                offer_name,
                promo_action,
                status,
                deploy,
                exclusion_product_group_id,
                inclusion_product_group_id
            )
            with promo_store_details as (
                select
                    pm.promo_id,
                    case
                        when pm.store_selection_type = 1 then
                            (select array_agg(store_id) from global.tb_store_master where is_active = 1)
                        else
                            array_agg(store_id)
                    end as store_ids
                from
                    price_promo.promo_master pm
                left join
                    price_promo.promo_store ps
                on pm.promo_id = ps.promo_id
                where pm.promo_id in (%1$s)
                group by pm.promo_id
            ),
            promo_offer_info as (
                select
                    s.r_promo_id as promo_id,
                    s.r_offer_details as offer_details
                from
                    price_promo.fn_derive_offer_data_for_integration(
                        array[%1$s]::int[]
                    ) s
            )
            select
                tep.template_id,
                tep.price_filter_id as price_filter,
                tetf.name as target_folder,
                psd.store_ids as location_list,
                poi.offer_details->>''eligibility_condition_unit'' as eligibility_condition_unit,
                (poi.offer_details->>''eligibility_condition_value'')::bigint as eligibility_condition_value,
                (poi.offer_details->>''limit'')::bigint as limits,
                poi.offer_details->>''discount_type'' as discount_type,
                (poi.offer_details->>''discount_value'')::float8 as discount_value,
                (poi.offer_details->>''number_of_tiers'')::bigint as number_of_tiers,
                (poi.offer_details->>''tier'')::bigint as tier,
                pm.start_date,
                pm.end_date,
                tep.promo_code,
                tep.receipt_text_eng,
                tep.receipt_text_french,
                tep.sfcc_pip_text,
                tesdo.name as sfcc_drop_ship_options,
                tep.sfcc_tender_type_promo_msg,
                pm.promo_id as offer_id,
                tep.sfcc_pip_customer_group,
                tep.sfcc_customer_group,
                tep.sfcc_pip_rank,
                tep.sfcc_rank,
                tesac.name as sfcc_ats_check,
                pm.name as offer_name,
                case
                    when %2$L = ''Archive'' then ''DEL''
                    when pm.last_exmd_synced_time is not null then ''MOD''
                    else ''ADD''
                end as promo_action,
                %2$L as status,
                false as deploy,
                case when exclusion_selection_type is null then null else ''EXC''||pm.promo_id end as exclusion,
                case when product_selection_type = 1 then ''SITEWIDE'' else ''INC''||pm.promo_id end as inclusion
            from price_promo.promo_master pm
            left join price_promo.tb_exmd_promo tep
            on pm.promo_id = tep.promo_id
            left join price_promo.tb_exmd_price_filter tepf
            on tep.price_filter_id = tepf.price_filter_id
            left join price_promo.tb_exmd_target_folder tetf
            on tetf.folder_id = tep.folder_id
            left join promo_store_details psd
            on psd.promo_id = tep.promo_id
            left join price_promo.tb_exmd_sfcc_dropship_options tesdo
            on tesdo.sfcc_dropship_id = tep.sfcc_dropship_id
            left join price_promo.tb_exmd_sfcc_ats_check tesac
            on tesac.sfcc_ats_check_id = tep.sfcc_ats_check_id
            left join promo_offer_info poi
            on poi.promo_id = pm.promo_id
            where pm.promo_id in (%1$s)
        ',
        array_to_string(p_promo_ids,','),
        p_status
        );

        raise notice 'query: %',_query;

        _query = format('
                WITH ins AS (
                    %1$s
                    RETURNING id
                )
                SELECT array_agg(id) AS inserted_ids FROM ins', _query);
            execute _query into insert_ids;

--        execute _query into insert_ids;




        update price_promo.promo_master
        set last_exmd_synced_time = now()
        where promo_id = any(p_promo_ids);
        return insert_ids;
    END;
$function$
;
