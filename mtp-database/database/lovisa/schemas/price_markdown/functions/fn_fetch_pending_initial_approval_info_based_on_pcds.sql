--liquibase formatted sql
--changeset harshita.kona@impactanalytics.co:fn_fetch_pending_initial_approval_info_based_on_pcds runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Updated fn_fetch_pending_initial_approval_info_based_on_pcds

DROP FUNCTION if exists price_markdown.fn_fetch_pending_initial_approval_info_based_on_pcds;
CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_pending_initial_approval_info_based_on_pcds(_pcd_ids integer[], currency_ids integer[])
 RETURNS TABLE(pending_initial_approval_count integer, pending_initial_approval_strategy_ids integer[])
 LANGUAGE plpgsql
AS $function$
declare
	pending_initial_approval_count_ integer := 0;
	pending_initial_approval_strategy_ids_ integer[];
	table_suffix text;
    _currency_name text;
	vl_test_query text;
begin

	SELECT currency_name INTO _currency_name FROM global.tb_currency_master WHERE currency_id = ANY(currency_ids) LIMIT 1;

	IF _currency_name = 'AUD' THEN
		table_suffix := 'global';
	ELSE
		table_suffix := 'dominating';
	END IF;

	-- Fetch pending_initial_approval, pending_initial_approval_strategy_ids.
	vl_test_query := format($sql$
        SELECT
            count(DISTINCT tsd.strategy_id),
            array_agg(DISTINCT tsd.strategy_id)
        FROM price_markdown.tb_strategy_discount_%I tsd
        WHERE tsd.pcd_id = ANY($1)
          AND tsd.approval_status = 'Not Approved'
    $sql$, table_suffix);
	
	EXECUTE vl_test_query 
	USING _pcd_ids
    INTO pending_initial_approval_count_, pending_initial_approval_strategy_ids_;
	return query(select pending_initial_approval_count_ as pending_initial_approval_count, pending_initial_approval_strategy_ids_ as pending_initial_approval_strategy_ids);
end;
$function$
;
