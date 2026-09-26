--liquibase formatted sql
--changeset liquibase:table_configurations_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for table_configurations_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.table_configurations_list(input integer);
CREATE OR REPLACE FUNCTION global.table_configurations_list(input integer)
 RETURNS TABLE(fc_code integer, name character varying, screens character varying[], created_at timestamp with time zone, cerated_by character varying, dimensions character varying[])
 LANGUAGE plpgsql
AS $function$
	begin
	return QUERY
		select
			tc.tc_code,
			tc."name",
			tc.screens,
			tc.created_at,
			u.name as created_by,
			array_agg(distinct tcm.dimension) as dimensions
		from
			"global".table_configurations tc
		join "global".table_configurations_mapping tcm on
			tc.tc_code = tcm.tc_code
		left join "global".user_master u on
			tc.created_by = u.user_code
		where
			tc.is_deleted = false
			and tc.tc_code = $1
		group by
			1,
			2,
			3,
			4,
			5;
	end
	$function$
;


CREATE OR REPLACE FUNCTION global.table_configurations_list(input jsonb)
 RETURNS TABLE(fc_code integer, name character varying, screens character varying[], created_at timestamp with time zone, cerated_by character varying, dimensions character varying[])
 LANGUAGE plpgsql
AS $function$
declare
    _query text;
    begin
    _query := 'select
			tc.tc_code,
			tc."name",
			tc.screens,
			tc.created_at,
			u.name as created_by,
			array_agg(distinct tcm.dimension) as dimensions
		from
			"global".table_configurations tc
		join "global".table_configurations_mapping tcm on
			tc.tc_code = tcm.tc_code
		left join "global".user_master u on
			tc.created_by = u.user_code
		where
			tc.is_deleted = false
		group by
			1,
			2,
			3,
			4,
			5';
            _query := 'SELECT * FROM (' || _query || ') X ' || (global.form_table_query($1));
        -- raise notice '%',_query;
           return QUERY execute _query;
    end
$function$
;
