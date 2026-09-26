--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:pc_preprocess_create_psf_opt_26112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_create_psf_opt

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_create_psf_opt;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_create_psf_opt(IN _psf_opt text, IN _strategy_id integer, IN _tb_strategy_sku_store_mapping text, 
IN _store_cluster text, IN _recal_inv_table text, IN _inventory_table text, IN _records_cnt integer, 
IN _max_records_allowed integer, IN _store_reco text, IN _actual_exist integer, IN _store_master text, 
IN _forex_rate text, IN _vat_master text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_psf_opt_query text;
	_psf_clause_1 text;
	_psf_clause_2 text;
	_psf_clause_3 text;

begin
	_psf_clause_1 = CASE WHEN _records_cnt > _max_records_allowed AND _store_reco != 'Store' THEN 'cluster_store_h6' ELSE 'opt.store_id' end;

	_psf_clause_2 = CASE WHEN _actual_exist = 1 THEN _recal_inv_table ELSE _inventory_table end;

	_psf_clause_3 = CASE WHEN _records_cnt > _max_records_allowed AND _store_reco != 'Store' THEN
        'SELECT product_id, cluster_store_h6 AS store_id, Opt_level_bins, sku_id, vat_percent, SUM(inv_oh) AS inv_oh, AVG(cost_price) as cost_price, AVG(original_price) as original_price'
    ELSE
        'SELECT product_id, store_id, Opt_level_bins, sku_id, vat_percent, SUM(inv_oh) AS inv_oh, AVG(cost_price) as cost_price, AVG(original_price) as original_price'
    end;

   _psf_opt_query = format('DROP TABLE IF EXISTS %1$s;

        CREATE TABLE IF NOT EXISTS %1$s AS (
            WITH opt_level AS (
                SELECT
                    sku.product_id,
                    sku.store_id,
                    t2.cluster_store_h6 AS cluster_store_h6,
                    sku.product_level_id,
                    sku.store_level_id,
                    CONCAT(CAST(sku.product_level_id AS TEXT), ''_'', CAST(sku.store_level_id AS TEXT)) AS Opt_level_bins,
					sku.cost,
					sku.price,
					sku.currency_id as local_currency
                FROM
                    (select *
	                from %2$s sku
	                where sku.strategy_id = %3$s) sku
                LEFT JOIN (
                    SELECT
                        product_level_id,
                        store_level_id,
                        store_id,
                        CAST(n_cluster AS TEXT) AS cluster_store_h6
                    FROM
                        %4$s
                ) t2
                ON sku.store_id = t2.store_id
                AND sku.store_level_id = t2.store_level_id
                AND sku.product_level_id = t2.product_level_id
						
                GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
            ),
			forex_ct as (
				-- conversion multipliers to AUD
				SELECT  source_currency_id, target_currency_id, planned_conversion_multiplier
				FROM %9$s afr
				where date = (select max(date) from %9$s)
				and target_currency_id = 2
			),
            inv_opt AS (
                SELECT
                    opt.*,
                    CONCAT(opt.product_id, ''_'', CAST(%5$s AS TEXT)) AS sku_id,
                    COALESCE(iv.total_inventory, 0) AS inv_oh,
					opt.cost*planned_conversion_multiplier as cost_price,
					opt.price*planned_conversion_multiplier as original_price,
					vm.vat_percentage as vat_percent
                FROM
                    opt_level opt
                INNER JOIN %6$s iv
                ON opt.product_id = iv.product_id
                AND opt.store_id = iv.store_id
				INNER JOIN forex_ct f 
				ON f.source_currency_id = opt.local_currency
				INNER JOIN %8$s sm
				ON opt.store_id = sm.store_id
				INNER JOIN %10$s vm
				ON vm.s1_id = sm.s1_id
            )
            %7$s
            FROM
                inv_opt
            GROUP BY 1, 2, 3, 4, 5
        );
    ',
    _psf_opt,
    _tb_strategy_sku_store_mapping,
    _strategy_id,
    _store_cluster,
    _psf_clause_1,
    _psf_clause_2,
    _psf_clause_3,
    _store_master,
    _forex_rate,
    _vat_master
    );
	raise notice 'product store filter query : %', _psf_opt_query;
	execute _psf_opt_query;
END;
$procedure$
;
