--liquibase formatted sql
--changeset liquibase:pc_preprocess_get_store_cluster_base runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_get_store_cluster_base

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_get_store_cluster_base;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_store_cluster_base(IN _store_cluster_base_table_name text, IN _store_cluster_temp_base text, IN _store_cluster_data text, IN _rank_filter integer, IN _additional_clusters integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_get_store_cluster_base_query text;
BEGIN
    _get_store_cluster_base_query = FORMAT(
   'DROP TABLE IF EXISTS %1$s;
    CREATE TABLE %1$s AS
        (
            WITH clusters_base AS
            (
                SELECT bin_id,
                       CASE WHEN bin_id <= %4$s THEN num_clus + %5$s
                            ELSE num_clus
                       END AS adj_num_clus
                FROM %3$s
            ),
            clusters_split AS
            (
                SELECT bin_id,
                       adj_num_clus,
                       CAST(CEIL(SQRT(adj_num_clus)) AS INT) AS ntile_value
                FROM clusters_base
            ),
            sc_agg AS
            (
                SELECT bin_id,
                       product_level_id,
                       store_id,
                       SUM(inv_oh) AS inv_oh,
                       SUM(store_ratio * inv_oh) / SUM(inv_oh) AS store_ratio
                FROM %2$s
                GROUP BY 1, 2, 3
            ),
            base AS
            (
                SELECT a.*,
                       ntile(ntile_value) OVER (PARTITION BY bin_id ORDER BY a.inv_oh) AS n_cluster_inv,
                       ntile(ntile_value) OVER (PARTITION BY bin_id ORDER BY a.store_ratio) AS n_cluster_store_ratio
                FROM sc_agg a
                JOIN clusters_split b
                USING (bin_id)
            )
            SELECT a.*,
                   n_cluster_inv,
                   n_cluster_store_ratio,
                   CONCAT(base.bin_id, ''_'', dense_rank() OVER (PARTITION BY base.bin_id ORDER BY n_cluster_inv, n_cluster_store_ratio)) AS n_cluster
            FROM base
            JOIN %2$s a
            USING (product_level_id, store_id)
        );
    ', _store_cluster_base_table_name, _store_cluster_temp_base, _store_cluster_data, _rank_filter, _additional_clusters);
   raise notice 'get store cluster base query : %', _get_store_cluster_base_query;
  execute _get_store_cluster_base_query;
END;
$procedure$
;
