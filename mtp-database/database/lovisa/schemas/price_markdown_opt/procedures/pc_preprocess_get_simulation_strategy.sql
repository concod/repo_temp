--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_preprocess_get_simulation_strategy_26022026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_get_simulation_strategy

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_get_simulation_strategy;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_simulation_strategy(
IN _sim_opt text, IN _strategy_id integer, IN _strategy_pcd text, 
IN _fiscal_date_mapping text, IN _stg_start_date date, IN _stg_end_date date, 
IN _product_master text, IN _discounts_filter_table text, IN _applicable_prices_discounts text,
IN _forex_rate text, IN _currency_type text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_sim_opt_query text;
begin
   _sim_opt_query = format(
        'DROP TABLE IF EXISTS %1$s;
        CREATE TABLE IF NOT EXISTS %1$s AS
        (
	    with price_discounts_base as(
			-- select 
            -- 	product_id, country_id, currency_id, stat_id, 
            --     selling_price_with_vat, effective_opt_discount_exact
			-- from %8$s
            -- union distinct 
            select distinct
            	product_id, country_id, currency_id, stat_id, 
                selling_price_with_vat, effective_opt_discount_exact
            from %9$s
		),

        app_price_discounts_base as(
        select pdb.*, pm.l3_cid
        from price_discounts_base pdb
        left join %7$s pm
        on pdb.product_id = pm.product_id
        ),
		
		pcd_week as (
                select 
					pcd_id, 
					pcd_start_date as start_date, 
					pcd_end_date as end_date, 
					weeks_start_date as week_start_date
                from %3$s b1
                inner join %4$s fdm 
                ON fdm.date >= b1.pcd_start_date
                and fdm.date <= b1.pcd_end_date
                where strategy_id = %2$s
                and pcd_start_date >= ''%5$s''
                and pcd_end_date <= ''%6$s''
                group by 1,2,3,4
        ),
		
		forex_ct as (
				-- conversion multipliers to AUD
				SELECT  source_currency_id, target_currency_id, planned_conversion_multiplier
				FROM %10$s
				where date = (select max(date) from %10$s)
				and target_currency_id = 2
		),

        sim_filtered as
        (
			select 
				sim.product_id, sim.week_start_date, sim.base_percentage, 
				sim.bnm_sales_units, sim.bnm_elasticity, 
                sim.ecom_sales_units, sim.ecom_elasticity,
				d.l3_cid, d.country_id, d.currency_id, d.stat_id, 
                d.selling_price_with_vat, d.effective_opt_discount_exact
			from 
				price_markdown_opt.mvm_sim_%2$s sim
			INNER join app_price_discounts_base d
			on sim.product_id = d.product_id
			and sim.base_percentage = floor(d.effective_opt_discount_exact/5)*5
        )

        select 
               sm.product_id,
               fr.target_currency_id as currency_id,
			   sm.country_id,
               pcd_id as event,
			   stat_id,
               selling_price_with_vat*planned_conversion_multiplier as selling_price_with_vat,
			   avg(effective_opt_discount_exact) as effective_opt_discount,
               CONCAT(''percent_off_'', CAST(avg(effective_opt_discount_exact) as text)) as offer_identifier,
               sm.week_start_date as week_start_date,
               sum(coalesce (((bnm_elasticity * (effective_opt_discount_exact - base_percentage) / 100) + 1) * day_ratio_bnm * bnm_sales_units,0)) as pred_qty_bnm,
               sum(coalesce (((ecom_elasticity * (effective_opt_discount_exact - base_percentage) / 100) + 1) * day_ratio_ecom * ecom_sales_units,0)) as pred_qty_ecom
               
			   from sim_filtered sm
               inner join pcd_week pw 
               on sm.week_start_date =pw.week_start_date
               inner join 
               price_markdown_opt.mvm_day_split_%2$s ds
               on ds.date between start_date and end_date
               and ds.l3_cid = sm.l3_cid
               and ds.week_start_date = sm.week_start_date
			   inner join forex_ct fr 
			   on fr.source_currency_id = sm.currency_id
               group by 1,2,3,4,5,6,9
        );',
        _sim_opt, _strategy_id, _strategy_pcd, _fiscal_date_mapping, _stg_start_date, _stg_end_date, 
		_product_master, _discounts_filter_table, _applicable_prices_discounts, _forex_rate, _currency_type);
    raise notice 'Sim strategy opt query : %', _sim_opt_query;
   execute _sim_opt_query;
END;
$procedure$
;
