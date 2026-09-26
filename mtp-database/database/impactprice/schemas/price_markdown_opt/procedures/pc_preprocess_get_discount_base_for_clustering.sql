--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co::pc_preprocess_get_discount_base_for_clustering_23032026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_get_discount_base_for_clustering_23032026

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
            SELECT
                tsd.store_level_id,
                tsd.product_level_id,
                (pcd.value->> ''pcd_id'')::integer AS event,
                tsp.pcd_start_date,
                CAST(pcd.value->>''markdown_percentage'' AS text) AS offer_identifier
            FROM %3$s tsd
            CROSS JOIN LATERAL jsonb_each(tsd.pcd_data) AS pcd(key, value)
            INNER JOIN
            (
                SELECT strategy_id, pcd_id, pcd_start_date
                FROM %4$s
                WHERE strategy_id = %1$s
                  AND pcd_start_date <= CURRENT_DATE
            ) tsp
            ON (pcd.value->> ''pcd_id'')::integer = tsp.pcd_id
            AND tsd.strategy_id = tsp.strategy_id
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
                    tsd.product_level_id,
                    tsd.store_level_id,
                    (pcd.value->> ''pcd_id'')::integer AS event,
                    fp.pcd_start_date,
                    CAST(
                        CASE
                            WHEN (pcd.value->>''is_locked'')::integer = 1
                            THEN pcd.value->>''markdown_percentage''
                            ELSE ''-1''
                        END AS text) AS offer_identifier
                FROM %3$s tsd,
                jsonb_each(tsd.pcd_data) AS pcd(key, value)
                INNER JOIN future_pcd fp
                ON (pcd.value->> ''pcd_id'')::integer = fp.pcd_id
                WHERE (pcd.value->>''is_locked'')::integer = 1
                  AND tsd.strategy_id = %1$s
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
