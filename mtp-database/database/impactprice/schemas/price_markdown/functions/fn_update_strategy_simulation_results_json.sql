--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_update_strategy_simulation_results_json_4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_update_strategy_simulation_results_json_4

DROP FUNCTION if exists price_markdown.fn_update_strategy_simulation_results_json;

CREATE OR REPLACE FUNCTION price_markdown.fn_update_strategy_simulation_results_json(
    p_simulation_results_json jsonb,
    p_pcd_ids integer[],
    p_updated_json jsonb,
    p_strategy_id integer DEFAULT NULL
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
    if p_simulation_results_json is null then
        return null;
    end if;

    for _pcd_id in (select unnest(p_pcd_ids)) loop
        if p_strategy_id is not null then
            select tsp.order_number::text into _pcd_key
            from price_markdown.tb_strategy_pcd_new tsp
            where tsp.strategy_id = p_strategy_id and tsp.pcd_id = _pcd_id
            limit 1;
        else
            _pcd_key := format('pcd_%1$s', _pcd_id);
        end if;

        if _pcd_key is null or p_simulation_results_json->_pcd_key is null then
            continue;
        end if;

		_fa_updated_json = p_updated_json;

		_existing := p_simulation_results_json->_pcd_key;
		if _existing->>'approval_status' = 'Finally Approved' then
			_fa_updated_json := _fa_updated_json || jsonb_build_object('approval_status', 'Finally Approved');
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
