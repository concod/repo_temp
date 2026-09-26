--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_update_stg_sim_derived_tb_data_after_sim runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_update_stg_sim_derived_tb_data_after_sim 

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
BEGIN

    select count(*) into _total_sku_store_count from (
        select distinct product_level_id,store_level_id
        from price_markdown.tb_strategy_sku_store_mapping
        where strategy_id = p_strategy_id
    ) s;

    if (select count(*) from (select distinct product_level_id,store_level_id from price_markdown.tb_strategy_discount 
        where strategy_id = p_strategy_id and id between p_min_updated_discount_id and p_max_updated_discount_id ) s
    )*2<_total_sku_store_count then
        perform price_markdown.fn_update_strategy_simulation_derived_table_data(
            p_strategy_id,
            (
                select  
                    jsonb_agg(
                        jsonb_build_object(
                            'product_level_id',product_level_id,
                            'store_level_id',store_level_id
                        )
                    )
                from (
                    select
                    distinct
                        product_level_id,
                        store_level_id
                    from price_markdown.tb_strategy_discount
                    where id between p_min_updated_discount_id and p_max_updated_discount_id
                ) s
            )
        );
    else 
        perform price_markdown.fn_populate_step4_data(p_strategy_id);
    end if;
end;
$function$
;
