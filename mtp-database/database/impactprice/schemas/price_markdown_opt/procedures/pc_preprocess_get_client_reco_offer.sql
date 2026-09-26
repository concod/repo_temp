--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_preprocess_get_client_reco_offer_23032026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: discount changes for pc_preprocess_get_client_reco_offer_23032026

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_get_client_reco_offer;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_client_reco_offer(IN _client_reco_table text, IN _strategy_id integer, IN _strategy_pcd text, IN _starting_pcd_start_date date, IN _stg_disc text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_client_reco_query text;
BEGIN

    _client_reco_query = format('DROP TABLE IF EXISTS %1$s;

        CREATE TABLE IF NOT EXISTS %1$s AS (
            WITH future_pcd AS (
                SELECT pcd_id
                FROM %2$s
                WHERE strategy_id = %3$s
                AND pcd_start_date >= ''%4$s''
                GROUP BY 1
            )
            SELECT
                CONCAT(CAST(product_level_id AS TEXT), ''_'', CAST(store_level_id AS TEXT)) AS Opt_level_bins,
                (pcd.value->>''pcd_id'')::integer AS event,
                CONCAT(''percent_off_'', CAST(ROUND((pcd.value->>''markdown_percentage'')::numeric) AS TEXT)) AS offer_identifier,
                (pcd.value->>''markdown_percentage'')::numeric AS effective_opt_discount
            FROM %5$s tsd
            CROSS JOIN LATERAL jsonb_each(tsd.pcd_data) AS pcd(key, value)
            INNER JOIN future_pcd fp
                ON (pcd.value->>''pcd_id'')::integer = fp.pcd_id
            WHERE (
                (pcd.value->>''is_locked'')::integer = 1
                OR pcd.value->>''approval_status'' = ''Finally Approved'')
            AND tsd.strategy_id = %3$s
        );',
        _client_reco_table,
        _strategy_pcd,
        _strategy_id,
        _starting_pcd_start_date,
        _stg_disc
    );
	raise notice 'Client Recommended Offer Query : %', _client_reco_query;
	execute _client_reco_query;
END;
$procedure$
;