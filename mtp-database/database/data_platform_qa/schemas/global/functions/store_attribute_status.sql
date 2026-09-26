--liquibase formatted sql
--changeset liquibase:store_attribute_status runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attribute_status
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_attribute_status(input text, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.store_attribute_status(input text, jsonb, jsonb)
 RETURNS TABLE(attribute character varying)
 LANGUAGE plpgsql
AS $function$
declare
	_query_sm text := '';
	_query_sa text := '';
	_query_combine text := '';
	begin
		_query_sm := 'SELECT * FROM "global".store_master' || ("global".form_main_table_filters('store_master', $2));
 		_query_sa := "global".form_attribute_table_filters('store_attributes', 'store_code', $3);
 		_query_combine := 'select distinct ' || $1 || ' as attributes from (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code) sm left join (
                                    select
                                      store_code as store_code,
                                          start_time as start_time,
                                          end_time as end_time,
                                          attribute_value as status
                                    from
                                      "global".store_time_attributes
                                    where
                                      attribute_name = ''status''
                                ) pta
                                on sm.store_code = pta.store_code
                        ) X ' ;
 	raise notice '%',_query_combine;
 	RETURN QUERY EXECUTE _query_combine;
	END
$function$
;
