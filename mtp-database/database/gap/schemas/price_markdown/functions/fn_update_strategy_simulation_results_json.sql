--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_update_strategy_simulation_results_json_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_update_strategy_simulation_results_json_3

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
	_existing jsonb;
    _fa_updated_json jsonb;
BEGIN

    for _pcd_id in (select unnest(p_pcd_ids)) loop
        _pcd_key := format('pcd_%1$s',_pcd_id);
		_fa_updated_json = p_updated_json;


		_existing := p_simulation_results_json->_pcd_key;
		if _existing->>'approval_status' = ('Finally Approved'::price_markdown.strategy_approval_status_enum)::text then
			_fa_updated_json := _fa_updated_json || jsonb_build_object('approval_status', 'Finally Approved'::price_markdown.strategy_approval_status_enum);
		end if;		

        p_simulation_results_json := jsonb_set(
			p_simulation_results_json,
			array[
                _pcd_key
			]::text[],
			p_simulation_results_json->_pcd_key || _fa_updated_json
		);

    end loop;


    return p_simulation_results_json;
end;
$function$
;
