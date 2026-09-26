--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_update_strategy_simulation_results_json-2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset forfn_update_strategy_simulation_results_json 

DROP FUNCTION if exists price_markdown.fn_update_strategy_simulation_results_json;
CREATE OR REPLACE FUNCTION price_markdown.fn_update_strategy_simulation_results_json(
    p_simulation_results_json jsonb,
    p_pcd_ids integer[],
    p_updated_json jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    _pcd_id int;
    _pcd_key character varying;
BEGIN

    for _pcd_id in (select unnest(p_pcd_ids)) loop

        _pcd_key := format('pcd_%1$s',_pcd_id);

        p_simulation_results_json := jsonb_set(
			p_simulation_results_json,
			array[
                _pcd_key
			]::text[],
			p_simulation_results_json->_pcd_key || p_updated_json
		);

    end loop;


    return p_simulation_results_json;
end;
$function$
;
