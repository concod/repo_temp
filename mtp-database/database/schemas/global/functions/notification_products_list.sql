--liquibase formatted sql
--changeset liquibase:notification_products_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notification_products_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.notification_products_list(input jsonb);
CREATE OR REPLACE FUNCTION global.notification_products_list(input jsonb)
 RETURNS TABLE(products jsonb)
 LANGUAGE plpgsql
AS $function$
declare
	_query_table_filters text := '';
	_query_combine text := '';
	begin
		_query_table_filters := global.form_table_query($1);
 		_query_combine := '
			select
				*
			from
				(
					select
						product
					from
						"global".notification_triggers_master
					group by
						1
			) X' || _query_table_filters;
		raise notice '%',_query_combine;
		return query execute 'select jsonb_build_object(''products'', jsonb_agg(product)) as products from (' || _query_combine || ') x';
	end
$function$
;
