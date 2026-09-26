--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_insert_customers_for_promo_based_on_event runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_insert_customers_for_promo_based_on_event

drop function if exists price_promo.fn_insert_customers_for_promo_based_on_event;
CREATE OR REPLACE FUNCTION price_promo.fn_insert_customers_for_promo_based_on_event(
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

    if _event_record.customer_selection_type = 'customer_segment' then

        insert into price_promo.tb_promo_customer_hierarchy (
            promo_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name
        )
        SELECT
            p_promo_id,tech.hierarchy_level_id,tech.hierarchy_level_name,
            tech.hierarchy_value_id,tech.hierarchy_value_name
        FROM price_promo.tb_event_customer_hierarchy tech
        where event_id = p_event_id;


        insert into price_promo.tb_promo_customers
            (promo_id,customer_id,customer_name)
        select 
            p_promo_id,cm.customer_id,cm.customer_name
        from price_promo.tb_event_customers tec
        inner join global.customer_master cm
        on tec.customer_id=cm.customer_id
        where tec.event_id = p_event_id;

    end if;
   

END;
$$ LANGUAGE plpgsql;
