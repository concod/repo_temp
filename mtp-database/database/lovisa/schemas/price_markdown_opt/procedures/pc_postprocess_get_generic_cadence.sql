--liquibase formatted sql
--changeset liquibase:pc_postprocess_get_generic_cadence runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_postprocess_get_generic_cadence

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_postprocess_get_generic_cadence(text, text, text);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_postprocess_get_generic_cadence(IN _generic_cadence_table text, IN _gurobi_op text, IN _discount_opt_cluster text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_get_generic_cadence_query text;
	_generic_cadence_delete_query text;
BEGIN
    _get_generic_cadence_query = format('DROP TABLE IF EXISTS %1$s;

        CREATE TABLE %1$s AS
        SELECT
            CAST(SPLIT_PART(d.opt_level_bins, ''_'', 1) AS INT) AS product_level_id,
            CAST(SPLIT_PART(d.opt_level_bins, ''_'', 2) AS INT) AS store_level_id,
            event,
            offer_identifier
        FROM
            %2$s g
        JOIN
            %3$s d
        ON
            g.opt_level_bins = d.opt_cluster
        GROUP BY
            1, 2, 3, 4;
    ', _generic_cadence_table, _gurobi_op, _discount_opt_cluster);
	raise notice 'get generic cadence query : %', _get_generic_cadence_query;

    -- Delete records from the original table
    _generic_cadence_delete_query = format('
        DELETE FROM %1$s
        WHERE opt_level_bins IN
        (SELECT DISTINCT opt_cluster FROM %2$s);
    ', _gurobi_op, _discount_opt_cluster);

   raise notice 'get generic cadence delete query : %', _generic_cadence_delete_query;
	execute _get_generic_cadence_query;
	execute _generic_cadence_delete_query;
END $procedure$
;
