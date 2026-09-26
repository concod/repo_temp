--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:pc_preprocess_create_store_cluster_temp_base_15122025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_create_store_cluster_temp_base_15122025

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_create_store_cluster_temp_base;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_create_store_cluster_temp_base(IN _strategy_id integer, IN _store_cluster_temp_base_table_name text, IN _inventory_table text, IN _tb_strategy_sku_store_mapping text, IN _store_split text, IN _discount_base text, IN _custom_rules text, IN _store_reco text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_create_store_cluster_temp_base_query text;
BEGIN
    _create_store_cluster_temp_base_query = format('
        DROP TABLE IF EXISTS %2$s;
        CREATE TABLE %2$s AS
        (
        WITH base AS
        (
            SELECT t2.product_id AS product_id,
                   product_level_id,
                   store_level_id,
                   t2.store_id,
                   t2.channel_info,
                   AVG(ss.store_split_ratio) AS store_ratio,
                   SUM(total_inventory) AS inv_oh
            FROM %3$s tiolm
            INNER JOIN
            (
                SELECT product_id, store_id, store_level_id, product_level_id, channel_info
                FROM %4$s
                WHERE strategy_id = %1$s
            ) t2
            ON tiolm.product_id = t2.product_id
            AND tiolm.store_id = t2.store_id
            INNER JOIN %5$s ss
            ON t2.product_id = ss.product_id
            AND t2.store_id = ss.store_id
            GROUP BY 1,2,3,4,5
            ORDER BY inv_oh DESC
        )',
        _strategy_id, _store_cluster_temp_base_table_name, _inventory_table, _tb_strategy_sku_store_mapping, _store_split);

    IF _store_reco = 'Store' or _store_reco = 'store' THEN
        _create_store_cluster_temp_base_query = _create_store_cluster_temp_base_query || format('
            SELECT *,
                   DENSE_RANK() OVER (ORDER BY bin_inv DESC, product_level_id, channel_info, discounts, rules) AS bin_id
            FROM
            (
                SELECT a.*,
                       discounts,
                       rules,
                       COUNT(*) OVER (PARTITION BY a.product_level_id, channel_info, discounts, rules) AS row_cnt,
                       SUM(inv_oh) OVER (PARTITION BY a.product_level_id, channel_info, discounts, rules) AS bin_inv
            ');
    ELSE
        _create_store_cluster_temp_base_query = _create_store_cluster_temp_base_query || format('
            SELECT *,
                   DENSE_RANK() OVER (ORDER BY bin_inv DESC, product_level_id, store_level_id, discounts, rules) AS bin_id
            FROM
            (
                SELECT a.*,
                       discounts,
                       rules,
                       COUNT(*) OVER (PARTITION BY a.product_level_id, a.store_level_id, discounts, rules) AS row_cnt,
                       SUM(inv_oh) OVER (PARTITION BY a.product_level_id, a.store_level_id, discounts, rules) AS bin_inv
            ');
    END IF;

    _create_store_cluster_temp_base_query = _create_store_cluster_temp_base_query || format('
            FROM base a
            LEFT JOIN %1$s b
            ON a.product_level_id = b.product_level_id
            AND a.store_level_id = b.store_level_id
            LEFT JOIN
            (
                SELECT DISTINCT product_level_id,
                                store_level_id,
                                STRING_AGG(CONCAT(rule_type_id, ''_'', min_value, ''_'', max_value, ''_'', applicable_value), ''_'')
                                OVER (PARTITION BY product_level_id, store_level_id ORDER BY rule_type_id) AS rules
                FROM %2$s
            ) e
            ON a.product_level_id = e.product_level_id
            AND a.store_level_id = e.store_level_id
        ) c
        JOIN
        (
            SELECT product_level_id,
                   COUNT(DISTINCT product_id) AS items_cnt
            FROM base
            GROUP BY 1
        ) d
        USING(product_level_id));
    ',
    _discount_base, _custom_rules
    );
   raise notice 'Store Cluster Base Query: %', _create_store_cluster_temp_base_query;
  execute _create_store_cluster_temp_base_query;
END;
$procedure$
;
