--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_insert_stores_for_promo_based_on_event runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_insert_stores_for_promo_based_on_event

drop function if exists price_promo.fn_insert_stores_for_promo_based_on_event;
CREATE OR REPLACE FUNCTION price_promo.fn_insert_stores_for_promo_based_on_event(
    p_promo_id int,
    p_event_id int
)
RETURNS void AS $$
DECLARE

    _event_record price_promo.event_master%ROWTYPE;

BEGIN

    select * into _event_record
    from price_promo.event_master
    where event_id = p_event_id;

    if _event_record.store_selection_type = 'all_stores' then 
        return;
	end if;
    
    insert into price_promo.promo_store_hierarchy 
    (promo_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name)
    SELECT 
        p_promo_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name
    from price_promo.included_event_store_hierarchy
    where event_id = p_event_id;

    insert into price_promo.promo_store
    (promo_id,store_id,store_name)
    select 
        p_promo_id,tsm.store_id,tsm.store_name
    from price_promo.included_event_stores ies
    inner join pricesmart.tb_store_master tsm
    on ies.store_id=tsm.store_id
    where event_id = p_event_id;


    if _event_record.store_selection_type = 'store_group' then

        insert into price_promo.tb_promo_store_groups
        (promo_id,store_group_id,store_group_name)
        select 
            p_promo_id,iesg.store_group_id,tsg.sg_name
        from price_promo.included_event_store_groups iesg
        inner join pricesmart.tb_store_group tsg
        on tsg.sg_id = iesg.store_group_id
        where iesg.event_id = p_event_id;

        perform price_promo.fn_insert_promo_sg_hierarchy(
            p_promo_id,
            array(
                select store_group_id 
                from price_promo.included_event_store_groups 
                where event_id = p_event_id
            )
        );
	end if;

END;
$$ LANGUAGE plpgsql;
