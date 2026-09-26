--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_update_scenario_data_for_copied_promo runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_update_scenario_data_for_copied_promo

DROP FUNCTION if exists price_promo.fn_update_scenario_data_for_copied_promo;
CREATE OR REPLACE FUNCTION price_promo.fn_update_scenario_data_for_copied_promo(
    p_scenario_data jsonb,
    p_old_promo_id int,
    p_new_promo_id int
)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    _new_scenario_data jsonb = '{}'::jsonb;
    _scenario_order_id int;
    _scenario_data jsonb;
    
BEGIN

    for _scenario_order_id,_scenario_data in (select * from jsonb_each(p_scenario_data))
    loop
        raise notice 'scenario_order_id: %, scenario_data: %', _scenario_order_id, _scenario_data;
        if _scenario_data->>'tier_id' is not null then
            _scenario_data['tier_id'] = (
                select new_tier_id 
                from temp_tier_ids -- this table is created in fn_copy_promo
                where old_tier_id = _scenario_data['tier_id']::int
            );
        end if;

        _scenario_data['scenario_id'] = (
            select new_scenario_id
            from scenario_order_map -- this table is created in fn_copy_promo
            where old_scenario_id = _scenario_data['scenario_id']::int
        );

        _new_scenario_data = (
            _new_scenario_data 
            || jsonb_build_object(
                _scenario_order_id,
                _scenario_data
            )
        );
        raise notice 'new_scenario_data: %', _new_scenario_data;

    end loop;

    return _new_scenario_data;

END
$function$
;
