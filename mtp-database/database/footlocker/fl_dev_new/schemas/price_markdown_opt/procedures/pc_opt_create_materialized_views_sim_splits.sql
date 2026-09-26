--liquibase formatted sql
--changeset liquibase:pc_opt_create_materialized_views_sim_splits runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_create_materialized_views_sim_splits

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_opt_create_materialized_views_sim_splits;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_opt_create_materialized_views_sim_splits(IN _strategy_id integer)
 LANGUAGE plpgsql
AS $procedure$
BEGIN
    -- Call the simulation procedure
    CALL price_markdown_opt.pc_create_materialized_view_sim(_strategy_id);

    -- Call the day split procedure
    CALL price_markdown_opt.pc_create_materialized_view_day_split(_strategy_id);

    -- Call the store split procedure
    CALL price_markdown_opt.pc_create_materialized_view_store_split(_strategy_id);
END;
$procedure$
;