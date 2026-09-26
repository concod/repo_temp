--liquibase formatted sql
--changeset liquibase:pc_preprocess_get_discount_base_for_clustering runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_get_discount_base_for_clustering

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_get_discount_base_for_clustering;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_discount_base_for_clustering(IN _strategy_id integer, IN _discount_base_table_name text, IN _tb_strategy_discount text, IN _tb_strategy_pcd text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_discount_base_store_cluster_query text;
BEGIN
    _discount_base_store_cluster_query = format(' DROP TABLE IF EXISTS %2$s;
        CREATE TABLE %2$s AS
        (
        WITH past_discounts_cte AS
        (
            SELECT store_level_id, product_level_id, tsdf.pcd_id AS event, pcd_start_date,
                   CAST(markdown_percentage AS text) AS offer_identifier
            FROM %3$s tsdf
            INNER JOIN
            (
                SELECT strategy_id, pcd_id, pcd_start_date
                FROM %4$s
                WHERE strategy_id = %1$s
                  AND pcd_start_date <= CURRENT_DATE
            ) tsp
            ON tsdf.strategy_id = tsp.strategy_id
            GROUP BY 1,2,3,4,5
        ),

        future_pcd AS
        (
            SELECT pcd_id, pcd_start_date
            FROM %4$s
            WHERE strategy_id = %1$s
              AND pcd_start_date > CURRENT_DATE
            GROUP BY 1,2
        ),

        base AS
        (
            SELECT * FROM
            (
                SELECT
                    product_level_id, store_level_id, tsd.pcd_id AS event, pcd_start_date,
                    CAST(CASE WHEN is_locked = 1 THEN markdown_percentage ELSE -1 END AS text) AS offer_identifier
                FROM %3$s tsd
                INNER JOIN future_pcd fp
                ON tsd.pcd_id = fp.pcd_id
                WHERE is_locked = 1
                  AND strategy_id = %1$s
            ) cro
            UNION ALL
            SELECT product_level_id, store_level_id, event, pcd_start_date, offer_identifier
            FROM past_discounts_cte
        )

        SELECT product_level_id, store_level_id, discounts FROM
        (
            SELECT product_level_id, store_level_id,
                   array_agg(offer_identifier) OVER (PARTITION BY product_level_id, store_level_id ORDER BY pcd_start_date) AS discounts,
                   row_number() OVER (PARTITION BY product_level_id, store_level_id ORDER BY pcd_start_date DESC) AS rnk
            FROM base
        ) a
        WHERE rnk = 1
        );
    ',
    _strategy_id,
    _discount_base_table_name,
    _tb_strategy_discount,
    _tb_strategy_pcd
    );
   raise notice 'Discount base for store clustering query : %', _discount_base_store_cluster_query;
  execute _discount_base_store_cluster_query;
END;
$procedure$
;
