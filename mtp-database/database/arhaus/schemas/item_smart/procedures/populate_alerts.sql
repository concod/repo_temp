--liquibase formatted sql
--changeset subhash.phopale@impactanalytics.co:populate_alerts_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for populate alerts 
--rollback: SELECT 1
Drop PROCEDURE if exists item_smart.populate_alerts();
CREATE OR REPLACE PROCEDURE item_smart.populate_alerts()
LANGUAGE plpgsql
AS $procedure$
declare 
    v_sql           text;
    tbl            text;
    dept           text;
    actual_dept_name text;
    months         int4[];
    channels       text[]:='{"Ecom","Store","Warehouse"}';
    v_error_message text;
    v_affected_rows int;
begin
    set application_name = 'Item Smart alerts population';

    -- First loop: Create partitions
    for dept,actual_dept_name,months in (
        select a.dept_part_name, mphf.actual_dept_name, a.months
        from (
            select distinct 
                split_part(tablename,'_',2) dept_part_name,
                array_agg(split_part(tablename,'_',3)::int4)::int4[] months
            from pg_catalog.pg_tables 
            where tablename like 'alerts_%'
            and schemaname = 'public'
            group by split_part(tablename,'_',2)
        ) a
        join (
            select distinct 
                l2_name as actual_dept_name,
                lower(regexp_replace(l2_name, '[ /.-]', '', 'g')) dept_part_name
            from item_smart.mv_product_hierarchies_filter
        ) mphf on a.dept_part_name = mphf.dept_part_name 
    ) loop
        BEGIN
            call item_smart.create_item_schema('alerts', array[actual_dept_name]::text[], months::int4[], channels::text[]);
            raise notice 'Created partition for dept: %', actual_dept_name;
        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            raise warning 'Error creating partition for dept %: %', actual_dept_name, v_error_message;
        END;
    end loop;
 
    raise notice 'partitions created';
 
    -- Second loop: Process each department
    for dept in (
        select distinct split_part(tablename,'_',2)
        from pg_catalog.pg_tables 
        where tablename like 'alerts_%'
        and schemaname = 'public'
        order by split_part(tablename,'_',2)  -- Added ordering for predictability
    ) loop
        raise notice 'Processing department: %', dept;
        
        BEGIN
            -- Try truncate with explicit schema reference and quoted identifiers
            v_sql := format('TRUNCATE TABLE item_smart.alerts_%I', dept);
            EXECUTE v_sql;
            raise notice 'Successfully truncated alerts_%', dept;
            
            -- Process each table for this department
            FOR tbl IN (
                select tablename
                from pg_catalog.pg_tables 
                where tablename like 'alerts_' || dept || '%'
                and schemaname = 'public'
                order by tablename  -- Added ordering for predictability
            ) LOOP
                BEGIN
                    v_sql := format('
                        INSERT INTO item_smart.alerts(
                            dept,
                            class,
                            channel,
                            month,
                            hierarchy_code,
                            collection_name,
                            wp_written_sales_dollars,
                            wp_written_sales_cost,
                            wp_atp_cost,
                            ty_written_sales_dollars,
                            ly_written_sales_dollars,
                            op_written_sales_dollars,
                            lf_written_sales_dollars,
                            var_sls_u_wp_op,
                            var_sls_u_wp_lf,
                            var_sls_u_wp_iaf,
                            rec_rcpt_u_ttl_rcpt_u,
                            ttl_rcpt_moq,
                            fwos_exit_date,
                            fwos_lead_time
                        )
                        SELECT 
                            dept,
                            l3_name,
                            channel,
                            month,
                            hierarchy_code,
                            collection_name,
                            wp_written_sales_dollars,
                            wp_written_sales_cost,
                            wp_atp_cost,
                            ty_written_sales_dollars,
                            ly_written_sales_dollars,
                            op_written_sales_dollars,
                            lf_written_sales_dollars,
                            var_sls_u_wp_op,
                            var_sls_u_wp_lf,
                            var_sls_u_wp_iaf,
                            rec_rcpt_u_ttl_rcpt_u,
                            ttl_rcpt_moq,
                            fwos_exit_date,
                            fwos_lead_time 
                        FROM %I', tbl);
                    
                    EXECUTE v_sql;
                    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
                    raise notice 'Populated % with % rows', tbl, v_affected_rows;
                    
                EXCEPTION WHEN OTHERS THEN
                    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
                    raise warning 'Error processing table %: %', tbl, v_error_message;
                    -- Continue with next table
                END;
            END LOOP;
            
        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            raise warning 'Error processing department %: %', dept, v_error_message;
            -- Continue with next department
        END;
    end loop;
    
    raise notice 'Alerts population completed';
    
EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
    raise exception 'Fatal error in populate_alerts: %', v_error_message;
END;
$procedure$;
