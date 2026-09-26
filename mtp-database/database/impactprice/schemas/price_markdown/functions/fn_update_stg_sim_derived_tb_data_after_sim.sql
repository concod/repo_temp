--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_update_stg_sim_derived_tb_data_after_sim_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: discount level fn changes

DROP FUNCTION if exists price_markdown.fn_update_stg_sim_derived_tb_data_after_sim;
CREATE OR REPLACE FUNCTION price_markdown.fn_update_stg_sim_derived_tb_data_after_sim(
    p_strategy_id int,
    p_min_updated_discount_id bigint,
    p_max_updated_discount_id bigint
)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    _total_sku_store_count int;
    _affected_sku_store_count int;
    _affected_levels jsonb;
BEGIN

    select count(*) into _total_sku_store_count from (
        select distinct product_level_id, store_level_id
        from price_markdown.tb_strategy_sku_store_mapping
        where strategy_id = p_strategy_id
    ) s;

    -- Determine affected product/store combos from tb_strategy_discount_level ID range
    select count(*), jsonb_agg(jsonb_build_object('product_level_id', product_level_id, 'store_level_id', store_level_id))
    into _affected_sku_store_count, _affected_levels
    from (
        select distinct product_level_id, store_level_id
        from price_markdown.tb_strategy_discount_level
        where strategy_id = p_strategy_id
          and id between p_min_updated_discount_id and p_max_updated_discount_id
    ) s;

    if _affected_sku_store_count > 0 and _affected_sku_store_count * 2 < _total_sku_store_count then
        -- Partial refresh: only re-compute affected product/store combos
        perform price_markdown.fn_update_strategy_simulation_derived_table_data(
            p_strategy_id,
            _affected_levels
        );
    else
        -- Full refresh via v4
        perform price_markdown.fn_populate_step4_data_v4(p_strategy_id);
    end if;
end;
$function$
;
