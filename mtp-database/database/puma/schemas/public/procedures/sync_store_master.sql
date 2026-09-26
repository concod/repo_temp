--liquibase formatted sql
--changeset kailash.yadav@impactanalytics.co:sync_store_master runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: Modify updated statement for sync_store_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_master();
CREATE OR REPLACE PROCEDURE public.sync_store_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
        declare
                _attr text;
                _update_attr text;
        begin
                select
                        string_agg('"' || generic_column_name || '"', ', '),
                        string_agg('"' || generic_column_name || '" = excluded."' || generic_column_name || '"', ', ')
                        into _attr, _update_attr
                from
                        "global".store_generic_schema_mapping pgsm
                where
                        required_in_product
                        and not is_attribute;

          UPDATE global.store_master sm
                    set active = false,
                        is_deleted = true
                                        where not exists  (select 'p' from public.store_validated_table pvt
                                        where pvt.store_code = sm.store_code 
                                        );

                execute 'insert
                        into
                        global.store_master (' || _attr || ')
                select
                        ' || _attr || '
                from
                        public.store_validated_table
                        on conflict (store_code) do
                update
                set
                        ' || _update_attr || ',
                is_deleted = case when excluded."active" = true then  false  
                when excluded."active" = false then  true end ;'; 
        end
$procedure$
;
