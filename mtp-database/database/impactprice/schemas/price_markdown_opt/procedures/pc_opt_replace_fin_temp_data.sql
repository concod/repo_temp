--liquibase formatted sql
--changeset ashwini.khandave@impactanalytics.co:pc_opt_replace_fin_temp_data_16042026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_replace_fin_temp_data_16042026

DROP procedure if exists price_markdown_opt.pc_opt_replace_fin_temp_data(_strategy_id integer, _ls_stgs text);

create or replace procedure price_markdown_opt.pc_opt_replace_fin_temp_data(_strategy_id integer, _ls_stgs text)
LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare _replace_fin_temp_data_query text;
begin

	_replace_fin_temp_data_query = FORMAT('
	DROP TABLE IF EXISTS price_markdown_opt_temp.replace_fin_temp_data_%1$s;
	CREATE UNLOGGED TABLE price_markdown_opt_temp.replace_fin_temp_data_%1$s
											as
											(
                                                SELECT tsd.strategy_id,
                                                       tsd.product_level_id,
                                                       tsd.store_level_id,
                                                       tsd.currency_id,
                                                       tsd.channel_info,
                                                       (pcd.value->>''average_retail_price'')::numeric as average_retail_price,
                                                       (pcd.value->>''average_retail_price_with_vat'')::numeric as average_retail_price_with_vat,
                                                       (pcd.value->>''pcd_id'')::integer as pcd_id,
                                                       (pcd.value->>''markdown_percentage'')::numeric as markdown_percentage,
                                                       (pcd.value->>''previous_markdown_percentage'')::numeric as previous_markdown_percentage,
                                                       (pcd.value->>''incremental_discount'')::numeric as incremental_discount,
                                                       (pcd.value->>''markdown_type'') as markdown_type,
                                                       (pcd.value->>''is_locked'')::integer as is_locked,
                                                       (pcd.value->>''approval_status'') as approval_status,
                                                       (pcd.value->>''action_status'') as action_status,
                                                       (pcd.value->>''sim_flag'')::integer as sim_flag,
                                                        pcd.key as pcd_json_key  
                                                FROM price_markdown.tb_strategy_discount_level tsd
                                                CROSS JOIN LATERAL jsonb_each(tsd.pcd_data) as pcd(key, value)
                                                WHERE tsd.strategy_id = %1$s
                                                AND (pcd.value->>''pcd_id'')::integer IN %2$s
                                            );', _strategy_id, _ls_stgs);

	raise notice '_replace_fin_temp_data_query : %', _replace_fin_temp_data_query;
	execute _replace_fin_temp_data_query;
end;
$procedure$
;