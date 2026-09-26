--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_derive_offer_data_for_integration_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial commit for fn_derive_offer_data_for_integration_2


DROP FUNCTION if exists price_promo.fn_derive_offer_data_for_integration;

CREATE OR REPLACE FUNCTION price_promo.fn_derive_offer_data_for_integration(p_promo_ids integer[])
 RETURNS TABLE(r_promo_id integer, r_offer_details jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    declare
        _query text;
        _promo_details record;
        _offer_details jsonb;

	begin

        drop table if exists tb_promo_offer_details;
        create temp table if not exists tb_promo_offer_details (
            promo_id int,
            offer_details jsonb
        );

        for _promo_details in (
            select
                pm.promo_id,
                psd.scenario_id,
                case
                    when psd.offer_type = 'tiered_offer' then tm.offer_type
                    else psd.offer_type
                end as offer_type,
                coalesce(psd.offer_x_type,tm.offer_x_type) as offer_x_type,
                coalesce(psd.offer_x_value,tm.offer_x_value) as offer_x_value,
                coalesce(psd.offer_y_type,tm.offer_y_type) as offer_y_type,
                coalesce(psd.offer_y_value,tm.offer_y_value) as offer_y_value,
                coalesce(psd.offer_z_type,tm.offer_z_type) as offer_z_type,
                coalesce(psd.offer_z_value,tm.offer_z_value) as offer_z_value,
                coalesce(tm.sub_tier_order,1) as sub_tier_order,
                coalesce(tm.number_of_tiers,1) as number_of_tiers
            from
            price_promo.promo_master pm
            left join
            (
                select
                    promo_id,scenario_id,offer_type,offer_x_type,offer_y_type,offer_x_value,offer_y_value,
                    offer_z_type,offer_z_value,false as from_ia_ps_scenario_discounts
                from price_promo.ps_scenario_discounts
                where promo_id = any(p_promo_ids)
                union all
                select
                    promo_id,scenario_id,offer_type,offer_x_type,offer_y_type,offer_x_value,offer_y_value,
                    offer_z_type,offer_z_value, true as from_ia_ps_scenario_discounts
                from price_promo.ia_ps_scenario_discounts
                where promo_id = any(p_promo_ids)
            ) psd
            on pm.promo_id = psd.promo_id and (
                (pm.last_approved_scenario_id = 0 and from_ia_ps_scenario_discounts is true)
                or pm.last_approved_scenario_id = psd.scenario_id
            )
            left join
            (
                select tm.promo_id,tm.offer_type,tm.tier_id,td.sub_tier_id,td.offer_x_type,td.offer_x_value,
                    td.offer_y_type,td.offer_y_value,
                    td.offer_z_type,td.offer_z_value,
                    row_number() over (partition by td.tier_id order by td.sub_tier_id) as sub_tier_order,
                    row_number() over (partition by tm.promo_id order by td.tier_id) as tier_order,
                    count(*) over (partition by td.tier_id) as number_of_tiers
                from price_promo.tier_master tm
                left join
                price_promo.tier_discounts td
                on tm.tier_id = td.tier_id
                where tm.promo_id = any(p_promo_ids)
            ) tm
            on tm.promo_id = pm.promo_id
            where pm.promo_id = any(p_promo_ids) and pm.last_approved_scenario_id is not null
            order by pm.promo_id,tier_id,tm.sub_tier_id
        ) loop

            _offer_details = '{}'::jsonb;
            if _promo_details.offer_type in ('extra_amount_off','percent_off','fixed_price') then
                _offer_details = jsonb_build_object(
                    'discount_type',(
                                        case
                                            when _promo_details.offer_type = 'extra_amount_off' then '$'
                                            when _promo_details.offer_type = 'percent_off' then '%'
                                            when _promo_details.offer_type = 'fixed_price' then 'price point'
                                        end
                                    ),
                    'limit',0,
                    'eligibility_condition_unit', 'Units',
                    'eligibility_condition_value', 1,
                    'discount_value',_promo_details.offer_x_value,
                    'number_of_tiers',_promo_details.number_of_tiers,
                    'tier',_promo_details.sub_tier_order
                );
            elsif _promo_details.offer_type = 'bmsm' then
                _offer_details = jsonb_build_object(
                    'discount_type' , (
                                        case
                                            when _promo_details.offer_y_type = 'dollar_off' then '$'
                                            when _promo_details.offer_y_type = 'percent_off' then '%'
                                            when _promo_details.offer_y_type = 'at_dollar' then 'price point'
                                        end
                                    ),
                    'limit',0,
                    'eligibility_condition_unit',(
                        case
                            when _promo_details.offer_x_type = 'dollar' then '$'
                            when _promo_details.offer_x_type = 'unit' then 'Units'
                        end
                    ),
                    'eligibility_condition_value',_promo_details.offer_x_value,
                    'discount_value',_promo_details.offer_y_value,
                    'number_of_tiers',_promo_details.number_of_tiers,
                    'tier',_promo_details.sub_tier_order
                );
            elsif _promo_details.offer_type in ('bxgy','bxgy_percent_off') then
                _offer_details = jsonb_build_object(
                    'discount_type',(
                                    case
                                        when _promo_details.offer_type = 'bxgy' then 'free'
                                        when _promo_details.offer_type = 'bxgy_percent_off' then '%'
                                    end
                                    ),
                    'limit',_promo_details.offer_y_value,
                    'eligibility_condition_unit','Units',
                    'eligibility_condition_value',_promo_details.offer_x_value + _promo_details.offer_y_value,
                    'discount_value',(
                            case
                                when _promo_details.offer_type = 'bxgy' then null
                                when _promo_details.offer_type = 'bxgy_percent_off' then _promo_details.offer_z_value
                            end
                        ),
                    'number_of_tiers',_promo_details.number_of_tiers,
                    'tier',_promo_details.sub_tier_order
                );
            end if;

            insert into tb_promo_offer_details
            (promo_id,offer_details)
            values
            (_promo_details.promo_id,_offer_details);

        end loop;

        return query (
            select
                promo_id,
                offer_details
            from
                tb_promo_offer_details
        );


	END;
$function$
;
