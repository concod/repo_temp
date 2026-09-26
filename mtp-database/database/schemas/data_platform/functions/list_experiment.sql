--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:list_experiment runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for list_experiment
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.list_experiment(
	input jsonb);

CREATE OR REPLACE FUNCTION data_platform.list_experiment(
	input jsonb)
    RETURNS TABLE(experiment_id integer, experiment_name character varying, config_id integer, workstream_id integer, module_id integer, config_name character varying, config_value json, workstream_name character varying, workstream_value character varying) 
    LANGUAGE 'plpgsql'

AS $FUNCTION$
 declare
 	_key text;
 	_value text;
 	_query_table_filters text := '';
 	_query_combine text;
 	_column text;
 	_search text;
 	_input_json json;
 	
 	begin
 		_query_table_filters := "data_platform".form_table_query($1);
 		_query_combine := 'SELECT * FROM (
			select
			p.experiment_id,
            p.experiment_name,
            p.config_id,
            p.workstream_id,
			p.module_id,
            c.config_name,
            c.config_value,
            w.workstream_name,
            w.workstream_value
			from
 	data_platform.experiment as p
    left join data_platform.config as c
    using(config_id)
    left join data_platform.workstream as w
    using(workstream_id)
	where p.is_deleted=False
	) X ' || _query_table_filters;
 		raise notice '%', _query_combine;
 RETURN QUERY execute _query_combine;
  	end
 
$FUNCTION$;