--liquibase formatted sql
--changeset liquibase:pc_preprocess_create_opt_bin_mapping_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_create_opt_bin_mapping_table

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_create_opt_bin_mapping_table;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_create_opt_bin_mapping_table(IN _opt_bin_mapping_table_name text, IN _store_cluster_table text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_opt_bin_mapping_query text;
BEGIN
    _opt_bin_mapping_query = format('DROP TABLE IF EXISTS %1$s ;
        CREATE TABLE %1$s AS
        (
            SELECT product_level_id,
                   store_level_id,
                   CONCAT(product_level_id, ''_'', store_level_id) AS opt_level_bins,
                   CONCAT(product_level_id, ''_'', n_cluster) AS new_opt_level_bins,
                   n_cluster
            FROM %2$s
        );
    ', _opt_bin_mapping_table_name, _store_cluster_table);
   raise notice 'opt bin mapping query : %', _opt_bin_mapping_query;
  execute _opt_bin_mapping_query;
END;
$procedure$
;
