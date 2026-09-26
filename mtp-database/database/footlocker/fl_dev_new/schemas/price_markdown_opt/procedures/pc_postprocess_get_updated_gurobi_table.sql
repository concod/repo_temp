--liquibase formatted sql
--changeset liquibase:pc_postprocess_get_updated_gurobi_table_v281124 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_postprocess_get_updated_gurobi_table

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_postprocess_get_updated_gurobi_table(text, text, text, text, integer, integer);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_postprocess_get_updated_gurobi_table(IN _gurobi_updated text, IN _gurobi_output text, IN _opt_bin_mapping text, IN _store_reco text, IN _records_cnt integer, IN _max_records_allowed integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_update_gurobi_query text;
BEGIN
    _update_gurobi_query = format('DROP TABLE IF EXISTS %1$s;

        CREATE TABLE %1$s AS
        SELECT
            CAST(SPLIT_PART(opt_level_bins, ''_'', 1) AS INT) AS product_level_id,
            CAST(SPLIT_PART(opt_level_bins, ''_'', 2) AS INT) AS store_level_id,
            event,
            CAST(SPLIT_PART(offer_identifier, ''_'', 3) AS FLOAT) AS base_percentage
        FROM
    ', _gurobi_updated);

    -- Conditional part of the query based on store_reco and records_cnt
    IF _store_reco = 'Store' AND _records_cnt > _max_records_allowed THEN
        _update_gurobi_query = _update_gurobi_query || format('
            (
                SELECT b.opt_level_bins, event, offer_identifier
                FROM %1$s a
                JOIN %2$s b ON a.opt_level_bins = b.new_opt_level_bins
                GROUP BY 1, 2, 3
            ) c
        ', _gurobi_output, _opt_bin_mapping);
    ELSE
        _update_gurobi_query = _update_gurobi_query || format('%1$s a ', _gurobi_output);
    END IF;

    _update_gurobi_query = _update_gurobi_query || format('
												GROUP BY 1, 2, 3, 4;');

   raise notice 'update gurobi output query : %', _update_gurobi_query;
	execute _update_gurobi_query;
END $procedure$
;
