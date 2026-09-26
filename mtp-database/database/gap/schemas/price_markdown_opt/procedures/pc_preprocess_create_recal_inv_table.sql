--liquibase formatted sql
--changeset liquibase:pc_preprocess_create_recal_inv_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_create_recal_inv_table

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_create_recal_inv_table;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_create_recal_inv_table(IN _recal_inv_table text, IN _tb_strategy_sku_store_mapping text, IN _stg_ssd_reco text, IN _inventory_table text, IN _strategy_id integer, IN _execution_id integer, IN _current_pcd_end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_create_recal_inv_query text;
	_create_recal_inv_index_query text;
BEGIN
    _create_recal_inv_query = format('DROP TABLE IF EXISTS %1$s;

        CREATE TABLE IF NOT EXISTS %1$s AS (
            SELECT a1.product_id AS product_id,
                   a1.store_id AS store_id,
                   COALESCE(rem_inv, a2.total_inventory, 0) AS total_inventory,
                   COALESCE(a2.total_inventory, 0) AS curr_pcd_inv
            FROM
                (
                SELECT product_id, store_id
                FROM %2$s
                WHERE strategy_id = %5$s
                ) a1
            LEFT JOIN
                (
                SELECT product_id, store_id, rem_inv
                FROM %3$s
                WHERE recommendation_date = ''%6$s''
                ) t1
            ON a1.product_id = t1.product_id
            AND a1.store_id = t1.store_id
            INNER JOIN
                %4$s AS a2
            ON a1.product_id = a2.product_id
            AND a1.store_id = a2.store_id
            GROUP BY 1, 2, 3, 4
        );
    ', _recal_inv_table, _tb_strategy_sku_store_mapping, _stg_ssd_reco, _inventory_table, _strategy_id, _current_pcd_end_date);

   raise notice 'recal inv query : %', _create_recal_inv_query;

  -- Create an index on the newly created table
    _create_recal_inv_index_query = format('
        CREATE INDEX item_store_idx_%1$s_%2$s ON %3$s
        USING btree (product_id, store_id);
    ', _strategy_id, _execution_id, _recal_inv_table);
    raise notice 'recal inv index query : %', _create_recal_inv_index_query;

   execute _create_recal_inv_query;
  execute _create_recal_inv_index_query;

END;
$procedure$
;
