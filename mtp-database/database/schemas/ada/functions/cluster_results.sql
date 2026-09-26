--liquibase formatted sql
--changeset liquibase:cluster_results runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for cluster_results
--rollback: SELECT 1
DROP FUNCTION IF EXISTS ada.cluster_results(input refcursor, character varying, character varying, jsonb, jsonb);
CREATE OR REPLACE FUNCTION ada.cluster_results(input refcursor, character varying, character varying, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
	_query_table_filters text := '';
	_query_combine text := '';
	_query_attribute text := '';
	begin
		if $3 = 'product' then
			_query_attribute := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $4);
			_query_combine := 'SELECT pm.product_name, pm.product_description,  attributes.color, attributes.size, r.* FROM (select * from ada.ada_cluster_results_' || $2 || ') r join global.product_master pm on r.master_code = pm.product_code join (' || _query_attribute || ') attributes ON r.master_code = attributes.product_code ';
		else
			_query_combine := 'SELECT sm.store_name, sm.store_description, r.* FROM (select * from ada.ada_cluster_results_' || $2 || ') r join global.store_master sm on r.master_code = sm.store_code';
		end if;
		_query_attribute := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $4);
		_query_table_filters := "global".form_table_query($5);
 		_query_combine := 'SELECT * FROM (' || _query_combine || ') X ' || _query_table_filters;
 	raise notice '%',_query_combine;
 	OPEN $1 FOR execute _query_combine;
	RETURN $1;
	end $function$
;
