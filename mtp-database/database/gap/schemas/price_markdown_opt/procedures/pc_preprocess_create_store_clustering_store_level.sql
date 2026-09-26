--liquibase formatted sql
--changeset liquibase:pc_preprocess_create_store_clustering_store_level runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_create_store_clustering_store_level

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_create_store_clustering_store_level;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_create_store_clustering_store_level(IN _store_level_cluster_table_name text, IN _store_cluster_base text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_store_level_cluster_table_query text;
BEGIN
    _store_level_cluster_table_query = format('DROP TABLE IF EXISTS %1$s;
        CREATE TABLE %1$s AS
        (
            SELECT product_level_id,
                   store_level_id,
                   store_id,
                   SUM(inv_oh) AS inv_oh,
                   n_cluster
            FROM %2$s
            GROUP BY product_level_id, store_level_id, store_id, n_cluster
        );
    ', _store_level_cluster_table_name, _store_cluster_base);
   raise notice 'store level cluster table query : %', _store_level_cluster_table_query;
  execute _store_level_cluster_table_query;
END;
$procedure$
;
