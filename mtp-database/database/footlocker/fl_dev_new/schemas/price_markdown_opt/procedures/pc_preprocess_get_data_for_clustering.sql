--liquibase formatted sql
--changeset liquibase:pc_preprocess_get_data_for_clustering_v2508 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_get_data_for_clustering_v2508

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_get_data_for_clustering;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_data_for_clustering(IN _store_cluster_data_table_name text, IN _store_cluster_base_table text, IN _total_clusters integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_get_store_cluster_data_query text;
BEGIN

     _get_store_cluster_data_query = format('DROP TABLE IF EXISTS %1$s;
    		CREATE TABLE %1$s AS
        (
            WITH bins_data AS
            (
                SELECT bin_id,
                       row_cnt,
                       items_cnt,
                       SUM(inv_oh) AS inv_oh
                FROM %2$s
                GROUP BY 1, 2, 3
            ),

            total_inv_data AS
            (
                SELECT *,
                       SUM(inv_oh) OVER () AS total_inv,
                       inv_oh / SUM(inv_oh) OVER () AS inv_contribution,
                       GREATEST(ROUND(row_cnt / (100 * items_cnt)), 1) AS min_cluster_num,
                       CEIL((%3$s / items_cnt) * inv_oh / SUM(inv_oh) OVER ()) AS derived_clusters_num
                FROM bins_data
            )

            SELECT *,
                   CASE WHEN num_clus = row_cnt THEN 1 ELSE 0 END AS max_clusters_reached
            FROM
            (
                SELECT *,
                       LEAST(GREATEST(min_cluster_num, derived_clusters_num), row_cnt) AS num_clus
                FROM total_inv_data
            ) a
        );
    ', _store_cluster_data_table_name, _store_cluster_base_table, _total_clusters);
   raise notice 'get store cluster data query : %', _get_store_cluster_data_query;
  execute _get_store_cluster_data_query;
END;
$procedure$
;
