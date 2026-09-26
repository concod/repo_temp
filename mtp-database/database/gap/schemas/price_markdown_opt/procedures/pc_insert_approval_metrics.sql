--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_insert_approval_metrics_31122025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: pc_insert_approval_metrics_4

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_insert_approval_metrics(int4, _int4);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_insert_approval_metrics(IN _strategy_id integer, IN _product_level_id integer[] DEFAULT NULL::integer[], IN _store_level_id integer[] DEFAULT NULL::integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
    declare _is_there integer;
               delete_query text;
               inv_table text;
               products_base_table text;
               inv_base_table text;
               temp_table_1 text;
               ia_temp_table text;
               fin_temp_table text;
               base_temp_table text;
               final_temp_table text;
               temp_table_1_idx text;
               ia_temp_table_idx text;
               fin_temp_table_idx text;
               base_temp_table_idx text;
               insert_query text;
               _start_time text;
               _formatted_where_clause text;   
               _formatted_product_level_id_clause text;
               _formatted_store_level_id_clause text;
begin
    if _product_level_id is null then 
    _formatted_product_level_id_clause = 'true';
    else
    _formatted_product_level_id_clause = FORMAT('product_level_id in (%s)', array_to_string(_product_level_id, ','));
    end if;
    
    if _store_level_id is null then 
    _formatted_store_level_id_clause = 'true';
    else
    _formatted_store_level_id_clause = FORMAT('store_level_id in (%s)', array_to_string(_store_level_id, ','));
    end if;

    _formatted_where_clause = FORMAT('where %s and %s', _formatted_product_level_id_clause, _formatted_store_level_id_clause);
        raise notice '_formatted_where_clause : %', _formatted_where_clause;
        delete_query = format('delete from price_markdown.tb_approval_metrics
                        where strategy_id = %1$s
                        and %2$s
                        and %3$s;',  _strategy_id, _formatted_product_level_id_clause, _formatted_store_level_id_clause);
        raise notice 'Deleted the data from tb_approval_metrics';
        execute delete_query;

        _start_time = to_char(clock_timestamp(), 'YYYYMMDD_HH24MISSMS');

        temp_table_1 = FORMAT('create unlogged table price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s
                        as
                        (
                        select sd.strategy_id, sd.product_level_id, sd.store_level_id, sd.pcd_id, pcd_start_date, pcd_end_date, sd.channel_info,
                        approval_status as status, sd.markdown_type as fin_markdown_type, sd.average_retail_price, sdi.markdown_type as ia_markdown_type, action_status,
                        sd.markdown_percentage as fin_discount, sdi.markdown_percentage as ia_discount, pcd_number,
                        coalesce(lag(sdi.markdown_type) over (partition by product_level_id, sd.store_level_id order by pcd_start_date), ''REGULAR PRICE'') as ia_previous_markdown_type,
                        coalesce(lag(sd.markdown_type) over (partition by product_level_id, sd.store_level_id order by pcd_start_date), ''REGULAR PRICE'') as fin_previous_markdown_type,
                        sd.currency_id, sd.average_retail_price_with_vat
                        from price_markdown.tb_strategy_discount_%1$s sd
                        left join price_markdown.tb_strategy_discount_ia_%1$s sdi
                        using(product_level_id, store_level_id, pcd_id)
                        join (select pcd_id, pcd_start_date, pcd_end_date, dense_rank() over (partition by strategy_id order by pcd_start_date) pcd_number
                        from price_markdown.tb_strategy_pcd
                        where strategy_id = %1$s) sp
                        using(pcd_id)
                        %3$s
                        )', _strategy_id, _start_time, _formatted_where_clause);
        raise notice 'temp_table_1 query : %', temp_table_1;
        execute temp_table_1;
        temp_table_1_idx = FORMAT('
        CREATE INDEX idx_stg_pcd_temp_%1$s_%2$s
        ON price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s (strategy_id, product_level_id, pcd_id, store_level_id);', _strategy_id, _start_time);
        raise notice 'temp_table_1_idx : %', temp_table_1_idx;
        execute temp_table_1_idx;
inv_table = FORMAT('Create unlogged table price_markdown_opt_temp.inv_temp_%1$s_%2$s
                            as
                            (select product_level_id, store_level_id, channel_info, pm.currency_id,
                            count(distinct tli.store_id) as stores_with_inventory, sum(total_inventory) as inv,
                            CASE WHEN SUM(total_inventory) > 0 THEN (SUM(pm.msrp * total_inventory) / SUM(total_inventory))
                                                                   ELSE AVG(pm.msrp) END as retail_price,
                            CASE WHEN SUM(total_inventory) > 0 THEN (SUM(pm.msrp_with_vat * total_inventory) / SUM(total_inventory))
                                                                   ELSE AVG(pm.msrp_with_vat) END as retail_price_with_vat
                                from global.tb_latest_inventory tli
                                inner join price_markdown.tb_strategy_sku_store_mapping_%1$s tsssm
                                on tli.product_id = tsssm.product_id
                                and tli.store_id = tsssm.store_id
                                inner join (select product_id, currency_id, msrp, msrp_with_vat 
                                from price_markdown.product_master) pm
                                on tsssm.product_id = pm.product_id
                                %3$s
                                group by 1,2,3,4)', _strategy_id, _start_time, _formatted_where_clause);
        raise notice 'inv table : %', inv_table;
        execute inv_table;

        products_base_table = FORMAT('Create unlogged table price_markdown_opt_temp.approval_prod_base_temp_%1$s_%2$s
                            as
                            (select strategy_id, pm.currency_id, product_level_id, channel_info, store_level_id,
                            array_agg(distinct l2_cuq) as dept,
                            array_agg(distinct l2_cuq) as sub_dept,
                            array_agg(distinct l0_name) as mfg,
                            array_agg(distinct l3_cuq) as class,
                            array_agg(distinct l0_name) as brand,
                            round(avg(pm.msrp::numeric),2) as base_price, avg(pm.cost) as cost,
                            case when channel_info = ''Omni'' then avg(max_age)
                                    when channel_info = ''Store'' then avg(store_age)
                                    else avg(ecom_age) end as age,
                            round(avg(pm.msrp_with_vat::numeric),2) as base_price_with_vat
                                from price_markdown.tb_strategy_sku_store_mapping_%1$s tsssm
                                inner join (select product_id, currency_id, l0_name, l1_cuq, l2_cuq, l3_cuq, cost, msrp, 
                                        coalesce(store_age, 0) store_age, coalesce(ecom_age, 0) ecom_age,
                                        coalesce(max_age, 0) as max_age, msrp_with_vat 
                                        from price_markdown.product_master) pm
                                on tsssm.product_id = pm.product_id
                                %3$s
                                group by 1,2,3,4,5)', _strategy_id, _start_time, _formatted_where_clause);
        raise notice 'products_base_table : %', products_base_table;
        execute products_base_table;

    inv_base_table = FORMAT('create unlogged table price_markdown_opt_temp.approval_inv_base_temp_%1$s_%2$s
                            as
                            (select product_level_id, pcd_id, spt.store_level_id, sum(coalesce(ia.inv,0)) as ia_inv, sum(coalesce(fin.inv,0)) as fin_inv
                            from
                            price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s spt
                            left join
                            (select product_level_id, store_level_id, pcd_id, coalesce(min(rem_inv) + sum(sales_units),0) as inv
                            from price_markdown.tb_agg_ia_%1$s group by 1,2,3) ia
                            using(product_level_id, store_level_id, pcd_id)
                            left join
                            (select product_level_id, store_level_id, pcd_id, coalesce(min(rem_inv) + sum(sales_units),0) as inv
                            from price_markdown.tb_agg_fin_%1$s group by 1,2,3) fin
                            using(product_level_id, store_level_id, pcd_id)
                            group by 1,2,3)', _strategy_id, _start_time);
        raise notice 'inv_base_table : %', inv_base_table;
        execute inv_base_table;

    ia_temp_table = FORMAT('create unlogged table price_markdown_opt_temp.ia_metrics_temp_%1$s_%2$s as
                            select *,
                            coalesce(lag(ia_discount) over (partition by product_level_id, store_level_id order by pcd_start_date),0) as ia_previous_discount,
                            coalesce(lag(ia_pcd_price) over (partition by product_level_id, store_level_id order by pcd_start_date), retail_price) as ia_previous_pcd_price,
                            coalesce(lag(ia_pcd_price_with_vat) over (partition by product_level_id, store_level_id order by pcd_start_date), retail_price_with_vat) as ia_previous_pcd_price_with_vat
                            from
                                (select sp.strategy_id, sp.currency_id, sp.product_level_id, sp.pcd_id, sp.store_level_id, sp.channel_info, sp.pcd_start_date,
                                avg(retail_price) as retail_price,
                                coalesce(CASE WHEN SUM(inv) > 0 THEN (SUM(effective_price_point * inv) / SUM(inv))
                                                                   ELSE AVG(effective_price_point) END,
                                                                   AVG(average_retail_price*(100-ia_discount)/100)) as ia_pcd_price,
                                coalesce(sum(sales_units),0) as ia_units,
                                coalesce(sum(revenue),0) as ia_revenue,
                                coalesce(sum(margin),0) as ia_margin,
                                coalesce(sum(spend),0) as ia_markdown_spend,
                                coalesce(min(rem_inv) + sum(sales_units),0) as ia_inventory,
                                array_agg(distinct ia_markdown_type) ia_markdown_type,
                                array_agg(distinct ia_previous_markdown_type) ia_previous_markdown_type,
                                case when sum(inv) > 0 then sum(ia_discount*inv)/sum(inv)
                                        else avg(ia_discount) end as ia_discount,
                                avg(retail_price_with_vat) as retail_price_with_vat,
                                coalesce(CASE WHEN SUM(inv) > 0 THEN (SUM(effective_price_point_with_vat * inv) / SUM(inv))
                                                                    ELSE AVG(effective_price_point_with_vat) END,
                                                                    AVG(average_retail_price_with_vat*(100-ia_discount)/100)) as ia_pcd_price_with_vat,
                                coalesce(sum(revenue_with_vat),0) as ia_revenue_with_vat,
                                coalesce(sum(margin_with_vat),0) as ia_margin_with_vat,
                                coalesce(sum(spend_with_vat),0) as ia_markdown_spend_with_vat
                                from (
                                    select strategy_id, currency_id, channel_info, product_level_id, store_level_id, pcd_id, pcd_start_date, ia_discount,
                                    ia_markdown_type, ia_previous_markdown_type, average_retail_price, average_retail_price_with_vat from price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s) sp
                                    left join price_markdown.tb_agg_ia_%1$s
                                    using(product_level_id, store_level_id, pcd_id)
                                left join price_markdown_opt_temp.inv_temp_%1$s_%2$s i
                                on sp.product_level_id = i.product_level_id
                                and sp.store_level_id = i.store_level_id
                                group by 1,2,3,4,5,6,7) ia_m', _strategy_id, _start_time);
    raise notice 'ia_temp_table created : %', ia_temp_table;
    execute ia_temp_table;
    ia_temp_table_idx = FORMAT('
        CREATE INDEX idx_ia_metrics_temp_%1$s_%2$s
        ON price_markdown_opt_temp.ia_metrics_temp_%1$s_%2$s (strategy_id, product_level_id, pcd_id, store_level_id);', _strategy_id, _start_time);
    raise notice 'ia_temp_table_idx : %', ia_temp_table_idx;
    execute ia_temp_table_idx;
fin_temp_table = FORMAT('create unlogged table price_markdown_opt_temp.fin_metrics_temp_%1$s_%2$s
                            as
                            select *,
                            coalesce(lag(fin_discount) over (partition by product_level_id, store_level_id order by pcd_start_date),0) as fin_previous_discount,
                            coalesce(lag(fin_pcd_price) over (partition by product_level_id, store_level_id order by pcd_start_date), retail_price) as fin_previous_pcd_price,
                            coalesce(lag(fin_pcd_price_with_vat) over (partition by product_level_id, store_level_id order by pcd_start_date), retail_price_with_vat) as fin_previous_pcd_price_with_vat
                            from
                                (select sp.strategy_id, sp.currency_id, sp.product_level_id, sp.pcd_id, sp.store_level_id, sp.channel_info, sp.pcd_start_date,
                                avg(retail_price) as retail_price,
                                coalesce(CASE WHEN SUM(sales_units) > 0 THEN (SUM(effective_price_point * sales_units) / SUM(sales_units))
                                                                    ELSE AVG(effective_price_point) END,
                                                                    AVG(average_retail_price*(100-fin_discount)/100)) as fin_pcd_price,
                                coalesce(sum(sales_units),0) as fin_units,
                                coalesce(sum(revenue),0) as fin_revenue,
                                coalesce(sum(margin),0) as fin_margin,
                                coalesce(sum(spend),0) as fin_markdown_spend,
                                coalesce(min(rem_inv) + sum(sales_units),0) as fin_inventory,
                                array_agg(distinct fin_markdown_type) fin_markdown_type,
                                array_agg(distinct fin_previous_markdown_type) fin_previous_markdown_type,
                                case when sum(inv) > 0 then sum(fin_discount*inv)/sum(inv)
                                    else avg(fin_discount) end as fin_discount,
                                avg(retail_price_with_vat) as retail_price_with_vat,
                                coalesce(CASE WHEN SUM(sales_units) > 0 THEN (SUM(effective_price_point_with_vat * sales_units) / SUM(sales_units))
                                                                    ELSE AVG(effective_price_point_with_vat) END,
                                                                    AVG(average_retail_price_with_vat*(100-fin_discount)/100)) as fin_pcd_price_with_vat,
                                coalesce(sum(revenue_with_vat),0) as fin_revenue_with_vat,
                                coalesce(sum(margin_with_vat),0) as fin_margin_with_vat,
                                coalesce(sum(spend_with_vat),0) as fin_markdown_spend_with_vat
                                from (
                                    select strategy_id, currency_id, channel_info, product_level_id, store_level_id, pcd_id, pcd_start_date, fin_discount,
                                    fin_markdown_type, fin_previous_markdown_type, average_retail_price, average_retail_price_with_vat from price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s) sp
                                    left join price_markdown.tb_agg_fin_%1$s
                                    using(product_level_id, store_level_id, pcd_id)
                                left join price_markdown_opt_temp.inv_temp_%1$s_%2$s i
                                on sp.product_level_id = i.product_level_id
                                and sp.store_level_id = i.store_level_id
                                group by 1,2,3,4,5,6,7) fin_m', _strategy_id, _start_time);
    raise notice 'fin_temp_table created : %', fin_temp_table;
    execute fin_temp_table;
    fin_temp_table_idx = FORMAT('
        CREATE INDEX idx_fin_metrics_temp_%1$s_%2$s
        ON price_markdown_opt_temp.fin_metrics_temp_%1$s_%2$s (strategy_id, product_level_id, pcd_id, store_level_id);', _strategy_id, _start_time);
    raise notice 'fin_temp_table_idx : %', fin_temp_table_idx;
    execute fin_temp_table_idx;

    base_temp_table = FORMAT('create unlogged table price_markdown_opt_temp.base_temp_%1$s_%2$s
                            as
                                (select strategy_id, a.currency_id, product_level_id, pcd_id, a.pcd_start_date, pcd_end_date, store_level_id, fin.channel_info, pcd_number,
                                status, action_status, stores_with_inventory,
                                ia.ia_markdown_type,
                                fin.fin_markdown_type,
                                ia.ia_discount,
                                fin.fin_discount,
                                ia.ia_pcd_price,
                                fin.fin_pcd_price,
                                ia_units,
                                fin_units,
                                ia_revenue,
                                fin_revenue,
                                ia_margin,
                                fin_margin,
                                ia_markdown_spend,
                                fin_markdown_spend,
                                ia_inventory,
                                fin_inventory,
                                ia_previous_discount, fin_previous_discount,
                                ia_previous_markdown_type,
                                fin_previous_markdown_type,
                                ia_previous_pcd_price, fin_previous_pcd_price,
                                ia.ia_pcd_price_with_vat, fin.fin_pcd_price_with_vat,
                                ia_revenue_with_vat, fin_revenue_with_vat,
                                ia_margin_with_vat, fin_margin_with_vat,
                                ia_markdown_spend_with_vat, fin_markdown_spend_with_vat,
                                ia_previous_pcd_price_with_vat, fin_previous_pcd_price_with_vat
                                from (select distinct strategy_id, currency_id, product_level_id, pcd_id, pcd_start_date, pcd_end_date, store_level_id, pcd_number,
                                status, action_status from price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s
                                where status != ''Not Approved'') a
                                join price_markdown_opt_temp.fin_metrics_temp_%1$s_%2$s fin
                                using(strategy_id, product_level_id, pcd_id, store_level_id)
                                left join price_markdown_opt_temp.ia_metrics_temp_%1$s_%2$s ia
                                using(strategy_id, product_level_id, pcd_id, store_level_id)
                                left join (select product_level_id, store_level_id, sum(stores_with_inventory) stores_with_inventory
                                            from price_markdown_opt_temp.inv_temp_%1$s_%2$s group by 1,2) i
                                using(product_level_id, store_level_id)
                                )', _strategy_id, _start_time);
    raise notice 'base_temp_table : %', base_temp_table;
    execute base_temp_table;
    raise notice 'base temp table created';
    base_temp_table_idx = FORMAT('
        CREATE INDEX idx_base_temp_%1$s_%2$s
        ON price_markdown_opt_temp.base_temp_%1$s_%2$s (strategy_id, product_level_id, pcd_id, store_level_id);', _strategy_id, _start_time);
    raise notice 'base_temp_table_idx : %', base_temp_table_idx;
    execute base_temp_table_idx;
final_temp_table = FORMAT('create unlogged table price_markdown_opt_temp.approval_final_temp_%1$s_%2$s
                            as
                                (select strategy_id, product_level_id, pcd_id, pcd_start_date, pcd_end_date, store_level_id, bt.channel_info, pcd_number,
                                status, action_status, stores_with_inventory,
                                ia_markdown_type,
                                fin_markdown_type,
                                ia_discount,
                                fin_discount,
                                ia_pcd_price,
                                fin_pcd_price,
                                ia_units,
                                fin_units,
                                ia_revenue,
                                fin_revenue,
                                ia_margin,
                                fin_margin,
                                ia_markdown_spend,
                                fin_markdown_spend,
                                ia_inv as ia_inventory,
                                fin_inv as fin_inventory,
                                ia_previous_discount, fin_previous_discount,
                                ia_previous_markdown_type,
                                fin_previous_markdown_type,
                                ia_previous_pcd_price, fin_previous_pcd_price,
                                dept, sub_dept, class, brand, mfg, base_price, (ia_inventory*cost) as ia_inventory_cost, (fin_inventory*cost) as fin_inventory_cost,
                                round(age) as age,
                                bt.currency_id,
                                ia_pcd_price_with_vat, fin_pcd_price_with_vat,
                                ia_revenue_with_vat, fin_revenue_with_vat,
                                ia_margin_with_vat, fin_margin_with_vat,
                                ia_markdown_spend_with_vat, fin_markdown_spend_with_vat,
                                ia_previous_pcd_price_with_vat, fin_previous_pcd_price_with_vat,
                                base_price_with_vat
                                from price_markdown_opt_temp.base_temp_%1$s_%2$s bt
                                join price_markdown_opt_temp.approval_prod_base_temp_%1$s_%2$s
                                using(strategy_id, product_level_id, store_level_id)
                                join price_markdown_opt_temp.approval_inv_base_temp_%1$s_%2$s
                                using(product_level_id, pcd_id, store_level_id)
                                )', _strategy_id, _start_time);
    raise notice 'base_temp_table : %', final_temp_table;
    execute final_temp_table;
    insert_query = FORMAT(' insert into price_markdown.tb_approval_metrics_%1$s
                            (select strategy_id, product_level_id, pcd_id, pcd_start_date, pcd_end_date,
                            channel_info, ia_markdown_type, fin_markdown_type, stores_with_inventory,
                            status, ia_discount, fin_discount, ia_previous_discount, fin_previous_discount,
                            ia_pcd_price, fin_pcd_price,
                            case when ia_previous_discount = 100 or ia_discount = ia_previous_discount then 0 else
                            (ia_discount-ia_previous_discount)*100/(100-ia_previous_discount) end as ia_incremental_discount,
                            case when fin_previous_discount = 100 or fin_discount = fin_previous_discount then 0 else
                            (fin_discount-fin_previous_discount)*100/(100-fin_previous_discount) end as fin_incremental_discount,
                            ia_previous_pcd_price, fin_previous_pcd_price,
                            ia_units, fin_units, ia_revenue, fin_revenue, ia_margin, fin_margin,
                            coalesce(ia_margin/nullif(ia_revenue,0),0)*100 as ia_gm_percent,
                            coalesce(fin_margin/nullif(fin_revenue,0),0)*100 as fin_gm_percent,
                            coalesce(ia_units/nullif(ia_inventory,0),0)*100 as ia_sellthrough,
                            coalesce(fin_units/nullif(fin_inventory,0),0)*100 as fin_sellthrough,
                            coalesce(ia_margin/nullif(ia_units,0),0) as ia_aum,
                            coalesce(fin_margin/nullif(fin_units,0),0) as fin_aum,
                            ia_markdown_spend, fin_markdown_spend, ia_inventory, fin_inventory, action_status, ia_previous_markdown_type,
                            fin_previous_markdown_type, pcd_number,
                            dept, class, brand, mfg, base_price, ia_inventory_cost, fin_inventory_cost, current_timestamp as updated_at, age,
                            currency_id, ia_pcd_price_with_vat, fin_pcd_price_with_vat, ia_previous_pcd_price_with_vat, fin_previous_pcd_price_with_vat,
                            ia_revenue_with_vat, fin_revenue_with_vat, ia_margin_with_vat, fin_margin_with_vat,
                            coalesce(ia_margin_with_vat/nullif(ia_units,0),0) as ia_aum_with_vat, 
                            coalesce(fin_margin_with_vat/nullif(fin_units,0),0) as fin_aum_with_vat,
                            ia_markdown_spend_with_vat, fin_markdown_spend_with_vat,
                            base_price_with_vat, sub_dept, store_level_id
                            from price_markdown_opt_temp.approval_final_temp_%1$s_%2$s)', _strategy_id, _start_time);
    raise notice 'inserted into approval metrics : %', insert_query;
    execute insert_query;

    execute FORMAT('drop table if exists price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s', _strategy_id, _start_time);
    execute FORMAT('drop table if exists price_markdown_opt_temp.approval_prod_base_temp_%1$s_%2$s', _strategy_id, _start_time);
    execute FORMAT('drop table if exists price_markdown_opt_temp.approval_inv_base_temp_%1$s_%2$s', _strategy_id, _start_time);
    execute FORMAT('drop table if exists price_markdown_opt_temp.ia_metrics_temp_%1$s_%2$s', _strategy_id, _start_time);
    execute FORMAT('drop table if exists price_markdown_opt_temp.fin_metrics_temp_%1$s_%2$s', _strategy_id, _start_time);
    execute FORMAT('drop table if exists price_markdown_opt_temp.base_temp_%1$s_%2$s', _strategy_id, _start_time);
    execute FORMAT('drop table if exists price_markdown_opt_temp.inv_temp_%1$s_%2$s', _strategy_id, _start_time);
    execute FORMAT('drop index if exists price_markdown_opt_temp.idx_stg_pcd_temp_%1$s_%2$s', _strategy_id, _start_time);
    execute FORMAT('drop index if exists price_markdown_opt_temp.idx_ia_metrics_temp_%1$s_%2$s', _strategy_id, _start_time);
    execute FORMAT('drop index if exists price_markdown_opt_temp.idx_fin_metrics_temp_%1$s_%2$s', _strategy_id, _start_time);
    execute FORMAT('drop index if exists price_markdown_opt_temp.idx_base_temp_%1$s_%2$s', _strategy_id, _start_time);
    execute FORMAT('drop table if exists price_markdown_opt_temp.approval_final_temp_%1$s_%2$s', _strategy_id, _start_time);

    raise notice 'Dropped all temp tables';

end;
$procedure$
;