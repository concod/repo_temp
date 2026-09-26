--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:pc_strategy_sync_temp_inv runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_strategy_sync_temp_inv

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_strategy_sync_temp_inv(
    IN _inventory_table TEXT,
    IN _txn_master_table TEXT,
    IN _tb_temp_sync_inv TEXT
);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_strategy_sync_temp_inv(
    IN _inventory_table TEXT,
    IN _txn_master_table TEXT,
    IN _tb_temp_sync_inv TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_tb_temp_sync_inv_query text;
BEGIN

    _tb_temp_sync_inv_query = format('TRUNCATE %3$s;

		WITH base AS (
            SELECT tb1.date, tb1.product_id, tb1.store_id,
                   CASE WHEN (COALESCE(tb1.total_inventory, 0) - COALESCE(tb2.quantity, 0)) < 0 THEN 0
                        ELSE (COALESCE(tb1.total_inventory, 0) - COALESCE(tb2.quantity, 0))
                   END AS total_inventory
            FROM %1$s tb1
            LEFT JOIN %2$s tb2
            ON tb1.date = tb2.date_id
			AND tb1.product_id = tb2.product_id
			AND tb1.store_id = tb2.store_id
        )
        INSERT INTO %3$s (dates, product_id, store_id, total_inventory)
        SELECT date, product_id, store_id, total_inventory
        FROM base;',
        _inventory_table,
        _txn_master_table,
        _tb_temp_sync_inv
    );
   raise notice '_tb_temp_sync_inv_query : %', _tb_temp_sync_inv_query;
  execute _tb_temp_sync_inv_query;
END;
$procedure$;