--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_update_discount_values runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_update_discount_values

DROP FUNCTION if exists price_promo.fn_update_discount_values;
CREATE OR REPLACE FUNCTION price_promo.fn_update_discount_values(
    p_promo_id int,
    p_discounts_data jsonb,
    p_updated_scenario_ids int[],
    p_user_id int,
    p_include_temporary_saved_changes boolean default false
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    DECLARE
        _last_approved_scenario_id int;
    BEGIN

        if (
            (select last_approved_scenario_id from price_promo.promo_master where promo_id = p_promo_id) 
            in (select unnest(p_updated_scenario_ids))
            or (
                select last_approved_scenario_id from price_promo.promo_master where promo_id = p_promo_id
            ) in (select scenario_id from price_promo.scenario_master where promo_id = p_promo_id and updated_at > (
                select coalesce(last_simulation_time,created_at) from price_promo.promo_master where promo_id = p_promo_id
            ))
        ) then
            update price_promo.promo_master 
            set 
                last_approved_scenario_id = NULL,
                status = 0,
                recommendation_type_id = NULL,
                updated_by = p_user_id
            where promo_id = p_promo_id;
            delete from price_promo.ps_recommended_finalized where promo_id = p_promo_id;
            delete from price_promo.ps_recommended_finalized_agg where promo_id = p_promo_id;
        end if;

        update price_promo.scenario_master
        set updated_at = now() at time zone 'UTC'
        where scenario_id = any(p_updated_scenario_ids);
        
        if not p_include_temporary_saved_changes then
            create temp table tb_tmp_user_input_discounts as 
                select 
                *
            from jsonb_to_recordset(p_discounts_data) as x(
                row_id int,
                scenario_data jsonb
            );

            create temp table tb_tmp_current_discount_records as 
            select 
                *
            from price_promo.ps_scenario_discounts
            where id in (select row_id from tb_tmp_user_input_discounts);

            delete from price_promo.ps_scenario_discounts
            where id in (select row_id from tb_tmp_user_input_discounts);

            insert into price_promo.ps_scenario_discounts
            (id,promo_id,scenario_data,product_level_id,store_level_id,customer_level_id,ia_recommended_data)
            select 
                ttcdr.id,
                p_promo_id,
                ttuid.scenario_data,
                ttcdr.product_level_id,
                ttcdr.store_level_id,
                ttcdr.customer_level_id,
                ttcdr.ia_recommended_data
            from tb_tmp_user_input_discounts ttuid
            inner join tb_tmp_current_discount_records ttcdr
            on ttuid.row_id = ttcdr.id;
        ELSE

            delete from price_promo.ps_scenario_discounts
            where promo_id = p_promo_id;

            insert into price_promo.ps_scenario_discounts
            (
                id,
                promo_id,
                product_level_id,
                store_level_id,
                customer_level_id,
                scenario_data,
                ia_recommended_data
            )
            select 
                ttuid.id,
                p_promo_id,
                ttuid.product_level_id,
                ttuid.store_level_id,
                ttuid.customer_level_id,
                ttuid.scenario_data,
                ttuid.ia_recommended_data
            from price_promo.tb_user_promo_temp_bulk_edit_data ttuid
            where ttuid.promo_id = p_promo_id and ttuid.user_id = p_user_id;

            delete from price_promo.tb_user_promo_temp_bulk_edit_data
            where promo_id = p_promo_id;
        end if;
    END;
$function$
;
