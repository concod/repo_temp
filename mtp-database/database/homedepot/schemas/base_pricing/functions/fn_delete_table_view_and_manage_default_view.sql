--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:delete_table_view_and_manage_default_view_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: delete_table_view_and_manage_default_view_v1

DROP FUNCTION IF EXISTS base_pricing.fn_delete_table_view_and_manage_default_view(integer, bigint);

CREATE OR REPLACE FUNCTION base_pricing.fn_delete_table_view_and_manage_default_view(p_user_id integer, p_table_view_id bigint)
 RETURNS TABLE(message text)
 LANGUAGE plpgsql
AS $function$
            DECLARE
                v_deleted_view_name TEXT;
                v_table_name TEXT;
                v_was_default BOOLEAN;
                v_new_default_id BIGINT;
                v_new_default_name TEXT;
                v_view_count INT;
                v_was_only_view BOOLEAN := false;
            BEGIN
                -- Get details of the view being deleted
                SELECT table_view_name, table_name, is_default 
                INTO v_deleted_view_name, v_table_name, v_was_default
                FROM base_pricing.bp_table_views
                WHERE user_id = p_user_id
                AND table_view_id = p_table_view_id;
                
                -- Return error if view doesn't exist
                IF v_deleted_view_name IS NULL THEN
                    RETURN QUERY SELECT false AS success, 'View not found' AS message;
                    RETURN;
                END IF;
                
                -- Count how many views exist for this user/table
                SELECT COUNT(*) INTO v_view_count
                FROM base_pricing.bp_table_views
                WHERE user_id = p_user_id
                AND table_name = v_table_name;
                
                -- Check if this is the only view
                IF v_view_count = 1 THEN
                    v_was_only_view := true;
                END IF;
                
                -- Delete the view
                DELETE FROM base_pricing.bp_table_views
                WHERE user_id = p_user_id
                AND table_view_id = p_table_view_id;
                
                -- Handle default view promotion if needed
                IF v_was_default AND NOT v_was_only_view THEN
                    -- Find and promote another view from the same table
                    SELECT table_view_id, table_view_name 
                    INTO v_new_default_id, v_new_default_name
                    FROM base_pricing.bp_table_views
                    WHERE user_id = p_user_id
                    AND table_name = v_table_name
                    AND table_view_id <> p_table_view_id
                    ORDER BY table_view_id DESC
                    LIMIT 1;
                    
                    -- Update the new default
                    UPDATE base_pricing.bp_table_views
                    SET is_default = true,
                        updated_by = p_user_id,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE table_view_id = v_new_default_id;
                END IF;
                
                -- Return appropriate status and detailed message
                IF v_was_only_view THEN
                    RETURN QUERY SELECT 
                        format('%s: Deleted (this was the only view - please create a new default view)', 
                            v_deleted_view_name) AS message;
                ELSIF v_was_default THEN
                    RETURN QUERY SELECT 
                        format('%s: Deleted and set %s as the new default view',
                            v_deleted_view_name, v_new_default_name) AS message;
                ELSE
                    RETURN QUERY SELECT 
                        format('%s: Deleted successfully', 
                            v_deleted_view_name) AS message;
                END IF;
                
                RETURN;
            END;
            $function$
;