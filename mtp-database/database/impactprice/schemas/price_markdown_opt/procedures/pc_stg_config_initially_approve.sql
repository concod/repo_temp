--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:pc_stg_config_initially_approve_23032026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_stg_config_initially_approve_23032026

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_stg_config_initially_approve(int4);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_stg_config_initially_approve(IN _strategy_id integer)
 LANGUAGE plpgsql
  SECURITY DEFINER
AS $procedure$
declare update_stg_disc_query text;
   		update_stg_master_query text;
begin
	update_stg_master_query = 'update price_markdown.tb_strategy_master
							set status = 1, is_optimisation_running = false
							where strategy_id = $1;';
	raise notice 'Update strategy master query : %', update_stg_master_query;
	execute update_stg_master_query using _strategy_id;
	raise notice 'Strategy is Initially approved in Strategy master table';

	update_stg_disc_query = 'UPDATE price_markdown.tb_strategy_discount_level
								SET pcd_data = (
									SELECT jsonb_object_agg(
										key,
										value || jsonb_build_object(''approval_status'', ''Initially Approved''::price_markdown.strategy_approval_status_enum)
									)
									FROM jsonb_each(pcd_data) AS pcd(key, value)
								)
								WHERE strategy_id = $1;';
	RAISE NOTICE 'Update strategy Discount Query : % ', update_stg_disc_query;
	EXECUTE update_stg_disc_query USING _strategy_id;
	RAISE NOTICE 'Strategy is Initially approved in Strategy Discount Level table';
	END;
$procedure$
;