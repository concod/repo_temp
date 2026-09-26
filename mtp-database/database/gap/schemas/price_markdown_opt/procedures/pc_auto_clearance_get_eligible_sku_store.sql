--liquibase formatted sql
--changeset liquibase:surya.avinash@impactanalytics.com: pc_auto_clearance_get_eligible_sku_store runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_auto_clearance_get_eligible_sku_store

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_auto_clearance_get_eligible_sku_store();

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_auto_clearance_get_eligible_sku_store(_trigger_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
declare
_product_trigger_level_col text;
_store_trigger_level_col text;
_insert_eligible_sku_store_query text;
_get_trigger_sku_store_temp_query text;
_sku_store_data_query text;
_start_time text;
_final_query text;
_sku_count integer;
begin
    _start_time := to_char(clock_timestamp(), 'YYYYMMDD_HH24MISSMS');
    raise notice 'start time : %', _start_time;
    
    select * from price_markdown_opt.fn_clearance_trigger_get_trigger_level(_trigger_id) into _product_trigger_level_col, _store_trigger_level_col;
    raise notice '_product_trigger_level_col := %, _store_trigger_level_col := %', _product_trigger_level_col, _store_trigger_level_col;

    _get_trigger_sku_store_temp_query = FORMAT('CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_clearance_trigger_sku_store_mapping_%2$s_%1$s as 
    with skus as
            (
            select trigger_id, product_id, 
            %3$s as product_trigger_level_id, max(hierarchy_level_id) as max_product_hierarchy_level
            from price_markdown.product_master pm, 
                    (select trigger_id, hierarchy_level, hierarchy_level_id 
                    from price_markdown.tb_clearance_trigger_product_hierarchies
                    where trigger_id = %2$s
                    ) b
            where (hierarchy_level = 0 and l0_cid = hierarchy_level_id)
            or (hierarchy_level = 1 and l1_cid = hierarchy_level_id)
            or (hierarchy_level = 2 and l2_cid = hierarchy_level_id)
            or (hierarchy_level = 3 and l3_cid = hierarchy_level_id)
            or (hierarchy_level = 4 and l4_cid = hierarchy_level_id)
            or (hierarchy_level = 5 and l5_cid = hierarchy_level_id)
            and is_active = 1
      group by 1,2,3
            ),
            stores as
            (
            select distinct trigger_id, store_id, 
            %4$s as store_trigger_level_id
            from price_markdown.tb_store_master sm, 
                    (select trigger_id, hierarchy_level, hierarchy_level_id
                    from price_markdown.tb_clearance_trigger_store_hierarchies
                    where trigger_id = %2$s
                    ) b
            where (hierarchy_level = 0 and s0_id = hierarchy_level_id)
            or (hierarchy_level = 1 and s1_id = hierarchy_level_id)
            )
            select distinct skus.trigger_id, product_id, product_trigger_level_id, store_id, store_trigger_level_id,
      max_product_hierarchy_level
            from skus, stores;', _start_time, _trigger_id, _product_trigger_level_col, _store_trigger_level_col);
    raise notice '_get_trigger_sku_store_temp_query :  %', _get_trigger_sku_store_temp_query;
    execute _get_trigger_sku_store_temp_query;


    _sku_store_data_query = format('CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_clearance_trigger_sku_store_data_%2$s_%1$s as
                                    with base as
                                    (
                                        select trigger_id, product_id, product_trigger_level_id, store_id, store_trigger_level_id,
                                        max_product_hierarchy_level, coalesce(total_inventory, 0) total_inventory, coalesce(age,0) age
                                        from price_markdown_opt_temp.tb_clearance_trigger_sku_store_mapping_%2$s_%1$s a
                                        left join (select product_id, store_id, total_inventory, age, clearance_eligible 
                                                    from global.tb_latest_inventory) b
                                        using(product_id, store_id)
                                        where b.clearance_eligible = 1
                                    )
                                    select a.trigger_id,
                                        a.product_id,
                                        a.product_trigger_level_id,
                                        a.store_id,
                                        a.store_trigger_level_id,
                                        a.max_product_hierarchy_level,
                                        a.total_inventory,
                                        a.age
                                    from base a
                                    group by 1,2,3,4,5,6,7,8;
                                    ', _start_time, _trigger_id);
    raise notice '_sku_store_data_query :  %', _sku_store_data_query;
    execute _sku_store_data_query;    
            
           

 _final_query :=    format('create unlogged table price_markdown_opt_temp.tb_clearance_trigger_temp_eligible_sku_store_%2$s_%1$s as
                            with inv_data as
                            (
                            select trigger_id, product_trigger_level_id, store_trigger_level_id,
                            sum(total_inventory) as inv,
                            case when sum(total_inventory) <= 0 then avg(age) 
                            else (sum(total_inventory * age)/sum(total_inventory)) end as age
                            from price_markdown_opt_temp.tb_clearance_trigger_sku_store_data_%2$s_%1$s
                            group by 1,2,3
                            ),
                            cte_1 as
                            (
                            select trigger_id, product_trigger_level_id, store_trigger_level_id,
                            sum(gross_quantity) as units, sum(gross_quantity) as avg_sales, 1 as timeframe_value
                            from price_markdown_opt.tb_transaction_latest_mkd
                            join price_markdown_opt_temp.tb_clearance_trigger_sku_store_data_%2$s_%1$s
                            using(product_id, store_id)
                            where date_id between current_date - interval ''1 week'' and current_date
                            group by 1,2,3
                            ), 
                            cte_2 as
                            (
                            select trigger_id, product_trigger_level_id, store_trigger_level_id,
                            sum(gross_quantity) as units, sum(gross_quantity)/2 as avg_sales, 2 as timeframe_value
                            from price_markdown_opt.tb_transaction_latest_mkd
                            join price_markdown_opt_temp.tb_clearance_trigger_sku_store_data_%2$s_%1$s
                            using(product_id, store_id)
                            where date_id between current_date - interval ''2 week'' and current_date
                            group by 1,2,3
                            ),
                            cte_4 as
                            (
                            select trigger_id, product_trigger_level_id, store_trigger_level_id,
                            sum(gross_quantity) as units, sum(gross_quantity)/4 as avg_sales, 4 as timeframe_value
                            from price_markdown_opt.tb_transaction_latest_mkd
                            join price_markdown_opt_temp.tb_clearance_trigger_sku_store_data_%2$s_%1$s
                            using(product_id, store_id)
                            where date_id between current_date - interval ''4 week'' and current_date
                            group by 1,2,3
                            ),
                            base as
                            (
                            select trigger_id, metric_name, threshold_value_1, threshold_value_2, logical_operator, operator_name, timeframe_value 
                            from price_markdown.tb_clearance_trigger_conditions_mapping tctcm 
                            join price_markdown.tb_clearance_trigger_metric_config tctmc 
                            using(metric_id)
                            join price_markdown.tb_clearance_trigger_timeframe_config tcttc 
                            using(timeframe_id)
                            join price_markdown.tb_clearance_trigger_operator_config tctoc 
                            using(operator_id)
                            where trigger_id = %2$s
                            ),
                            metrics_base as
                            (
                            select base.trigger_id, inv_data.product_trigger_level_id, inv_data.store_trigger_level_id,
                            inv, age,
                            coalesce(cte_1.units, cte_2.units, cte_4.units) as units, 
                            coalesce(cte_1.avg_sales, cte_2.avg_sales, cte_4.avg_sales) as avg_sales,
                            metric_name, threshold_value_1, threshold_value_2, logical_operator, operator_name, timeframe_value
                            from base
                            join inv_data
                            using(trigger_id)
                            left join cte_1 using(product_trigger_level_id, store_trigger_level_id, timeframe_value)
                            left join cte_2 using(product_trigger_level_id, store_trigger_level_id, timeframe_value)
                            left join cte_4 using(product_trigger_level_id, store_trigger_level_id, timeframe_value)
                            ),
                            metrics as
                            (
                            select *, case when metric_name = ''units'' then units
                                        when metric_name = ''Age of the inventory'' then age
                                        when metric_name = ''Sell Through'' then coalesce(units * 100/nullif((units + inv), 0),0)
                                        when metric_name = ''WOS (Weeks of Supply)'' then coalesce(inv/nullif(avg_sales, 0),0) 
                                        else avg_sales end as metric_value
                            from metrics_base
                            ),
                            final as
                            (
                            select trigger_id, product_trigger_level_id, store_trigger_level_id, logical_operator,
                            concat(logical_operator, '' '', metric_value, '' '', operator_name, '' '', threshold_value_1, case when operator_name = ''Between'' then concat('' AND'', '' '', threshold_value_2) else '''' end) as condition_chk
                            from metrics
                            ),
                            final_base as
                            (
                            select *, case when 
                                    (select * from price_markdown_opt.fn_custom_alerts_condition_check(trigger_condition_chk)) 
                                        then 1 else 0 end as trigger_eligible_flag
                                from
                            (
                            select trigger_id, product_trigger_level_id, store_trigger_level_id, 
                            string_agg(condition_chk, '' '' order by logical_operator desc) as trigger_condition_chk
                            from final
                            group by 1,2,3
                            ) b
                            )
                            select trigger_id, product_id, product_trigger_level_id, store_id, store_trigger_level_id, max_product_hierarchy_level
                            from price_markdown_opt_temp.tb_clearance_trigger_sku_store_data_%2$s_%1$s a
                            join (select product_trigger_level_id, store_trigger_level_id from final_base
                                    where trigger_eligible_flag = 1) b
                            using(product_trigger_level_id, store_trigger_level_id);
', _start_time, _trigger_id);

    raise notice '_final_query : %', _final_query;
    execute _final_query;
    
    _insert_eligible_sku_store_query := format('Create table if not exists price_markdown.tb_clearance_trigger_eligible_sku_stores_%2$s 
                                                partition of price_markdown.tb_clearance_trigger_eligible_sku_stores
                                                for values in (%2$s);

                        delete from price_markdown.tb_clearance_trigger_eligible_sku_stores_%2$s;

                                                insert into price_markdown.tb_clearance_trigger_eligible_sku_stores_%2$s
                                                select trigger_id, product_id, store_id,
                                                0 as created_by, now() as created_at,
                                                0 as updated_by, now() as updated_at,
                                                max_product_hierarchy_level
                                                from price_markdown_opt_temp.tb_clearance_trigger_temp_eligible_sku_store_%2$s_%1$s;
                                                ', _start_time, _trigger_id);
    raise notice '_insert_eligible_sku_store_query : %', _insert_eligible_sku_store_query;
    execute _insert_eligible_sku_store_query;
 
END;
$$
;
