--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_insert_products_for_promo_based_on_event runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_insert_products_for_promo_based_on_event

drop function if exists price_promo.fn_insert_products_for_promo_based_on_event;
CREATE OR REPLACE FUNCTION price_promo.fn_insert_products_for_promo_based_on_event(
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

    PERFORM price_promo.fn_create_promo_product_partition_table(p_promo_id);
    if _event_record.product_inclusion_type = 'whole_category' then

        insert into price_promo.included_product_hierarchy (
            promo_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name
        )
        SELECT
            p_promo_id,ieph.hierarchy_level_id,ieph.hierarchy_level_name,
            ieph.hierarchy_value_id,ieph.hierarchy_value_name
        FROM price_promo.included_event_product_hierarchy ieph
        where event_id = p_event_id;

    elsif _event_record.product_inclusion_type = 'specific_products' then

        insert into price_promo.included_products (
            promo_id, product_id, product_name
        )
        select
            p_promo_id,pm.product_id,pm.product_name
        from price_promo.included_event_products iep
        inner join price_promo.product_master pm
        on iep.product_id=pm.product_id
        where event_id = p_event_id;

    elsif _event_record.product_inclusion_type = 'product_group' then

        INSERT INTO price_promo.included_promo_product_groups (
            promo_id, product_group_id, product_group_name
        )
        SELECT 
            p_promo_id,
            product_group_id,
            tpg.pg_name
        FROM price_promo.included_event_product_groups iepg
        inner join pricesmart.tb_product_group tpg
        on tpg.pg_id = iepg.product_group_id
        where event_id = p_event_id;

    end if;
   

END;
$$ LANGUAGE plpgsql;
