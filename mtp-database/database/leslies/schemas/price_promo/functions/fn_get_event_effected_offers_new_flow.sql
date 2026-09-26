--liquibase formatted sql       
--changeset harsh.singh@impactanalytics.co:fn_get_event_effected_offers_new_flow runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_get_event_effected_offers_new_flow    

DROP FUNCTION if exists price_promo.fn_get_event_effected_offers_new_flow;
CREATE OR REPLACE FUNCTION price_promo.fn_get_event_effected_offers_new_flow(p_event_id integer, p_event_model price_promo.event_model_new_flow)
 RETURNS TABLE(r_promo_id integer, r_promo_name character varying, r_promo_status integer, r_start_date date, r_end_date date, r_action character varying, r_new_status integer, r_operation_to_perform text, r_product_restrictions_change character varying, r_store_restrictions_change character varying, r_customer_restrictions_change character varying)
 LANGUAGE plpgsql
AS $function$
declare

    _event_record record;
    _date_change bool = false;
    _product_exclusions_change bool = false;
    _same_dates_as_event_flag_change bool = false;
    _restrictions_change_record record;
    _date_restriction_change bool = false;

    _TO_BE_REFRESHED constant varchar = 'To be Refreshed';
    _TO_BE_ARCHIVED constant varchar = 'To be Archived';
    _TO_BE_SET_AS_DRAFT constant varchar = 'To be Set as Draft';

    _ARCHIVED_STATUS constant int = 6;
    _DRAFT_STATUS constant int = 0;

    _MODIFIED_RESTRICTIONS_MSG constant varchar(100) := 'modified restrictions';
    _REMOVED_RESTRICTIONS_MSG constant varchar(100) := 'removed restrictions';


begin

    drop table if exists tb_tmp_event_effected_offers;
    create temp table tb_tmp_event_effected_offers (
        promo_id int,
        promo_name varchar(100),
        promo_status int,
        start_date date,
        end_date date,
        action varchar(100),
        new_status int,
        product_restrictions_change varchar(100),
        store_restrictions_change varchar(100),
        customer_restrictions_change varchar(100)
    );

    select 
           em.event_id,
           em.start_date,
           em.end_date,
           edr.use_same_as_event
    from price_promo.event_master em
    left join price_promo.event_date_restrictions edr
    on em.event_id = edr.event_id 
    where em.event_id = p_event_id 
    into _event_record;

    _date_change = _event_record.start_date <> p_event_model.start_date or _event_record.end_date <> p_event_model.end_date;
    _same_dates_as_event_flag_change = _event_record.use_same_as_event <> (p_event_model).date_restriction.same_as_event;
    _date_restriction_change = _date_change or _same_dates_as_event_flag_change;
    _product_exclusions_change = exists(
        select 1
        where (
            select array_agg(eepg.product_group_id::int8 order by eepg.product_group_id)
            from price_promo.excluded_event_product_groups eepg 
            where eepg.event_id = p_event_id
        ) is distinct from (
            select array_agg(product_group_id order by product_group_id)
            from (select unnest((p_event_model).product_exclusion.product_groups) product_group_id) as product_group_ids
        )
    );
    _restrictions_change_record = price_promo.fn_identify_event_restrictions_change_new_flow(
        p_event_id,
        p_event_model
    );

    raise notice 'restrictions_change: %', _restrictions_change_record.restrictions_change;
    raise notice 'date_change: %', _date_change;
    raise notice 'same_dates_as_event_flag_change: %', _same_dates_as_event_flag_change;
    raise notice 'date_restriction_change: %', _date_restriction_change;
    raise notice 'product_exclusions_change: %', _product_exclusions_change;
    raise notice 'product_restrictions_change: %', _restrictions_change_record.product_restrictions_change;
    raise notice 'store_restrictions_change: %', _restrictions_change_record.store_restrictions_change;
    raise notice 'customer_restrictions_change: %', _restrictions_change_record.customer_restrictions_change;

    insert into tb_tmp_event_effected_offers(
        promo_id,
        promo_name,
        promo_status,
        start_date,
        end_date,
        action,
        new_status,
        product_restrictions_change,
        store_restrictions_change,
        customer_restrictions_change
    )
    with promo_details_cte as (
        SELECT
            pm.promo_id,
            pm.name as promo_name,
            pm.status,
            pm.start_date,
            pm.end_date,
            case 
                
                when _date_restriction_change and (not (p_event_model).date_restriction.same_as_event) and (
                    pm.start_date != p_event_model.start_date 
                    or pm.end_date != p_event_model.end_date
                ) then
                    _TO_BE_ARCHIVED
                when _restrictions_change_record.restrictions_change = _MODIFIED_RESTRICTIONS_MSG 
                    and (_restrictions_change_record.product_restrictions_change = _MODIFIED_RESTRICTIONS_MSG 
                        or _restrictions_change_record.store_restrictions_change = _MODIFIED_RESTRICTIONS_MSG) then
                    _TO_BE_SET_AS_DRAFT
                when _restrictions_change_record.customer_restrictions_change = _MODIFIED_RESTRICTIONS_MSG then
                    _TO_BE_REFRESHED
                when _date_restriction_change and (p_event_model).date_restriction.same_as_event then 
                    _TO_BE_REFRESHED
                when _product_exclusions_change then
                    _TO_BE_REFRESHED
            end as action,
            case
                when _date_restriction_change and (not (p_event_model).date_restriction.same_as_event)
                    and (pm.start_date != p_event_model.start_date or pm.end_date != p_event_model.end_date)
                    then _ARCHIVED_STATUS
                else _DRAFT_STATUS
            end as new_status,
            _restrictions_change_record.product_restrictions_change,
            _restrictions_change_record.store_restrictions_change,
            _restrictions_change_record.customer_restrictions_change

        FROM price_promo.event_master em
        inner join price_promo.promo_master pm
        on em.event_id = pm.event_id
        where em.event_id = p_event_id
        and pm.status not in (-1,6)
    )
    select 
        *
    from promo_details_cte pdc
    where pdc.action is not null;
        


    return query (
        select 
            tteeo.promo_id,
            tteeo.promo_name,
            tteeo.promo_status,
            tteeo.start_date,
            tteeo.end_date,
            tteeo.action,
            tteeo.new_status,
            case when tteeo.action = _TO_BE_ARCHIVED then 'archive'
                when tteeo.action = _TO_BE_SET_AS_DRAFT then 'draft'
                when tteeo.action = _TO_BE_REFRESHED then 'refresh'
            end as operation_to_perform,
            tteeo.product_restrictions_change,
            tteeo.store_restrictions_change,
            tteeo.customer_restrictions_change
        from tb_tmp_event_effected_offers tteeo
    );

end;
$function$
;
