--liquibase formatted sql
--changeset liquibase:pc_clear_strategy_discounts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pc_clear_strategy_discounts 

DROP PROCEDURE IF EXISTS price_markdown.pc_clear_strategy_discounts();
CREATE OR REPLACE PROCEDURE price_markdown.pc_clear_strategy_discounts(IN p_strategy_id integer)
 LANGUAGE plpgsql
AS $procedure$
	begin
		raise notice 'deleting discounts for strategy id %',p_strategy_id;
		delete from price_markdown.tb_strategy_discount where strategy_id  = p_strategy_id;
		delete from price_markdown.tb_strategy_discount_ia where strategy_id  = p_strategy_id;
--		delete from price_markdown.tb_strategy_discount_finalized where strategy_id  = p_strategy_id;
	END;
$procedure$
;