--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_preprocess_get_discount_based_opt_clusters_20022026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_get_discount_based_opt_clusters

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_get_discount_based_opt_clusters;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_discount_based_opt_clusters(IN _opt_clusters_table_name text, IN _discount_base text, IN _psf_table text, IN _tb_strategy_sku_store_mapping text, IN _strategy_id integer,  IN _currency_type text) 
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_opt_clusters_query text;
BEGIN
    _opt_clusters_query = format('DROP TABLE IF EXISTS %1$s;

        CREATE TABLE %1$s AS
        WITH base AS
        (
            SELECT
                product_level_id,
                store_level_id,
                discounts,
                dense_rank() OVER (ORDER BY discounts) AS opt_cluster_num
            FROM
                %2$s
        ),
        sku_store_mapping AS (
            SELECT DISTINCT
                product_level_id,
                store_level_id,
                CASE
                    WHEN ''%6$s'' = ''local''      THEN -300 - s1_id
                    WHEN ''%6$s'' = ''dominating''  THEN -400 - s0_id
                    ELSE -501
                END AS cntry_cluster_num
            FROM %4$s_%5$s ssm
            INNER JOIN price_markdown.tb_store_master sm
                ON ssm.store_id = sm.store_id
        )
        SELECT
            tsssm.product_level_id,
            tsssm.store_level_id,
            CONCAT(tsssm.product_level_id, ''_'', tsssm.store_level_id) AS opt_level_bins,
            CONCAT(cntry_cluster_num, ''_'', COALESCE(opt_cluster_num, 0)) AS opt_cluster
        FROM sku_store_mapping tsssm
        LEFT JOIN base
        ON tsssm.product_level_id = base.product_level_id
        AND tsssm.store_level_id = base.store_level_id;
    ', _opt_clusters_table_name, _discount_base, _psf_table, _tb_strategy_sku_store_mapping, _strategy_id, _currency_type);
	raise notice 'discount based opt clusters query : %', _opt_clusters_query;
	execute _opt_clusters_query;
END $procedure$
;