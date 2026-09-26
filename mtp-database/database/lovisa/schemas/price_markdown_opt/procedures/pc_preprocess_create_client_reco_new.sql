--liquibase formatted sql
--changeset liquibase:pc_preprocess_create_client_reco_new_v2508 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_create_client_reco_new_v2508

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_create_client_reco_new;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_create_client_reco_new(IN _client_reco_new text, IN _client_reco text, IN _opt_bin_mapping text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_create_client_reco_new_query text;
BEGIN
    _create_client_reco_new_query = format('DROP TABLE IF EXISTS %1$s;

        CREATE TABLE %1$s AS
        SELECT
            new_opt_level_bins AS opt_level_bins,
            event,
            offer_identifier,
            effective_opt_discount
        FROM
            %2$s
        JOIN
            %3$s
        USING (opt_level_bins)
        GROUP BY
            new_opt_level_bins, event, offer_identifier,effective_opt_discount;
    ', _client_reco_new, _client_reco, _opt_bin_mapping);
   raise notice 'Client recommended offers new query : %', _create_client_reco_new_query;
  execute _create_client_reco_new_query;
END $procedure$
;
