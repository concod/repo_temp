--liquibase formatted sql
--changeset liquibase:pc_preprocess_create_item_opt_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_create_item_opt_mapping

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_create_item_opt_mapping;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_create_item_opt_mapping(IN _item_opt_mapping text, IN _tb_strategy_sku_store_mapping text, IN _product_master text, IN _strategy_id integer, IN _execution_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_item_opt_mapping_query text;
	_item_opt_mapping_index_query text;
BEGIN
    _item_opt_mapping_query = format('DROP TABLE IF EXISTS %1$s;

        CREATE TABLE IF NOT EXISTS %1$s AS
        (
            SELECT
                tsssm.product_id,
                tsssm.store_id,
                pm.l4_id,
                CONCAT(CAST(product_level_id AS TEXT), ''_'', CAST(store_level_id AS TEXT)) AS Opt_level_bins,
                include_from_date
            FROM
                %2$s tsssm
            INNER JOIN (
                SELECT
                    t1.product_id,
                    t1.l4_id
                FROM
                    %3$s t1
                GROUP BY
                    1, 2
            ) pm
            ON tsssm.product_id = pm.product_id
            WHERE strategy_id = %4$s
            GROUP BY
                1, 2, 3, 4, 5
        );
    ', _item_opt_mapping, _tb_strategy_sku_store_mapping, _product_master, _strategy_id);

   	raise notice 'item opt mapping query : %', _item_opt_mapping_query;

    -- Create an index on the newly created table
    _item_opt_mapping_index_query = format('
        CREATE INDEX item_store_idx_%1$s_%2$s ON %3$s
        USING btree (product_id, store_id);
    ', _strategy_id, _execution_id, _item_opt_mapping);
   raise notice 'item opt mapping index query : %', _item_opt_mapping_index_query;
  execute _item_opt_mapping_query;
 	execute _item_opt_mapping_index_query;
END;
$procedure$
;
