--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co::fn_stg_sync_ssd_insertion_15122025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_stg_sync_ssd_insertion_15122025

DROP FUNCTION IF EXISTS price_markdown_opt.fn_stg_sync_ssd_insertion(in_strategy_id integer, _stg_disc_ref text, _version text, curr_pcd_start_date date);

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_stg_sync_ssd_insertion(in_strategy_id integer, _stg_disc_ref text, _version text, curr_pcd_start_date date)
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

			execute format('drop table if exists price_markdown_opt_temp.syn_ssdd_temp5_%1$s_%2$s ;',in_strategy_id,_version);
			vl_test_query :=  format('create unlogged table price_markdown_opt_temp.syn_ssdd_temp5_%1$s_%2$s AS
				SELECT e1.strategy_id, e1.event, e1.start_date, e1.end_date, e1.date, e1.weeks_start_date,
                e1.product_id, e1.store_id, e1.product_level_id, e1.store_level_id, e1.include_from_date,
                e1.opt_level_bins, e1.l3_cid, e1.l0_cid, e1.inv_oh,
                e1.day_split_ratio, e1.markdown_percentage_exact,
				e1.sales_units_bef_cap,
				SUM(coalesce(e1.sales_units_bef_cap, 0)) OVER(PARTITION BY e1.product_id, e1.store_id ORDER BY e1.date
				ROWS UNBOUNDED PRECEDING) AS cumsum_sales,
			    coalesce(e1.markdown_percentage_exact, e1.markdown_percentage_rounded)::decimal AS effective_promo_discount,
				e1.currency_id,e1.msrp, e1.cost, e1.msrp_with_vat
			    FROM price_markdown_opt_temp.tb_%1$s_%2$s_ssd_temp e1;',in_strategy_id, _version);

			raise notice 'query- 1 --%' , vl_test_query;
			start_time := clock_timestamp();
			execute vl_test_query;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;

			execute format('drop table if exists price_markdown_opt_temp.syn_ssdd_temp6_%1$s_%2$s ;',in_strategy_id, _version);
			vl_test_query :=  format('create unlogged table price_markdown_opt_temp.syn_ssdd_temp6_%1$s_%2$s AS
								SELECT *,
									CASE WHEN (inv_oh - cumsum_sales) < 0
									THEN CASE WHEN (sales_units_bef_cap + (inv_oh - cumsum_sales))> 0
											  THEN (sales_units_bef_cap + (inv_oh - cumsum_sales))
											  ELSE 0 END
									ELSE sales_units_bef_cap END AS sales_units,
									CASE WHEN (sales_units_bef_cap + (inv_oh - cumsum_sales))> 0
										 THEN (sales_units_bef_cap + (inv_oh - cumsum_sales))
										 ELSE 0 END AS start_day_inv
								FROM price_markdown_opt_temp.syn_ssdd_temp5_%1$s_%2$s;',in_strategy_id, _version);

			raise notice 'query- 2 --%' , vl_test_query;
			start_time := clock_timestamp();
			execute vl_test_query;
			end_time := clock_timestamp();
			RAISE NOTICE 'Time taken SQL 2 statement: %', end_time - start_time;

            vl_test_query :=format('create unlogged table price_markdown_opt_temp.syn_ssd_prevpcd_temp7_%1$s_%2$s  as
                 SELECT
                    q1.strategy_id, l3_cid, l0_cid, product_id, q1.product_level_id, q1.store_level_id, opt_level_bins,
                    store_id, date as recommendation_date, weeks_start_date, EVENT as pcd_id, start_date, end_date,
                    effective_promo_discount as recommended_offer_percentage, sales_units_bef_cap as sales_units_uncapped,
					channel_info, sales_units, inv_oh, start_day_inv, previous_markdown_percentage,
					99 as end_rule,
					q1.currency_id, q1.msrp, q1.cost, q1.msrp_with_vat
                    FROM price_markdown_opt_temp.syn_ssdd_temp6_%1$s_%2$s  q1
					inner join price_markdown.tb_strategy_discount%3$s q2
                                    on q1.product_level_id =  q2.product_level_id
                                    and q1.store_level_id = q2.store_level_id
                                    and q1.event = q2.pcd_id ;',in_strategy_id, _version, _stg_disc_ref);
	raise notice 'query- 5 --%' , vl_test_query;
	start_time := clock_timestamp();
	execute vl_test_query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken SQL 5 statement: %', end_time - start_time;

	execute format('drop table if exists price_markdown_opt_temp.syn_ssd_temp8_%1$s_%2$s;',in_strategy_id, _version);

	         vl_test_query := format('create unlogged table price_markdown_opt_temp.syn_ssd_temp8_%1$s_%2$s  as
                        SELECT tb1.*,
						CASE WHEN end_rule is NULL
                             THEN ROUND(CAST(msrp*(1-recommended_offer_percentage/100) as numeric), 2)
                             ELSE ROUND(cast(msrp*(1-recommended_offer_percentage/100)-(end_rule::numeric/100) as numeric))+(end_rule::numeric/100)
                             END as effective_price_point,
                        COALESCE(round(CAST(msrp *(1-recommended_offer_percentage / 100)* sales_units AS numeric),2),0) AS revenue,
                        COALESCE(round(CAST((msrp *(1-recommended_offer_percentage / 100)-cost)* sales_units AS numeric),2),0) AS margin,
						CASE WHEN (start_day_inv - sales_units) < 0 THEN 0 ELSE (start_day_inv - sales_units)
									END as rem_inv,
						COALESCE(CAST(((msrp * recommended_offer_percentage * sales_units)/100) AS NUMERIC),0) as spend,
						CASE WHEN end_rule is NULL
                             THEN ROUND(CAST(msrp_with_vat*(1-recommended_offer_percentage/100) as numeric), 2)
                             ELSE ROUND(cast(msrp_with_vat*(1-recommended_offer_percentage/100)-(end_rule::numeric/100) as numeric))+(end_rule::numeric/100)
                             END as effective_price_point_with_vat,
                        COALESCE(round(CAST(msrp_with_vat *(1-recommended_offer_percentage / 100)* sales_units AS numeric),2),0) AS revenue_with_vat,
                        COALESCE(round(CAST((msrp_with_vat *(1-recommended_offer_percentage / 100)-cost)* sales_units AS numeric),2),0) AS margin_with_vat,
						COALESCE(CAST(((msrp_with_vat * recommended_offer_percentage * sales_units)/100) AS NUMERIC),0) as spend_with_vat,
                    current_timestamp as created_at, current_timestamp as updated_at
            		FROM price_markdown_opt_temp.syn_ssd_prevpcd_temp7_%1$s_%2$s tb1;',in_strategy_id, _version);
	raise notice 'query- Final --%' , vl_test_query;
	start_time := clock_timestamp();
	execute vl_test_query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken final statement: %', end_time - start_time;

	execute format('drop table if exists price_markdown_opt_temp.syn_ss_temp1_%1$s_%2$s ;',in_strategy_id, _version);
	execute format('drop table if exists price_markdown_opt_temp.syn_ssd_temp3_%1$s_%2$s ;',in_strategy_id, _version);
	execute format('drop table if exists price_markdown_opt_temp.syn_ssp_temp2_%1$s_%2$s ;',in_strategy_id, _version);
    execute format('drop table if exists price_markdown_opt_temp.syn_ssdd_temp4_%1$s_%2$s ;',in_strategy_id, _version);
	execute format('drop table if exists price_markdown_opt_temp.tb_%1$s_%2$s_ssd_temp ;',in_strategy_id, _version);
	execute format('drop table if exists price_markdown_opt_temp.syn_ssdd_temp5_%1$s_%2$s ;',in_strategy_id,_version);
	execute format('drop table if exists price_markdown_opt_temp.syn_ssdd_temp6_%1$s_%2$s ;',in_strategy_id, _version);
	execute format('drop table if exists price_markdown_opt_temp.syn_ssd_prevpcd_temp7_%1$s_%2$s ;',in_strategy_id, _version);

    RETURN true;
  end;
$function$
;