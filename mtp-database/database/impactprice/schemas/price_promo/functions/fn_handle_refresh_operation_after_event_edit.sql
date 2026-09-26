--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_handle_refresh_operation_after_event_edit runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_handle_refresh_operation_after_event_edit

DROP FUNCTION if exists price_promo.fn_handle_refresh_operation_after_event_edit;
CREATE OR REPLACE FUNCTION price_promo.fn_handle_refresh_operation_after_event_edit(
    p_promo_id int,
    p_event_id int
)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    _event_record record;
    _user_id integer;
begin

    raise notice 'inside fn_handle_refresh_operation_after_event_edit : %', p_promo_id;
    update price_promo.promo_master 
        set status = 0,last_approved_scenario_id = null 
    where promo_id = p_promo_id;

    select 
        edr.use_same_as_event,
        em.start_date,
        em.end_date
    from price_promo.event_master em
    left join price_promo.event_date_restrictions edr
    on edr.event_id = em.event_id
    where em.event_id = p_event_id
    into _event_record;


    if _event_record.use_same_as_event then
        update price_promo.promo_master
        set start_date = _event_record.start_date,
            end_date = _event_record.end_date
        where promo_id = p_promo_id;
    end if;

    if exists(
        select 1
        where (
            select array_agg(eepg.product_group_id order by eepg.product_group_id)
            from price_promo.excluded_event_product_groups eepg
            where eepg.event_id = p_event_id
        ) is DISTINCT from (
            select array_agg(epg.pg_id order by epg.pg_id)
            from price_promo.excluded_product_groups epg
            where epg.promo_id = p_promo_id
        )
    ) then
        delete from price_promo.excluded_product_groups epg
        where epg.promo_id = p_promo_id;

        update price_promo.promo_master
        set exclusion_selection_type = 3
        where promo_id = p_promo_id;

        insert into price_promo.excluded_product_groups (promo_id, pg_id,pg_name)
        select p_promo_id,eepg.product_group_id,tpg.pg_name
        from price_promo.excluded_event_product_groups eepg
        inner join pricesmart.tb_product_group tpg
        on eepg.product_group_id = tpg.pg_id
        where eepg.event_id = p_event_id;

        _user_id = (select created_by from price_promo.promo_master where promo_id = p_promo_id);

        perform price_promo.fn_save_promo_final_hierarchy(p_promo_id, _user_id);
        perform price_promo.fn_save_promo_final_products(p_promo_id, _user_id);
    end if;


end;
$function$
;
