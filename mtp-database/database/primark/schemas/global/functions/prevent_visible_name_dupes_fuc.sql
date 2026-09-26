--liquibase formatted sql
--changeset akshay:duplicate_check_trigger runOnChange:true stripComments:false splitStatements:false context:Release_1 labels:duplicate_check
--comment: added trigger for handling duplicates in fuc for primark
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.prevent_visible_name_dupes_fuc();
CREATE OR REPLACE FUNCTION "global".prevent_visible_name_dupes_fuc()
RETURNS trigger LANGUAGE plpgsql AS
$$
BEGIN
  -- Ignore soft-deleted rows
  IF NEW.is_deleted THEN
    RETURN NEW;
  END IF;

  -- Check for any existing row that would be *visibly* the same
  IF EXISTS (
    SELECT 1
    FROM "global".filter_user_configurations_mapping t
    WHERE t.fuc_code <> COALESCE(NEW.fuc_code, -1)
      AND t.is_deleted = false
      AND t.fuc_name = NEW.fuc_name

      -- Audience overlap: either broadcast or same user
      AND (
            t.is_broadcast = true
         OR NEW.is_broadcast = true
         OR (t.created_by IS NOT DISTINCT FROM NEW.created_by)
      )

      -- Screen overlap: same screen OR either is global (3)
      AND (
            t.screen_code = 3
         OR NEW.screen_code = 3
         OR t.screen_code = NEW.screen_code
      )
  ) THEN
    RAISE EXCEPTION
      'Duplicate visible name "%": conflicts with existing configuration (audience/screen overlap).',
      NEW.fuc_name
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;





-- DEFERRABLE so multi-row changes in a transaction can be staged safely if needed
DROP TRIGGER IF EXISTS trg_prevent_visible_name_dupes_fuc
ON "global".filter_user_configurations_mapping;

CREATE CONSTRAINT TRIGGER trg_prevent_visible_name_dupes_fuc
AFTER INSERT OR UPDATE OF fuc_name, screen_code, is_broadcast, created_by, is_deleted
ON "global".filter_user_configurations_mapping
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW
EXECUTE FUNCTION "global".prevent_visible_name_dupes_fuc();
