--liquibase formatted sql
--changeset liquibase:create_json_flat_view runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_json_flat_view
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.create_json_flat_view(table_name text, regular_columns text, json_column text);
CREATE OR REPLACE FUNCTION global.create_json_flat_view(table_name text, regular_columns text, json_column text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$declare
    cols text;
begin
/*
    execute format ($ex$
        select string_agg(format('%2$s->>%%1$L "%%1$s"', key), ', ')
        from (
            select distinct key
            from %1$s, json_each(%2$s)
            order by 1
            ) s;
        $ex$, table_name, json_column)
    into cols;
    execute format($ex$
        drop view if exists %1$s_view;
        create view %1$s_view as 
        select %2$s, %3$s from %1$s
        $ex$, table_name, regular_columns, cols);
    return cols;
*/
end;
$function$
;
