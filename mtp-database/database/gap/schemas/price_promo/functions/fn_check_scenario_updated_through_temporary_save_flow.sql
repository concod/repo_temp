--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_check_scenario_updated_through_temporary_save_flow runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_check_scenario_updated_through_temporary_save_flow

DROP FUNCTION IF EXISTS price_promo.fn_check_scenario_updated_through_temporary_save_flow;
CREATE OR REPLACE FUNCTION price_promo.fn_check_scenario_updated_through_temporary_save_flow(
    p_promo_id int,
    p_scenario_id int,
    p_user_id int
)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare

    _temp_data_exists boolean;
    _scenario_order_id int;
    _is_scenario_updated boolean;
    
BEGIN

    execute format(
        '
            select exists (
                select 1 from price_promo.tb_user_promo_temp_bulk_edit_data_%1$s_%2$s 
            )',
        p_promo_id,
        p_user_id
    ) into _temp_data_exists;

    if not _temp_data_exists then
        return false;
    end if;


    _scenario_order_id = (
        select 
            scenario_order_id 
        from price_promo.scenario_master 
        where 
            promo_id = p_promo_id 
            and 
            scenario_id = p_scenario_id
    );


    execute format(
        '
            select exists (
                select 1
                from price_promo.tb_user_promo_temp_bulk_edit_data_%1$s_%2$s
                where (scenario_data[''%3$s'']->>''updated_at'')::timestamptz > (
                    select coalesce(last_simulation_time,created_at) from 
                    price_promo.promo_master pm
                    where pm.promo_id = %1$s
                )
                limit 1
            )
        ',
        p_promo_id,
        p_user_id,
        _scenario_order_id
    ) into _is_scenario_updated;

    return _is_scenario_updated;
   
END;
$function$
;
