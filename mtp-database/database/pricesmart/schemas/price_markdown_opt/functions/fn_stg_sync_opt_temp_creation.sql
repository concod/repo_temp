--liquibase formatted sql
--changeset liquibase:fn_stg_sync_opt_temp_creation runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_stg_sync_opt_temp_creation

DROP FUNCTION IF EXISTS price_markdown_opt.fn_stg_sync_opt_temp_creation(in_strategy_id integer, _stg_disc_ref text, _version text, inv_dates date, sim_start_date date, sim_end_date date);

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_stg_sync_opt_temp_creation(in_strategy_id integer, _stg_disc_ref text, _version text, inv_dates date, sim_start_date date, sim_end_date date)
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

			execute format('drop table if exists price_markdown_opt_temp.syn_ss_temp1_%1$s_%2$s ;',in_strategy_id, _version);
			execute format('drop table if exists price_markdown_opt_temp.syn_ssd_temp3_%1$s_%2$s ;',in_strategy_id, _version);
			execute format('drop table if exists price_markdown_opt_temp.syn_ssp_temp2_%1$s_%2$s ;',in_strategy_id, _version);
      execute format('drop table if exists price_markdown_opt_temp.syn_ssdd_temp4_%1$s_%2$s ;',in_strategy_id, _version);
			execute format('drop table if exists price_markdown_opt_temp.tb_%1$s_%2$s_ssd_temp ;',in_strategy_id, _version);

----------------------
			vl_test_query :=  format('create unlogged table price_markdown_opt_temp.syn_ss_temp1_%1$s_%2$s as
							SELECT strategy_id, a.product_id, a.store_id, product_level_id, store_level_id,
							    include_from_date, a.price, b.cost, l3_cid, brand_cid, total_inventory
							FROM (select * from price_markdown.tb_strategy_sku_store_mapping
									WHERE strategy_id = %1$s) a
							INNER JOIN price_markdown.product_master b
							ON  b.product_id = a.product_id
							INNER join price_markdown_opt.tb_temp_sync_inv c
							ON (c.product_id = a.product_id AND c.store_id = a.store_id);',in_strategy_id, _version);

			raise notice 'query- 1 --%' , vl_test_query;
			start_time := clock_timestamp();
			execute vl_test_query;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;
------------------------
			vl_test_query :=  format('create unlogged table price_markdown_opt_temp.syn_ssp_temp2_%1$s_%2$s as
								select v2.*
								from
									(select pcd_id
									from price_markdown.tb_strategy_pcd
									where strategy_id = %1$s
									and pcd_end_date > ''%3$s''
									group by 1 ) v1
								inner join
									(select product_level_id, store_level_id,
									tsd.pcd_id, markdown_percentage as markdown_percentage_exact,
									floor(markdown_percentage / 5.0) * 5 as markdown_percentage_rounded
									from price_markdown.tb_strategy_discount%4$s tsd
									where strategy_id = %1$s) v2
								on v1.pcd_id = v2.pcd_id;',in_strategy_id,_version,inv_dates, _stg_disc_ref);

			raise notice 'query- 2 --%' , vl_test_query;
			start_time := clock_timestamp();
			execute vl_test_query;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time taken SQL 2 statement: %', end_time - start_time;
-------------------------
			vl_test_query :=  format('create unlogged table price_markdown_opt_temp.syn_ssd_temp3_%1$s_%2$s as
							SELECT a1.*,
							a2.product_id, a2.store_id, a2.product_level_id, a2.store_level_id, a2.include_from_date,
							a2.opt_level_bins, a2.l3_cid, a2.brand_cid, a2.price, a2.cost, a2.inv_oh
							FROM
							(
							SELECT strategy_id, pcd_id AS event, pcd_start_date AS start_date, pcd_end_date AS end_date,
								   fisc.date, weeks_start_date
							FROM price_markdown.tb_strategy_pcd pcd
							INNER JOIN global.tb_fiscal_date_mapping fisc
								ON fisc.date BETWEEN pcd_start_date AND pcd_end_date
								WHERE strategy_id = %1$s
								AND fisc.date > ''%3$s'') a1
							INNER JOIN
								( SELECT t1.strategy_id, t1.product_id, t1.store_id, t1.product_level_id, t1.store_level_id,
								t1.include_from_date, concat(t1.product_level_id, ''_'', t1.store_level_id) AS opt_level_bins,
								t1.l3_cid, t1.brand_cid, t1.price, t1.cost, coalesce(t1.total_inventory,0) AS inv_oh
								FROM
								price_markdown_opt_temp.syn_ss_temp1_%1$s_%2$s t1 )a2
							ON a1.strategy_id = a2.strategy_id
							WHERE date >= include_from_date  ;',in_strategy_id,_version,inv_dates);

    raise notice 'query- 3 --%' , vl_test_query;
	start_time := clock_timestamp();
	execute vl_test_query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken SQL 3 statement: %', end_time - start_time;
-------------------------
			vl_test_query :=  format('create unlogged table  price_markdown_opt_temp.syn_ssdd_temp4_%1$s_%2$s as
			SELECT d1.*, d3.day_ratio_bnm, d3.day_ratio_ecom, d5.markdown_percentage_rounded, d5.markdown_percentage_exact,
			d6.store_ratio
			FROM
			price_markdown_opt_temp.syn_ssd_temp3_%1$s_%2$s d1
             left join
                        (SELECT dates, day_ratio_bnm, day_ratio_ecom, l3_cid, brand_cid
                        FROM price_markdown_opt.mvm_day_split_%1$s c2
                        WHERE c2.dates > ''%3$s'' AND c2.dates <=''%4$s'' ) d3
               on d3.l3_cid = d1.l3_cid
			 and d3.brand_cid = d1.brand_cid
              and d3.dates = d1.date
             left join price_markdown_opt_temp.syn_ssp_temp2_%1$s_%2$s d5
             on d1.product_level_id = d5.product_level_id
             and d1.store_level_id = d5.store_level_id
             and d1.event = d5.pcd_id
			left join price_markdown_opt.mvm_store_split_%1$s d6
			on d1.product_id = d6.product_id
			and d1.store_id = d6.store_id
			and d1.weeks_start_date = d6.week_start_date;',in_strategy_id,_version,inv_dates,sim_end_date);

    raise notice 'query- 4 A --%' , vl_test_query;
	start_time := clock_timestamp();
	execute vl_test_query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken SQL 4A statement: %', end_time - start_time;
	-------------
            vl_test_query :=  format('CREATE unlogged TABLE IF NOT EXISTS price_markdown_opt_temp.tb_%1$s_%2$s_ssd_temp AS
			select e1.*,
			case when store_id = 7789 then coalesce(((ecom_elasticity * (markdown_percentage_exact - e2.base_percentage) / 100) + 1) * e2.ecom_sales_units * e1.day_ratio_ecom * e1.store_ratio, 0)
			else coalesce(((bnm_elasticity * (markdown_percentage_exact - e2.base_percentage) / 100) + 1) * e2.bnm_sales_units * e1.day_ratio_bnm * e1.store_ratio, 0) end as sales_units_bef_cap from
            price_markdown_opt_temp.syn_ssdd_temp4_%1$s_%2$s e1, price_markdown_opt.mvm_sim_%1$s e2
			 where e1.weeks_start_date = e2.week_start_date
			 AND e1.markdown_percentage_rounded = e2.base_percentage
			 AND e1.product_id = e2.product_id
			 and e2.week_start_date BETWEEN ''%3$s'' AND ''%4$s'';',in_strategy_id,_version,sim_start_date,sim_end_date);
	raise notice 'query- Final --%' , vl_test_query;
	start_time := clock_timestamp();
	execute vl_test_query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken final statement: %', end_time - start_time;
		RETURN true;
  end;
$function$
;