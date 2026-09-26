--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.com:pc_opt_replace_fin_temp_data_26112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_replace_fin_temp_data

DROP procedure if exists price_markdown_opt.pc_opt_replace_fin_temp_data;

create or replace procedure price_markdown_opt.pc_opt_replace_fin_temp_data(_strategy_id integer, _ls_stgs text, _currency_type text)
LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare _replace_fin_temp_data_query text;
begin

	_replace_fin_temp_data_query = FORMAT('
	DROP TABLE IF EXISTS price_markdown_opt_temp.replace_fin_temp_data_%1$s;
	CREATE UNLOGGED TABLE price_markdown_opt_temp.replace_fin_temp_data_%1$s
											as
											(select * from price_markdown.tb_strategy_discount_%3$s_%1$s
											where pcd_id in %2$s);', _strategy_id, _ls_stgs, _currency_type);

	raise notice '_replace_fin_temp_data_query : %', _replace_fin_temp_data_query;
	execute _replace_fin_temp_data_query;
end;
$procedure$
;