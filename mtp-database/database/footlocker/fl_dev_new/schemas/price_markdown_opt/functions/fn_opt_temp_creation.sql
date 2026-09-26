--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:fn_opt_temp_creation_30122025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: store split changes for fn_opt_temp_creation_15122025

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
            execute format('drop table if exists price_markdown_opt_temp.tb_day_ratio_temp_%1$s ;',in_strategy_id);


----------------------
            vl_test_query :=  format('create unlogged table price_markdown_opt_temp.tb_sku_store_temp1_%1$s as
                            SELECT distinct strategy_id, a.product_id, a.store_id, product_level_id, store_level_id,
                                b.msrp as price, b.cost, b.l3_cid, b.l0_cid, c.total_inventory,
                                b.currency_id, b.msrp_with_vat as price_with_vat
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
                            a2.opt_level_bins, a2.l3_cid, a2.l0_cid, a2.price, a2.cost, a2.inv_oh,
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
                                t1.price, t1.cost, t1.l3_cid, t1.l0_cid, coalesce(t1.total_inventory,0) AS inv_oh,
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
			d2.base_percentage as markdown_percentage_exact
            FROM
            price_markdown_opt_temp.tb_sku_store_pcd_temp2_%1$s d1
             LEFT JOIN
                   (SELECT product_level_id, store_level_id, pcd_id as event, markdown_percentage as base_percentage
                    FROM price_markdown.tb_strategy_discount_ia_%1$s ) d2
                    ON
                    d1.product_level_id = d2.product_level_id
                    and d1.store_level_id = d2.store_level_id
                    AND d1.event = d2.event;',in_strategy_id);

    raise notice 'query- 4 A --%' , vl_test_query;
    start_time := clock_timestamp();
    execute vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 4A statement: %', end_time - start_time;
   -------------------------
            vl_test_query :=  format('create unlogged table price_markdown_opt_temp.tb_day_ratio_temp_%1$s as
            SELECT d1.*, d3.day_split_ratio, d3.date,
			d3.simulation_week_start_date AS week_start_date
            FROM
            price_markdown_opt_temp.tb_sku_store_promo_temp_%1$s d1
             INNER JOIN price_markdown.tb_store_master sm
             ON d1.store_id = sm.store_id
             left join
                        (SELECT date, day_split_ratio, l3_cid, l0_cid, simulation_week_start_date, s0_id, s1_id
                        FROM price_markdown_opt.mvm_day_split_%1$s c2
                        WHERE c2.date BETWEEN ''%2$s'' AND ''%3$s'' ) d3
               on d3.l3_cid = d1.l3_cid
              and d3.l0_cid = d1.l0_cid
              and d3.date BETWEEN d1.start_date AND d1.end_date
              and d3.s0_id = sm.s0_id
              and d3.s1_id = sm.s1_id
;',in_strategy_id,vl_pcd_start_date,vl_pcd_end_date);

    raise notice 'query- 4 B --%' , vl_test_query;
    start_time := clock_timestamp();
    execute vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 4B statement: %', end_time - start_time;

   -------------------------
            vl_test_query :=  format('create unlogged table price_markdown_opt_temp.tb_day_store_ratio_temp_%1$s as
            SELECT d1.*, d4.store_split_ratio AS store_ratio
            FROM
            price_markdown_opt_temp.tb_day_ratio_temp_%1$s d1
              INNER JOIN price_markdown_opt.mvm_store_split_%1$s d4
			    ON d4.product_id = d1.product_id AND d4.store_id = d1.store_id
				AND d4.simulation_week_start_date = d1.week_start_date
;',in_strategy_id);

    raise notice 'query- 4 C --%' , vl_test_query;
    start_time := clock_timestamp();
    execute vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 4C statement: %', end_time - start_time;
   -------------------------------------------------------------
            vl_test_query :=  format('CREATE unlogged TABLE IF NOT EXISTS price_markdown_opt_temp.tb_%1$s_ssd_temp AS
            select 
                e1.strategy_id, e1.event, e1.start_date, e1.end_date, e1.date, e1.week_start_date,
                e1.product_id, e1.store_id, e1.product_level_id, e1.store_level_id,
                e1.opt_level_bins, e1.l3_cid, e1.price, e1.cost, e1.inv_oh,
                e1.store_ratio, e1.base_percentage, e1.day_split_ratio, e1.markdown_percentage_exact,
                COALESCE(((e2.elasticity * (e1.markdown_percentage_exact - e1.base_percentage) / 100) + 1) * e2.sales_units * e1.day_split_ratio * e1.store_ratio, 0) as sales_units_bef_cap,
                e1.currency_id, e1.price_with_vat
            from 
                price_markdown_opt_temp.tb_day_store_ratio_temp_%1$s e1
                INNER JOIN price_markdown.tb_store_master sm
                ON e1.store_id = sm.store_id
                join price_markdown_opt.mvm_sim_%1$s e2
                  on e1.week_start_date = e2.week_start_date
                 and e1.base_percentage = e2.base_percentage
                 and e1.product_id = e2.product_id
                 and e2.s0_id = sm.s0_id
                 and e2.s1_id = sm.s1_id
                 and e2.week_start_date BETWEEN ''%2$s'' AND ''%3$s'' ;',in_strategy_id,sim_start_date,sim_end_date);
    raise notice 'query- Final --%' , vl_test_query;
    start_time := clock_timestamp();
    execute vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken final statement: %', end_time - start_time;
        RETURN true;
  end;
$function$
;