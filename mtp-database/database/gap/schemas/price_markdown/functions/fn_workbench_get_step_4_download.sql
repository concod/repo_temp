--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_workbench_get_step_4_download runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_workbench_get_step_4_download
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_workbench_get_step_4_download;
CREATE OR REPLACE FUNCTION price_markdown.fn_workbench_get_step_4_download(_sid integer)
 RETURNS TABLE(product_level_value character varying, store_level_value character varying, pcd_start_date date, pcd_end_date date, "IA Recommended Discount" numeric, "BL Override Discount" numeric, "Draft Discount" numeric, "IA Recommended Price Point" numeric, "BL Override Price Point" numeric, "Draft Price Point" numeric, "IA Recommended Units" numeric, "BL Override Units" numeric, "Draft Units" numeric, "IA Recommended Revenue" numeric, "BL Override Revenue" numeric, "Draft Revenue" numeric, "IA Recommended Margin" numeric, "BL Override Margin" numeric, "Draft Margin" numeric, "IA Recommended Markdown $" numeric, "BL Override Markdown $" numeric, "Draft Markdown $" numeric, "IA Recommended Inventory" numeric, "BL Override Inventory" numeric, "Draft Inventory" numeric)
	LANGUAGE plpgsql
AS $function$
        DECLARE
        vl_test_query text;
        vl_total_count int := 9999999;
        start_time TIMESTAMP;
        end_time TIMESTAMP;
        future_start_date date ;
       _temp_integer int :=  TO_NUMBER(TO_CHAR(CURRENT_TIMESTAMP, 'HH24MISS'), '999999');

        BEGIN

                SELECT coalesce(min(tsp.pcd_start_date),

            (select min(t1.pcd_start_date) FROM price_markdown.tb_strategy_pcd t1 where strategy_id = _sid)

            ) INTO future_start_date
                FROM price_markdown.tb_strategy_pcd tsp
                WHERE tsp.strategy_id = _sid
                AND tsp.pcd_start_date >= date(timezone('US/Eastern', now()));


                execute format('drop table if exists markdown_opt.tb_s4d_alldisc_%1$s_%2$s ;',_sid,_temp_integer);
                vl_test_query :=  format('
            create unlogged table markdown_opt.tb_s4d_alldisc_%1$s_%2$s as
            (SELECT
            a.product_level_id,
            a.store_level_id,
            a.pcd_id,
            a.product_level_value,
            a.store_level_value,
            d.pcd_start_date,
            d.pcd_end_date,
            c.markdown_percentage AS ia_discount,
            b.markdown_percentage AS fin_discount,
            a.markdown_percentage AS draft_discount
        FROM
            price_markdown.tb_strategy_discount a
        LEFT JOIN
            price_markdown.tb_strategy_discount_finalized b ON a.product_level_id = b.product_level_id
            AND a.store_level_id = b.store_level_id
            AND a.pcd_id = b.pcd_id
            and a.strategy_id = b.strategy_id
        LEFT JOIN
            price_markdown.tb_strategy_discount_ia c ON a.product_level_id = c.product_level_id
            AND a.store_level_id = c.store_level_id
            AND a.pcd_id = c.pcd_id
            and a.strategy_id = c.strategy_id
        INNER JOIN
            price_markdown.tb_strategy_pcd d ON a.strategy_id = d.strategy_id
            AND a.pcd_id = d.pcd_id
        WHERE
            a.strategy_id = %1$s and d.pcd_start_date >= ''%3$s'' );',_sid,_temp_integer, future_start_date);

                raise notice 'query- 1 --%' , vl_test_query;
                start_time := clock_timestamp();
                execute vl_test_query;
                end_time := clock_timestamp();
                RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;




                execute format('drop table if exists markdown_opt.tb_s4d_blo_%1$s_%2$s ;',_sid,_temp_integer);
                vl_test_query :=  format('create unlogged table markdown_opt.tb_s4d_blo_%1$s_%2$s AS
                                    (SELECT
            product_level_id,
            store_level_id,
            pcd_id,
            SUM(sales_units) AS sales_units,
            SUM(revenue) AS revenue,
            SUM(margin) AS margin,
            AVG(effective_price_point) AS effective_price_point,
            sum(spend) as spend,
            max(rem_inv) as rem_inv
        FROM
            price_markdown.fn_create_strategies_union_query_from_agg_tables(ARRAY[%1$s], ''blo'',''%3$s'')
        GROUP BY
            1, 2, 3
    );',_sid,_temp_integer,future_start_date);

                raise notice 'query- 2 --%' , vl_test_query;
                start_time := clock_timestamp();
                execute vl_test_query;
                end_time := clock_timestamp();
                RAISE NOTICE 'Time taken SQL 2 statement: %', end_time - start_time;



            execute format('drop table if exists markdown_opt.tb_s4d_ia_%1$s_%2$s ;',_sid,_temp_integer);
                vl_test_query :=  format('create unlogged table markdown_opt.tb_s4d_ia_%1$s_%2$s AS
                                    (SELECT
            product_level_id,
            store_level_id,
            pcd_id,
            SUM(sales_units) AS sales_units,
            SUM(revenue) AS revenue,
            SUM(margin) AS margin,
            AVG(effective_price_point) AS effective_price_point,
            sum(spend) as spend,
            max(rem_inv) as rem_inv
        FROM
            price_markdown.fn_create_strategies_union_query_from_agg_tables(ARRAY[%1$s], ''ia'',''%3$s'')
        GROUP BY
            1, 2, 3
    );',_sid,_temp_integer,future_start_date);

                raise notice 'query- 3 --%' , vl_test_query;
                start_time := clock_timestamp();
                execute vl_test_query;
                end_time := clock_timestamp();
                RAISE NOTICE 'Time taken SQL 3 statement: %', end_time - start_time;



            execute format('drop table if exists markdown_opt.tb_s4d_fin_%1$s_%2$s ;',_sid,_temp_integer);
                vl_test_query :=  format('create unlogged table markdown_opt.tb_s4d_fin_%1$s_%2$s AS
                                    (SELECT
            product_level_id,
            store_level_id,
            pcd_id,
            SUM(sales_units) AS sales_units,
            SUM(revenue) AS revenue,
            SUM(margin) AS margin,
            AVG(effective_price_point) AS effective_price_point,
            sum(spend) as spend,
            max(rem_inv) as rem_inv
        FROM
            price_markdown.fn_create_strategies_union_query_from_agg_tables(ARRAY[%1$s], ''fin'',''%3$s'')
        GROUP BY
            1, 2, 3
    );',_sid,_temp_integer,future_start_date);

                raise notice 'query- 4 --%' , vl_test_query;
                start_time := clock_timestamp();
                execute vl_test_query;
                end_time := clock_timestamp();
                RAISE NOTICE 'Time taken SQL 4 statement: %', end_time - start_time;


                vl_test_query :=  format('
          WITH ending_rules as
               (SELECT strategy_id, unnest(applicable_value) AS end_rule
              FROM price_markdown.tb_strategy_rule t1
              INNER JOIN (
                  SELECT rule_id, rule_type
                  FROM price_markdown.tb_rule_master trm
              ) t2
               ON t1.constraint_id = t2.rule_id
              WHERE
                  constraint_type = 0
                  AND status = 0
                  AND rule_type = 44 -- Ending_Rule
                  AND strategy_id = %1$s
              GROUP BY 1, 2
              )
        SELECT
            a.product_level_value::character varying,
            a.store_level_value::character varying,
            a.pcd_start_date,
            a.pcd_end_date,
            ROUND(a.ia_discount::numeric, 2) AS "IA Recommended Discount",
            ROUND(a.fin_discount::numeric, 2) AS "BL Override Discount",
            ROUND(a.draft_discount::numeric, 2) AS "Draft Price Discount",
CASE WHEN end_rule is NULL THEN round(c.effective_price_point::numeric, 2)
           ELSE (ROUND(cast(c.effective_price_point -(end_rule/100) as numeric),1)+(end_rule/100))::numeric END AS "IA Recommended Price Point",
CASE WHEN end_rule is NULL THEN round(d.effective_price_point::numeric, 2)
           ELSE (ROUND(cast(d.effective_price_point -(end_rule/100) as numeric),1)+(end_rule/100))::numeric END AS "BL Override Price Point",
CASE WHEN end_rule is NULL THEN round(b.effective_price_point::numeric, 2)
           ELSE (ROUND(cast(b.effective_price_point -(end_rule/100) as numeric),1)+(end_rule/100))::numeric END AS "Draft Price Point",
            ROUND(c.sales_units::numeric, 0) AS "IA Recommended Units",
            ROUND(d.sales_units::numeric, 0) AS "BL Override Units",
            ROUND(b.sales_units::numeric, 0) AS "Draft Units",
            ROUND(c.revenue::numeric, 0) AS "IA Recommended Revenue",
            ROUND(d.revenue::numeric, 0) AS "BL Override Revenue",
            ROUND(b.revenue::numeric, 0) AS "Draft Revenue",
            ROUND(c.margin::numeric, 0) AS "IA Recommended Margin",
            ROUND(d.margin::numeric, 0) AS "BL Override Margin",
            ROUND(b.margin::numeric, 0) AS "Draft Margin",
            ROUND(c.spend::numeric, 0) AS "IA Recommended Markdown $",
            ROUND(d.spend::numeric, 0) AS "BL Override Markdown $",
            ROUND(b.spend::numeric, 0) AS "Draft Markdown $",
            ROUND(c.rem_inv::numeric, 0) AS "IA Recommended Inventory",
            ROUND(d.rem_inv::numeric, 0) AS "BL Override Inventory",
            ROUND(b.rem_inv::numeric, 0) AS "Draft Inventory"
        FROM
            markdown_opt.tb_s4d_alldisc_%1$s_%2$s a
        LEFT JOIN
            markdown_opt.tb_s4d_blo_%1$s_%2$s b ON a.product_level_id = b.product_level_id
            AND a.store_level_id = b.store_level_id
            AND a.pcd_id = b.pcd_id
        LEFT JOIN
            markdown_opt.tb_s4d_ia_%1$s_%2$s c ON a.product_level_id = c.product_level_id
            AND a.store_level_id = c.store_level_id
            AND a.pcd_id = c.pcd_id
        LEFT JOIN
            markdown_opt.tb_s4d_fin_%1$s_%2$s d ON a.product_level_id = d.product_level_id
            AND a.store_level_id = d.store_level_id
            AND a.pcd_id = d.pcd_id
          LEFT JOIN ending_rules er
          on strategy_id = %1$s;',_sid,_temp_integer);

        raise notice 'query- 5 A --%' , vl_test_query;
        start_time := clock_timestamp();
        RETURN QUERY EXECUTE vl_test_query;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken SQL 5 A statement: %', end_time - start_time;

        -- Drop temporary tables
        EXECUTE format('DROP TABLE IF EXISTS markdown_opt.tb_s4d_alldisc_%s_%2$s', _sid,_temp_integer);
        EXECUTE format('DROP TABLE IF EXISTS markdown_opt.tb_s4d_blo_%s_%2$s', _sid,_temp_integer);
        EXECUTE format('DROP TABLE IF EXISTS markdown_opt.tb_s4d_ia_%s_%2$s', _sid,_temp_integer);
        EXECUTE format('DROP TABLE IF EXISTS markdown_opt.tb_s4d_fin_%s_%2$s', _sid,_temp_integer);

      end;
    $function$
;