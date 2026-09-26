--liquibase formatted sql
--changeset liquibase:pc_refresh_materialized_view_sim runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_refresh_materialized_view_sim

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_refresh_materialized_view_sim();

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_refresh_materialized_view_sim()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _strategy_id INT;
BEGIN
    FOR _strategy_id IN (SELECT DISTINCT strategy_id
                         FROM price_markdown.tb_strategy_master tsm
                         WHERE status != -1 AND end_date >= date(timezone('EST', now())) - 7)
    LOOP
        -- Call procedure x for each strategy_id
        CALL price_markdown_opt.pc_create_materialized_view_sim(_strategy_id);
    END LOOP;
END;
$procedure$
;