--liquibase formatted sql
--changeset liquibase:filter_configurations_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for filter_configurations_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.filter_configurations_list(input integer);
CREATE OR REPLACE FUNCTION global.filter_configurations_list(input integer)
 RETURNS TABLE(fc_code integer, name character varying, screens character varying[], created_at timestamp with time zone, cerated_by character varying, dimensions character varying[])
 LANGUAGE plpgsql
AS $function$
	begin
	return QUERY
		select
			fc.fc_code,
			fc."name",
			fc.screens,
			fc.created_at,
			u.name as created_by,
			array_agg(distinct fcm.dimension) as dimensions
		from
			"global".filter_configurations fc
		join "global".filter_configurations_mapping fcm on
			fc.fc_code = fcm.fc_code
		left join "global".user_master u on
			fc.created_by = u.user_code
		where
			fc.is_deleted = false
			and fc.fc_code = $1
		group by
			1,
			2,
			3,
			4,
			5
		order by
			4 desc;
	end
	$function$
;


CREATE OR REPLACE FUNCTION global.filter_configurations_list(input jsonb)
 RETURNS TABLE(fc_code integer, name character varying, screens character varying[], created_at timestamp with time zone, cerated_by character varying, dimensions character varying[])
 LANGUAGE plpgsql
AS $function$
declare
    _query text;
    begin
    _query := 'select
            fc.fc_code,
            fc."name",
            fc.screens,
            fc.created_at,
            u.name as created_by,
            array_agg(distinct fcm.dimension) as dimensions
        from
            "global".filter_configurations fc
        join "global".filter_configurations_mapping fcm on
            fc.fc_code = fcm.fc_code
        left join "global".user_master u on
            fc.created_by = u.user_code
        where
            fc.is_deleted = false
        group by
            1,
            2,
            3,
            4,
            5
        order by
            4 desc';
            _query := 'SELECT * FROM (' || _query || ') X ' || ("global".form_table_query($1));
           return QUERY execute _query;
    end
$function$
;
