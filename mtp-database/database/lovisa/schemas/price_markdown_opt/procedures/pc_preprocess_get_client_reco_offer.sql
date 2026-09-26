--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.com:pc_preprocess_get_client_reco_offer_17022026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: discount changes for pc_preprocess_get_client_reco_offer

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_get_client_reco_offer;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_client_reco_offer(
    IN _client_reco_table text, 
    IN _strategy_id integer, 
    IN _strategy_pcd text, 
    IN _starting_pcd_start_date date,
    IN _strategy_discount TEXT
    )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_client_reco_query text;
BEGIN

    _client_reco_query = format('DROP TABLE IF EXISTS %1$s;
        CREATE TABLE %1$s AS
        (
			WITH future_pcd AS (
                SELECT pcd_id
                FROM %3$s
                WHERE strategy_id = %2$s
                AND pcd_start_date >= ''%4$s''
                GROUP BY 1
            )
			select  
                CONCAT(CAST(product_level_id AS TEXT), ''_'', CAST(store_level_id AS TEXT)) AS Opt_level_bins,
                tsd.event as pcd_id, 
                CONCAT(''percent_off_'', CAST(ROUND(markdown_percentage) AS TEXT)) AS offer_identifier,
                markdown_percentage AS effective_opt_discount
			FROM %5$s_%2$s tsd
			INNER JOIN future_pcd fp
                ON tsd.pcd_id = fp.pcd_id
            WHERE (is_locked = 1 OR approval_status = ''Finally Approved'')
        );

    ', _client_reco_table, _strategy_id, _strategy_pcd, _starting_pcd_start_date, _strategy_discount);
	raise notice 'Client Recommended Offer Query : %', _client_reco_query;
	execute _client_reco_query;
END;
$procedure$
;