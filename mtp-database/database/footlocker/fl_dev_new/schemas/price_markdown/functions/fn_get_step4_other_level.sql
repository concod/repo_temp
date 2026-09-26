--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_step4_other_level runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_get_step4_other_level
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_get_step4_other_level;
CREATE OR REPLACE FUNCTION price_markdown.fn_get_step4_other_level(in_strategy_id integer, _product_level_id integer, _store_level_id integer, _pcd_id integer[])
 RETURNS TABLE(product_level_value character varying, store_level_value character varying, pcd_start_date date, pcd_end_date date, "IA Recommended Discount" numeric, "BL Override Discount" numeric, "Draft Price Discount" numeric, "IA Recommended Price Point" numeric, "BL Override Price Point" numeric, "Draft Price Point" numeric, "IA Recommended Units" numeric, "BL Override Units" numeric, "Draft Units" numeric, "IA Recommended Revenue" numeric, "BL Override Revenue" numeric, "Draft Revenue" numeric, "IA Recommended Margin" numeric, "BL Override Margin" numeric, "Draft Margin" numeric, "IA Recommended Markdown $" numeric, "BL Override Markdown $" numeric, "Draft Markdown $" numeric, "IA Recommended Inventory" numeric, "BL Override Inventory" numeric, "Draft Inventory" numeric)
	LANGUAGE plpgsql
AS $function$
     declare
     _min_pcd_start_date date;
     query text;
     vl_total_count int := 9999999;
     start_time TIMESTAMP;
    end_time TIMESTAMP;

     BEGIN 
               select min(tb.pcd_start_date) as _min_pcd_start_date from price_markdown.tb_strategy_pcd tb where strategy_id = in_strategy_id into _min_pcd_start_date;
----------------------
               if _product_level_id in (1,2,3,4,5) and _store_level_id = 6 then
                    execute format('drop table if exists markdown_opt.tb_s4dov_ss_%1$s;',in_strategy_id);
                    query :=  format('create unlogged table markdown_opt.tb_s4dov_ss_%1$s as
                                        select ss.product_id , ss.store_h6_id , ss.product_level_id, ss.store_level_id ,
                                        pm.product_h%2$s_name as new_plv,  
                                        sm.store_h%3$s_name  as new_slv,
                                        pm.product_h%2$s_id  as new_pli,
                                        sm.store_h%3$s_id  as new_sli
                                        from price_markdown.tb_strategy_sku_store_mapping ss 
                                        inner join price_markdown.product_master pm 
                                        on ss.product_id = pm.product_id 
                                        inner join store_master sm 
                                        on ss.store_h6_id = sm.store_h6_id 
                                        where strategy_id = %1$s
                                        group by 1,2,3,4,5,6,7,8;',in_strategy_id, _product_level_id, _store_level_id);
                              
                    raise notice 'query- 1 --%' , query;
                    start_time := clock_timestamp();
                    execute query;
                    end_time := clock_timestamp();
                    RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;
                    raise notice 'prod level id is 1,2,3,4,5,-200 ans store level id is 6,-200';

               elsif _product_level_id in (1,2,3,4,5) and _store_level_id = -200 then
                    execute format('drop table if exists markdown_opt.tb_s4dov_ss_%1$s;',in_strategy_id);
                    query :=  format('create unlogged table markdown_opt.tb_s4dov_ss_%1$s as
                                        select ss.product_id , ss.store_h6_id , ss.product_level_id, ss.store_level_id ,
                                        pm.product_h%2$s_name as new_plv,  
                                        ''Overall''  as new_slv,
                                        pm.product_h%2$s_id  as new_pli,
                                        -200  as new_sli
                                        from price_markdown.tb_strategy_sku_store_mapping ss 
                                        inner join price_markdown.product_master pm 
                                        on ss.product_id = pm.product_id 
                                        where strategy_id = %1$s
                                        group by 1,2,3,4,5,6,7,8;',in_strategy_id,  _product_level_id);
                                                  
                    raise notice 'query- 1 --%' , query;
                    start_time := clock_timestamp();
                    execute query;
                    end_time := clock_timestamp();
                    RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;
                    raise notice 'prod level id is 1,2,3,4,5 ans store level id is -200';
               
               elsif _product_level_id = -200 and _store_level_id = 6 then
                    execute format('drop table if exists markdown_opt.tb_s4dov_ss_%1$s;',in_strategy_id);
                    query :=  format('create unlogged table markdown_opt.tb_s4dov_ss_%1$s as
                                        select ss.product_id , ss.store_h6_id , ss.product_level_id, ss.store_level_id ,
                                        ''Overall''  as new_plv, 
                                        sm.store_h%2$s_name  as new_slv,
                                        -200  as new_pli,
                                        sm.store_h%2$s_id  as new_sli
                                        from price_markdown.tb_strategy_sku_store_mapping ss 
                                        inner join store_master sm 
                                        on ss.store_h6_id = sm.store_h6_id 
                                        where strategy_id = %1$s
                                        group by 1,2,3,4,5,6,7,8;',in_strategy_id, _store_level_id);
                                        raise notice 'query- 1 --%' , query;
                    start_time := clock_timestamp();
                    execute query;
                    end_time := clock_timestamp();
                    RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;
                    raise notice 'prod level id is -200 ans store level id is 6';

               elsif _product_level_id = -200 and _store_level_id = -200  then
                    execute format('drop table if exists markdown_opt.tb_s4dov_ss_%1$s;',in_strategy_id);
                    query :=  format('create unlogged table markdown_opt.tb_s4dov_ss_%1$s as
                                        select ss.product_id , ss.store_h6_id , ss.product_level_id, ss.store_level_id ,
                                        ''Overall''  as new_plv, 
                                        ''Overall''  as new_slv,
                                        -200 as new_pli,
                                        -200 as new_sli
                                        from price_markdown.tb_strategy_sku_store_mapping ss 
                                        where strategy_id = %1$s
                                        group by 1,2,3,4,5,6,7,8;',in_strategy_id);
                    raise notice 'query- 1 --%' , query;
                    start_time := clock_timestamp();
                    execute query;
                    end_time := clock_timestamp();
                    RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;
                    raise notice 'prod level id is -200 ans store level id is -200';
               
               elsif _product_level_id = -100 and _store_level_id = 6  then
                    execute format('drop table if exists markdown_opt.tb_s4dov_ss_%1$s;',in_strategy_id);
                    query :=  format('create unlogged table markdown_opt.tb_s4dov_ss_%1$s as
                                        select ss.product_id , ss.store_h6_id , ss.product_level_id, ss.store_level_id ,
                                        pm.pg_name as new_plv,  
                                        sm.store_h%2$s_name  as new_slv,
                                        pm.product_group_id  as new_pli,
                                        sm.store_h%2$s_id  as new_sli
                                        from price_markdown.tb_strategy_sku_store_mapping ss 
                                        inner join (select v1.strategy_id, v1.product_group_id, v2.pg_name, v3.product_id 
                                                       from price_markdown.tb_strategy_product_groups v1 
                                                       inner join price_markdown.tb_product_group v2
                                                       on v1.product_group_id = v2.pg_id
                                                       and v1.strategy_id = %1$s
                                                       inner join price_markdown.tb_pg_product v3
                                                       on v1.product_group_id = v3.pg_id
                                                       group by 1,2,3,4) pm 
                                        on ss.product_id = pm.product_id
                                        and ss.strategy_id = pm.strategy_id
                                        inner join store_master sm 
                                        on ss.store_h6_id = sm.store_h6_id 
                                        where ss.strategy_id = %1$s
                                        group by 1,2,3,4,5,6,7,8;',in_strategy_id, _store_level_id);
                    raise notice 'query- 1 --%' , query;
                    start_time := clock_timestamp();
                    execute query;
                    end_time := clock_timestamp();
                    RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;
                    raise notice 'prod level id is PG ans store level id is 6';

               elsif _product_level_id IN (1,2,3,4,5) and _store_level_id = -100  then
                    execute format('drop table if exists markdown_opt.tb_s4dov_ss_%1$s;',in_strategy_id);
                    query :=  format('create unlogged table markdown_opt.tb_s4dov_ss_%1$s as
                                        select ss.product_id , ss.store_h6_id , ss.product_level_id, ss.store_level_id ,
                                        pm.product_h%2$s_name as new_plv,  
                                        sm.sg_name  as new_slv,
                                        pm.product_h%2$s_id  as new_pli,
                                        sm.store_group_id  as new_sli
                                        from price_markdown.tb_strategy_sku_store_mapping ss 
                                        inner join price_markdown.product_master pm 
                                        on ss.product_id = pm.product_id 
                                        inner join (select v1.strategy_id, v1.store_group_id, v2.sg_name, v3.store_h6_id
                                                       from price_markdown.tb_strategy_store_groups v1 
                                                       inner join price_markdown.tb_store_group v2
                                                       on v1.store_group_id = v2.sg_id
                                                       and v1.strategy_id = %1$s
                                                       inner join price_markdown.tb_sg_store v3
                                                       on v1.store_group_id = v3.sg_id
                                                       group by 1,2,3,4) sm 
                                        on ss.store_h6_id = sm.store_h6_id 
                                        and ss.strategy_id = sm.strategy_id
                                        where ss.strategy_id = %1$s
                                        group by 1,2,3,4,5,6,7,8;',in_strategy_id, _product_level_id);
                    raise notice 'query- 1 --%' , query;
                    start_time := clock_timestamp();
                    execute query;
                    end_time := clock_timestamp();
                    RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;
                    raise notice 'prod level id is 1,2,3,4,5 ans store level id is SG';
               
               elsif _product_level_id = -100 and _store_level_id = -200 then
                    execute format('drop table if exists markdown_opt.tb_s4dov_ss_%1$s;',in_strategy_id);
                    query :=  format('create unlogged table markdown_opt.tb_s4dov_ss_%1$s as
                                        select ss.product_id , ss.store_h6_id , ss.product_level_id, ss.store_level_id ,
                                        pm.pg_name as new_plv,  
                                        ''Overall''  as new_slv,
                                        pm.product_group_id  as new_pli,
                                        -200  as new_sli
                                        from price_markdown.tb_strategy_sku_store_mapping ss 
                                        inner join (select v1.strategy_id, v1.product_group_id, v2.pg_name, v3.product_id 
                                                       from price_markdown.tb_strategy_product_groups v1 
                                                       inner join price_markdown.tb_product_group v2
                                                       on v1.product_group_id = v2.pg_id
                                                       and v1.strategy_id = %1$s
                                                       inner join price_markdown.tb_pg_product v3
                                                       on v1.product_group_id = v3.pg_id
                                                       group by 1,2,3,4) pm 
                                        on ss.product_id = pm.product_id
                                        and ss.strategy_id = pm.strategy_id 
                                        where ss.strategy_id = %1$s
                                        group by 1,2,3,4,5,6,7,8;',in_strategy_id,  _product_level_id);
                                                  
                    raise notice 'query- 1 --%' , query;
                    start_time := clock_timestamp();
                    execute query;
                    end_time := clock_timestamp();
                    RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;
                    raise notice 'prod level id is PG ans store level id is -200';             
               
               elsif _product_level_id = -200 and _store_level_id = -100 then
                    execute format('drop table if exists markdown_opt.tb_s4dov_ss_%1$s;',in_strategy_id);
                    query :=  format('create unlogged table markdown_opt.tb_s4dov_ss_%1$s as
                                        select ss.product_id , ss.store_h6_id , ss.product_level_id, ss.store_level_id ,
                                        ''Overall''  as new_plv, 
                                        sm.sg_name  as new_slv,
                                        -200  as new_pli,
                                        sm.store_group_id  as new_sli
                                        from price_markdown.tb_strategy_sku_store_mapping ss 
                                        inner join (select v1.strategy_id, v1.store_group_id, v2.sg_name, v3.store_h6_id
                                                       from price_markdown.tb_strategy_store_groups v1 
                                                       inner join price_markdown.tb_store_group v2
                                                       on v1.store_group_id = v2.sg_id
                                                       and v1.strategy_id = %1$s
                                                       inner join price_markdown.tb_sg_store v3
                                                       on v1.store_group_id = v3.sg_id
                                                       group by 1,2,3,4) sm 
                                        on ss.store_h6_id = sm.store_h6_id 
                                        and ss.strategy_id = sm.strategy_id 
                                        where ss.strategy_id = %1$s
                                        group by 1,2,3,4,5,6,7,8;',in_strategy_id, _store_level_id);
                                        raise notice 'query- 1 --%' , query;
                    start_time := clock_timestamp();
                    execute query;
                    end_time := clock_timestamp();
                    RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;
                    raise notice 'prod level id is -200 ans store level id is SG';
               
               elsif _product_level_id = -100 and _store_level_id = -100 then
                    execute format('drop table if exists markdown_opt.tb_s4dov_ss_%1$s;',in_strategy_id);
                    query :=  format('create unlogged table markdown_opt.tb_s4dov_ss_%1$s as
                                        select ss.product_id , ss.store_h6_id , ss.product_level_id, ss.store_level_id ,
                                        pm.pg_name  as new_plv, 
                                        sm.sg_name  as new_slv,
                                        pm.product_group_id as new_pli,
                                        sm.store_group_id  as new_sli
                                        from price_markdown.tb_strategy_sku_store_mapping ss
                                        inner join (select v1.strategy_id, v1.product_group_id, v2.pg_name, v3.product_id 
                                                       from price_markdown.tb_strategy_product_groups v1 
                                                       inner join price_markdown.tb_product_group v2
                                                       on v1.product_group_id = v2.pg_id
                                                       and v1.strategy_id = %1$s
                                                       inner join price_markdown.tb_pg_product v3
                                                       on v1.product_group_id = v3.pg_id
                                                       group by 1,2,3,4) pm 
                                        on ss.product_id = pm.product_id
                                        and ss.strategy_id = pm.strategy_id 
                                        inner join (select v1.strategy_id, v1.store_group_id, v2.sg_name, v3.store_h6_id
                                                       from price_markdown.tb_strategy_store_groups v1 
                                                       inner join price_markdown.tb_store_group v2
                                                       on v1.store_group_id = v2.sg_id
                                                       and v1.strategy_id = %1$s
                                                       inner join price_markdown.tb_sg_store v3
                                                       on v1.store_group_id = v3.sg_id
                                                       group by 1,2,3,4) sm 
                                        on ss.store_h6_id = sm.store_h6_id 
                                        and ss.strategy_id = sm.strategy_id 
                                        where ss.strategy_id = %1$s
                                        group by 1,2,3,4,5,6,7,8;',in_strategy_id, _store_level_id);
                                        raise notice 'query- 1 --%' , query;
                    start_time := clock_timestamp();
                    execute query;
                    end_time := clock_timestamp();
                    RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;
                    raise notice 'prod level id is PG ans store level id is SG';               
                END IF;
------------------------
               execute format('drop table if exists markdown_opt.tb_s4dov_sslevel_%1$s;',in_strategy_id);
               query :=  format('create unlogged table markdown_opt.tb_s4dov_sslevel_%1$s as
                                   select product_level_id, store_level_id ,
                                   new_plv, new_slv , new_pli , new_sli
                                   from markdown_opt.tb_s4dov_ss_%1$s
                                   group by 1,2,3,4,5,6;',in_strategy_id);
                         
               raise notice 'query- 2 --%' , query;
               start_time := clock_timestamp();
               execute query;
               end_time := clock_timestamp();
               RAISE NOTICE 'Time taken SQL 2 statement: %', end_time - start_time;
-------------------------                    
               execute format('drop table if exists markdown_opt.tb_s4dov_iadisc_%1$s;',in_strategy_id);
               query :=  format('create unlogged table markdown_opt.tb_s4dov_iadisc_%1$s as
                                   select 
                                   new_plv, new_slv , new_pli , new_sli ,
                                   b.pcd_id ,avg(b.markdown_percentage) as markdown_percentage
                                   from markdown_opt.tb_s4dov_sslevel_%1$s a
                                   left join price_markdown.tb_strategy_discount_ia b
                                   on a.product_level_id = b.product_level_id
                                   and a.store_level_id = b.store_level_id
                                   where strategy_id = %1$s
                                   group by 1,2,3,4,5;',in_strategy_id);
                         
               raise notice 'query- 3 --%' , query;
               start_time := clock_timestamp();
               execute query;
               end_time := clock_timestamp();
               RAISE NOTICE 'Time taken SQL 3 statement: %', end_time - start_time;
-------------------------
               execute format('drop table if exists markdown_opt.tb_s4dov_iametrics_%1$s;',in_strategy_id);
               query :=  format('create unlogged table markdown_opt.tb_s4dov_iametrics_%1$s as 
                                   (
                                   select
                                           ia.strategy_id,
                                           b.new_pli ,
                                           b.new_sli, 
                                           ia.pcd_id,
                                           tsp.pcd_start_date,
                                           tsp.pcd_end_date,
                                           round(avg(ia.recommended_offer_percentage)::decimal,
                                           2) as ia_discount,
                                           case
                                               when SUM(ia.sales_units) > 0 then (SUM(ia.effective_price_point * ia.sales_units) / SUM(ia.sales_units))
                                               else AVG(ia.effective_price_point)
                                           end as effective_price_point,
                                           round(sum(ia.sales_units)::decimal,
                                           2) as sales_units,
                                           round(sum(ia.margin)::decimal,
                                           2) as margin,
                                           round(sum(ia.revenue)::decimal,
                                           2) as revenue,
                                           round(sum(ia.spend)::decimal,
                                           2) as spend,
                                           round(sum(case when recommendation_date = tsp.pcd_start_date then rem_inv else 0 end)::decimal,0) as rem_inv
                                       from
                                           price_markdown.fn_create_strategies_union_query(array[%1$s],
                                           ''ia'' :: text,''%2$s'') ia  
                                   inner join price_markdown.tb_strategy_pcd tsp 
                                   on ia.strategy_id = tsp.strategy_id
                                   inner join markdown_opt.tb_s4dov_ss_%1$s b
                                   on ia.product_id = b.product_id
                                   and ia.store_h6_id = b.store_h6_id
                                   and ia.recommendation_date between tsp.pcd_start_date and tsp.pcd_end_date 
                                   group by
                                       1,2,3,4,5,6
                                       );',in_strategy_id, _min_pcd_start_date);
                         
               raise notice 'query- 4 --%' , query;
               start_time := clock_timestamp();
               execute query;
               end_time := clock_timestamp();
               RAISE NOTICE 'Time taken SQL 4 statement: %', end_time - start_time;
     -------------
               execute format('drop table if exists markdown_opt.tb_s4dov_iafinal_%1$s;',in_strategy_id);
               query :=  format('create unlogged table markdown_opt.tb_s4dov_iafinal_%1$s as 
                                   (
                                   select 
                                   a.new_pli,
                                   a.new_sli,
                                   a.pcd_id,
                                   coalesce (b.ia_discount, a.markdown_percentage) as ia_discount,
                                   effective_price_point,
                                   coalesce(sales_units,0) sales_units,
                                   coalesce(margin,0) margin,
                                   coalesce(revenue,0) revenue,
                                   coalesce(spend,0) spend,
                                   coalesce(rem_inv,0) rem_inv
                                   from markdown_opt.tb_s4dov_iadisc_%1$s a 
                                   left join markdown_opt.tb_s4dov_iametrics_%1$s b
                                   on a.new_pli = b.new_pli
                                   and a.new_sli = b.new_sli
                                   and a.pcd_id = b.pcd_id
                                   );',in_strategy_id);
                         
               raise notice 'query- 5 --%' , query;
               start_time := clock_timestamp();
               execute query;
               end_time := clock_timestamp();
               RAISE NOTICE 'Time taken SQL 5 statement: %', end_time - start_time;
--------------
               execute format('drop table if exists markdown_opt.tb_s4dov_draftdisc_%1$s;',in_strategy_id);
               query :=  format('create unlogged table markdown_opt.tb_s4dov_draftdisc_%1$s as
                                   select 
                                   new_plv, new_slv , new_pli , new_sli ,
                                   b.pcd_id ,avg(b.markdown_percentage) as markdown_percentage
                                   from markdown_opt.tb_s4dov_sslevel_%1$s a
                                   left join price_markdown.tb_strategy_discount b
                                   on a.product_level_id = b.product_level_id
                                   and a.store_level_id = b.store_level_id
                                   where strategy_id = %1$s
                                   group by 1,2,3,4,5;',in_strategy_id);
                         
               raise notice 'query- 6 --%' , query;
               start_time := clock_timestamp();
               execute query;
               end_time := clock_timestamp();
               RAISE NOTICE 'Time taken SQL 6 statement: %', end_time - start_time;
--------------
               execute format('drop table if exists markdown_opt.tb_s4dov_draftmetrics_%1$s;',in_strategy_id);
               query :=  format('create unlogged table markdown_opt.tb_s4dov_draftmetrics_%1$s as 
                                   (
                                   select
                                           draft.strategy_id,
                                           b.new_pli ,
                                           b.new_sli, 
                                           draft.pcd_id,
                                           tsp.pcd_start_date,
                                           tsp.pcd_end_date,
                                           round(avg(draft.recommended_offer_percentage)::decimal,
                                           2) as draft_discount,
                                           case
                                               when SUM(draft.sales_units) > 0 then (SUM(draft.effective_price_point * draft.sales_units) / SUM(draft.sales_units))
                                               else AVG(draft.effective_price_point)
                                           end as effective_price_point,
                                           round(sum(draft.sales_units)::decimal,
                                           2) as sales_units,
                                           round(sum(draft.margin)::decimal,
                                           2) as margin,
                                           round(sum(draft.revenue)::decimal,
                                           2) as revenue,
                                           round(sum(draft.spend)::decimal,
                                           2) as spend,
                                           round(sum(case when recommendation_date = tsp.pcd_start_date then rem_inv else 0 end)::decimal,0) as rem_inv
                                       from
                                           price_markdown.fn_create_strategies_union_query(array[%1$s],
                                           ''blo'' :: text,''%2$s'') draft    
                                   inner join price_markdown.tb_strategy_pcd tsp 
                                   on draft.strategy_id = tsp.strategy_id
                                   inner join markdown_opt.tb_s4dov_ss_%1$s b
                                   on draft.product_id = b.product_id
                                   and draft.store_h6_id = b.store_h6_id
                                   and draft.recommendation_date between tsp.pcd_start_date and tsp.pcd_end_date 
                                   group by
                                       1,2,3,4,5,6
                                       );',in_strategy_id, _min_pcd_start_date);
                         
               raise notice 'query- 7 --%' , query;
               start_time := clock_timestamp();
               execute query;
               end_time := clock_timestamp();
               RAISE NOTICE 'Time taken SQL 7 statement: %', end_time - start_time;
--------------
               execute format('drop table if exists markdown_opt.tb_s4dov_draftfinal_%1$s;',in_strategy_id);
               query :=  format('create unlogged table markdown_opt.tb_s4dov_draftfinal_%1$s as 
                                   (
                                   select 
                                   a.new_pli,
                                   a.new_sli,
                                   a.new_plv, 
                                   a.new_slv,
                                   a.pcd_id,
                                   b.pcd_start_date,
                                   b.pcd_end_date,
                                   coalesce (b.draft_discount, a.markdown_percentage) as draft_discount,
                                   effective_price_point,
                                   coalesce(sales_units,0) sales_units,
                                   coalesce(margin,0) margin,
                                   coalesce(revenue,0) revenue,
                                   coalesce(spend,0) spend,
                                   coalesce(rem_inv,0) rem_inv
                                   from markdown_opt.tb_s4dov_draftdisc_%1$s a 
                                   left join markdown_opt.tb_s4dov_draftmetrics_%1$s b
                                   on a.new_pli = b.new_pli
                                   and a.new_sli = b.new_sli
                                   and a.pcd_id = b.pcd_id
                                   );',in_strategy_id);
                         
               raise notice 'query- 8 --%' , query;
               start_time := clock_timestamp();
               execute query;
               end_time := clock_timestamp();
               RAISE NOTICE 'Time taken SQL 8 statement: %', end_time - start_time;
--------------
               execute format('drop table if exists markdown_opt.tb_s4dov_finalizeddisc_%1$s;',in_strategy_id);
               query :=  format('create unlogged table markdown_opt.tb_s4dov_finalizeddisc_%1$s as
                                   select 
                                   new_plv, new_slv , new_pli , new_sli ,
                                   b.pcd_id ,avg(b.markdown_percentage) as markdown_percentage
                                   from markdown_opt.tb_s4dov_sslevel_%1$s a
                                   left join price_markdown.tb_strategy_discount_finalized b
                                   on a.product_level_id = b.product_level_id
                                   and a.store_level_id = b.store_level_id
                                   where strategy_id = %1$s
                                   group by 1,2,3,4,5;',in_strategy_id);
                         
               raise notice 'query- 9 --%' , query;
               start_time := clock_timestamp();
               execute query;
               end_time := clock_timestamp();
               RAISE NOTICE 'Time taken SQL 9 statement: %', end_time - start_time;
--------------
               execute format('drop table if exists markdown_opt.tb_s4dov_finalizedmetrics_%1$s;',in_strategy_id);
               query :=  format('create unlogged table markdown_opt.tb_s4dov_finalizedmetrics_%1$s as 
                                   (
                                   select
                                           finalized.strategy_id,
                                           b.new_pli ,
                                           b.new_sli, 
                                           finalized.pcd_id,
                                           tsp.pcd_start_date,
                                           tsp.pcd_end_date,
                                           round(avg(finalized.recommended_offer_percentage)::decimal,
                                           2) as fin_discount,
                                           case
                                               when SUM(finalized.sales_units) > 0 then (SUM(finalized.effective_price_point * finalized.sales_units) / SUM(finalized.sales_units))
                                               else AVG(finalized.effective_price_point)
                                           end as effective_price_point,
                                           round(sum(finalized.sales_units)::decimal,
                                           2) as sales_units,
                                           round(sum(finalized.margin)::decimal,
                                           2) as margin,
                                           round(sum(finalized.revenue)::decimal,
                                           2) as revenue,
                                           round(sum(finalized.spend)::decimal,
                                           2) as spend,
                                           round(sum(case when recommendation_date = tsp.pcd_start_date then rem_inv else 0 end)::decimal,0) as rem_inv
                                       from
                                           price_markdown.fn_create_strategies_union_query(array[%1$s],
                                           ''finalized'' :: text,''%2$s'') finalized   
                                   inner join price_markdown.tb_strategy_pcd tsp 
                                   on finalized.strategy_id = tsp.strategy_id
                                   inner join markdown_opt.tb_s4dov_ss_%1$s b
                                   on finalized.product_id = b.product_id
                                   and finalized.store_h6_id = b.store_h6_id
                                   and finalized.recommendation_date between tsp.pcd_start_date and tsp.pcd_end_date 
                                   group by
                                       1,2,3,4,5,6
                                       );',in_strategy_id, _min_pcd_start_date);
                         
               raise notice 'query- 10 --%' , query;
               start_time := clock_timestamp();
               execute query;
               end_time := clock_timestamp();
               RAISE NOTICE 'Time taken SQL 10 statement: %', end_time - start_time;
--------------
               execute format('drop table if exists markdown_opt.tb_s4dov_finalizedfinal_%1$s;',in_strategy_id);
               query :=  format('create unlogged table markdown_opt.tb_s4dov_finalizedfinal_%1$s as 
                                   (
                                   select 
                                   a.new_pli,
                                   a.new_sli,
                                   a.pcd_id,
                                   coalesce (b.fin_discount, a.markdown_percentage) as fin_discount,
                                   effective_price_point,
                                   coalesce(sales_units,0) sales_units,
                                   coalesce(margin,0) margin,
                                   coalesce(revenue,0) revenue,
                                   coalesce(spend,0) spend,
                                   coalesce(rem_inv,0) rem_inv
                                   from markdown_opt.tb_s4dov_finalizeddisc_%1$s a 
                                   left join markdown_opt.tb_s4dov_finalizedmetrics_%1$s b
                                   on a.new_pli = b.new_pli
                                   and a.new_sli = b.new_sli
                                   and a.pcd_id = b.pcd_id
                                   );',in_strategy_id);
                         
               raise notice 'query- 11 --%' , query;
               start_time := clock_timestamp();
               execute query;
               end_time := clock_timestamp();
               RAISE NOTICE 'Time taken SQL 11 statement: %', end_time - start_time;
--------------
--             execute format('drop table if exists markdown_opt.tb_s4dov_finalizedfinal_%1$s;',in_strategy_id);
               query :=  format('
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
                                draft.new_plv::character varying as product_level_value,
                                draft.new_slv::character varying as store_level_value,
                                tb_pcd.pcd_start_date as pcd_start_date,
                                tb_pcd.pcd_end_date as pcd_end_date,
                                ROUND(ia.ia_discount::numeric, 2) AS "IA Recommended Discount",
                                ROUND(fin.fin_discount::numeric, 2) AS "BL Override Discount",
                                ROUND(draft.draft_discount::numeric, 2) AS "Draft Price Discount",
CASE WHEN end_rule is NULL THEN round(ia.effective_price_point::numeric, 2)
           ELSE (ROUND(cast(ia.effective_price_point -(end_rule/100) as numeric),1)+(end_rule/100))::numeric END AS "IA Recommended Price Point",
CASE WHEN end_rule is NULL THEN round(fin.effective_price_point::numeric, 2)
           ELSE (ROUND(cast(fin.effective_price_point -(end_rule/100) as numeric),1)+(end_rule/100))::numeric END AS "BL Override Price Point",
CASE WHEN end_rule is NULL THEN round(draft.effective_price_point::numeric, 2)
           ELSE (ROUND(cast(draft.effective_price_point -(end_rule/100) as numeric),1)+(end_rule/100))::numeric END AS "Draft Price Point",
                                ROUND(ia.sales_units::numeric, 0) AS "IA Recommended Units",
                                ROUND(fin.sales_units::numeric, 0) AS "BL Override Units",
                                ROUND(draft.sales_units::numeric, 0) AS "Draft Units",
                                ROUND(ia.revenue::numeric, 0) AS "IA Recommended Revenue",
                                ROUND(fin.revenue::numeric, 0) AS "BL Override Revenue",
                                ROUND(draft.revenue::numeric, 0) AS "Draft Revenue",
                                ROUND(ia.margin::numeric, 0) AS "IA Recommended Margin",
                                ROUND(fin.margin::numeric, 0) AS "BL Override Margin",
                                ROUND(draft.margin::numeric, 0) AS "Draft Margin",
                                ROUND(ia.spend::numeric, 0) AS "IA Recommended Markdown $",
                                ROUND(fin.spend::numeric, 0) AS "BL Override Markdown $",
                                ROUND(draft.spend::numeric, 0) AS "Draft Markdown $",
                                ROUND(ia.rem_inv::numeric, 0) AS "IA Recommended Inventory",
                                ROUND(fin.rem_inv::numeric, 0) AS "BL Override Inventory",
                                ROUND(draft.rem_inv::numeric, 0) AS "Draft Inventory"
                    from 
                    markdown_opt.tb_s4dov_draftfinal_%1$s draft
                    left join markdown_opt.tb_s4dov_iafinal_%1$s ia
                    on draft.new_pli = ia.new_pli
                    and draft.new_sli = ia.new_sli
                    and draft.pcd_id = ia.pcd_id
                    left join markdown_opt.tb_s4dov_finalizedfinal_%1$s fin 
                    on draft.new_pli = fin.new_pli
                    and draft.new_sli = fin.new_sli
                    and draft.pcd_id = fin.pcd_id
                    left join (select tb1.pcd_id, tb1.pcd_start_date, tb1.pcd_end_date 
                                 from price_markdown.tb_strategy_pcd tb1 
                                 where strategy_id = %1$s) tb_pcd
                    on draft.pcd_id = tb_pcd.pcd_id
                    left join ending_rules
                    on strategy_id = %1$s;',in_strategy_id);
                         
               raise notice 'query- 12 --%' , query;
               return query execute query;

--------------

--        RETURN true;  
  end;
$function$
;