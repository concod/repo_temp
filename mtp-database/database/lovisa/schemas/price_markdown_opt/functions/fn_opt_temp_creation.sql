--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:fn_opt_temp_creation_26112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: store split changes for fn_opt_temp_creation

DROP FUNCTION IF EXISTS price_markdown_opt.fn_opt_temp_creation(int4, text, date, date, date, date);

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_opt_temp_creation(in_strategy_id integer, _inv_table text, vl_pcd_start_date date, vl_pcd_end_date date, sim_start_date date, sim_end_date date)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    DECLARE
    vl_test_query text;
    vl_total_count int := 9999999;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    BEGIN
            execute format('drop table if exists price_markdown_opt_temp.tb_sku_store_temp1_%1$s ;',in_strategy_id);
            execute format('drop table if exists price_markdown_opt_temp.tb_sku_store_pcd_temp2_%1$s ;',in_strategy_id);
            execute format('drop table if exists price_markdown_opt_temp.tb_sku_store_promo_temp_%1$s ;',in_strategy_id);
            execute format('drop table if exists price_markdown_opt_temp.tb_day_store_ratio_temp_%1$s ;',in_strategy_id);
            execute format('drop table if exists price_markdown_opt_temp.tb_%1$s_ssd_temp ;',in_strategy_id);

----------------------
            vl_test_query :=  format('create unlogged table price_markdown_opt_temp.tb_sku_store_temp1_%1$s as
                            SELECT distinct strategy_id, a.product_id, a.store_id, 
                                a.product_level_id, a.store_level_id,
                                a.price, a.cost, l3_cid, total_inventory,
                                a.currency_id, a.price_with_vat
                            FROM (select * from price_markdown.tb_strategy_sku_store_mapping
                                    WHERE strategy_id = %1$s) a
                            INNER JOIN price_markdown.product_master b
                            ON  b.product_id = a.product_id
                            INNER join %2$s c
                            ON (c.product_id = a.product_id AND c.store_id = a.store_id)
							;',in_strategy_id, _inv_table);

            raise notice 'query- 1 --%' , vl_test_query;
            start_time := clock_timestamp();
            execute vl_test_query;
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;

-------------------------
            vl_test_query :=  format('create unlogged table price_markdown_opt_temp.tb_sku_store_pcd_temp2_%1$s as
                            SELECT a1.*,
                            a2.product_id, a2.store_id, a2.product_level_id, a2.store_level_id,
                            a2.opt_level_bins, a2.l3_cid, a2.price, a2.cost, a2.inv_oh,
                            a2.currency_id, a2.price_with_vat
                            FROM
                            (
                            SELECT strategy_id, pcd_id AS event, pcd_start_date AS start_date, pcd_end_date AS end_date
                            FROM price_markdown.tb_strategy_pcd pcd
                                WHERE strategy_id = %1$s
                                AND pcd_start_date >= ''%2$s''
                                AND pcd_end_date <= ''%3$s'' ) a1
                            INNER JOIN
                                ( SELECT t1.strategy_id, t1.product_id, t1.store_id, t1.product_level_id, t1.store_level_id,
                                concat(t1.product_level_id, ''_'', t1.store_level_id) AS opt_level_bins,
                                t1.price, t1.cost, t1.l3_cid, coalesce(t1.total_inventory,0) AS inv_oh,
                                t1.currency_id, t1.price_with_vat
                                FROM
                                price_markdown_opt_temp.tb_sku_store_temp1_%1$s t1 )a2
                            ON a1.strategy_id = a2.strategy_id ;',in_strategy_id,vl_pcd_start_date,vl_pcd_end_date);

    raise notice 'query- 3 --%' , vl_test_query;
    start_time := clock_timestamp();
    execute vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 3 statement: %', end_time - start_time;
-------------------------
            vl_test_query :=  format('create unlogged table  price_markdown_opt_temp.tb_sku_store_promo_temp_%1$s as
            SELECT d1.*, floor(d2.base_percentage / 5.0) * 5 as base_percentage,
			d2.base_percentage as markdown_percentage_exact,
            d2.effective_price_point, d2.effective_price_point_with_vat,
            d2.channel_info, d2.previous_markdown_percentage,
            d2.stat_id
            FROM
            price_markdown_opt_temp.tb_sku_store_pcd_temp2_%1$s d1
             LEFT JOIN
                   (SELECT product_level_id, store_level_id, pcd_id as event, markdown_percentage as base_percentage,
                   product_id, store_id, effective_price_point, effective_price_point_with_vat, 
                   channel_info, previous_markdown_percentage, stat_id
                    FROM 
                        price_markdown_opt_temp.tb_stg_disc_local_temp_%1$s
                        --price_markdown.tb_strategy_discount_ia_%1$s 
                    ) d2
                    ON
                    -- d1.product_level_id = d2.product_level_id
                    -- and d1.store_level_id = d2.store_level_id
                    d1.product_id = d2.product_id
                    and d1.store_id = d2.store_id
                    AND d1.event = d2.event;',in_strategy_id);

    raise notice 'query- 4 A --%' , vl_test_query;
    start_time := clock_timestamp();
    execute vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 4A statement: %', end_time - start_time;
   -------------------------
            vl_test_query :=  format('create unlogged table price_markdown_opt_temp.tb_day_store_ratio_temp_%1$s as
            SELECT d1.*, d3.day_ratio_bnm, d3.day_ratio_ecom, d3.date,
			d3.week_start_date, d4.store_ratio
            FROM
            price_markdown_opt_temp.tb_sku_store_promo_temp_%1$s d1
             left join
                        (SELECT date, day_ratio_bnm, day_ratio_ecom, l3_cid, week_start_date
                        FROM price_markdown_opt.mvm_day_split_%1$s c2
                        WHERE c2.date BETWEEN ''%2$s'' AND ''%3$s'' ) d3
               on d3.l3_cid = d1.l3_cid
              and d3.date BETWEEN d1.start_date AND d1.end_date
              INNER JOIN price_markdown_opt.mvm_store_split_%1$s d4
			    ON (d4.product_id = d1.product_id AND d4.store_id = d1.store_id
				AND d4.week_start_date = d3.week_start_date);',in_strategy_id,vl_pcd_start_date,vl_pcd_end_date);

    raise notice 'query- 4 B --%' , vl_test_query;
    start_time := clock_timestamp();
    execute vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 4A statement: %', end_time - start_time;
   -------------------------------------------------------------
            vl_test_query :=  format('CREATE unlogged TABLE IF NOT EXISTS price_markdown_opt_temp.tb_%1$s_ssd_temp AS
            select 
                e1.strategy_id, e1.event, e1.start_date, e1.end_date, e1.date, e1.week_start_date,
                e1.product_id, e1.store_id, e1.product_level_id, e1.store_level_id,
                e1.opt_level_bins, e1.l3_cid, e1.price, e1.cost, e1.inv_oh,
                e1.store_ratio, e1.base_percentage,  e1.day_ratio_bnm, e1.day_ratio_ecom, e1.markdown_percentage_exact,
                case when s.s2_name = ''Ecom'' then COALESCE(((e2.ecom_elasticity * (e1.markdown_percentage_exact - e1.base_percentage) / 100) + 1) * e2.ecom_sales_units * e1.day_ratio_ecom * e1.store_ratio, 0)
				else COALESCE(((e2.bnm_elasticity * (e1.markdown_percentage_exact - e1.base_percentage) / 100) + 1) * e2.bnm_sales_units * e1.day_ratio_bnm * e1.store_ratio, 0) end as sales_units_bef_cap,
                e1.currency_id, e1.price_with_vat,
                e1.effective_price_point, e1.effective_price_point_with_vat,
                e1.channel_info, e1.previous_markdown_percentage, 
                e1.stat_id
            from 
                price_markdown_opt_temp.tb_day_store_ratio_temp_%1$s e1
                join price_markdown_opt.mvm_sim_%1$s e2
                  on e1.week_start_date = e2.week_start_date
                 and e1.base_percentage = e2.base_percentage
                 and e1.product_id = e2.product_id
                 and e2.week_start_date BETWEEN ''%2$s'' AND ''%3$s''
                inner join (select distinct s2_name, store_id from price_markdown.tb_store_master) s
                  on e1.store_id = s.store_id ;',in_strategy_id,sim_start_date,sim_end_date);
    raise notice 'query- Final --%' , vl_test_query;
    start_time := clock_timestamp();
    execute vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken final statement: %', end_time - start_time;
        RETURN true;
  end;
$function$
;
