--liquibase formatted sql
--changeset bhargav.polavarapu@impactanalytics.co:reorder_preset_questions_create runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: if condition has been changed below
--rollback: SELECT 1
DROP FUNCTION IF EXISTS chat_gpt.reorder_preset_questions(user_id integer, qid integer, previous_order integer, current_order integer);
CREATE OR REPLACE FUNCTION chat_gpt.reorder_preset_questions(user_id integer, qid integer, previous_order integer, current_order integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    actual_previous_order INT;
    max_priority INT;
BEGIN
    BEGIN
        -- Retrieve the actual previous priority of the question from the database
        SELECT sort_order INTO actual_previous_order
        FROM chat_gpt.tb_pre_def_questions_new
        WHERE question_id  = $2 AND user_code = $1 and sort_order = $3;
       
       	-- Retrieve the max sorted_order exist for the particular user
       	SELECT max(sort_order) INTO max_priority
        FROM chat_gpt.tb_pre_def_questions_new
        WHERE user_code = $1;

        -- Check if the provided previous position matches the actual previous position
        IF actual_previous_order IS NULL or $4 > max_priority THEN
            RAISE EXCEPTION 'Invalid question_id or user_id or sort_order';
        END IF;

        IF $4 > $3 THEN
            -- Decrease priorities for rows between previous and current position
            UPDATE chat_gpt.tb_pre_def_questions_new
            SET sort_order = sort_order - 1
            WHERE sort_order > $3 AND sort_order <= $4 AND user_code = $1;
        ELSE
            -- Increase priorities for rows between previous and current position
            UPDATE chat_gpt.tb_pre_def_questions_new
            SET sort_order = sort_order + 1
            WHERE sort_order >= $4 AND sort_order < $3 AND user_code = $1;
        END IF;

        -- Update the priority of the specific task
        UPDATE chat_gpt.tb_pre_def_questions_new
        SET sort_order = $4
        WHERE question_id = $2 AND user_code = $1;

        -- Raise an exception if no rows were affected by the updates
        IF NOT FOUND THEN
            RAISE EXCEPTION 'No rows updated. Check if user_id or question_id is invalid.';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Error occurred: %', SQLERRM;
    END;
END;
$function$
;
