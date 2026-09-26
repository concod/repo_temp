--liquibase formatted sql
--changeset mohammed.abdulla@impactanalytics.co:update_mail_notification_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding the tenant value from the sourcing configuration
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.update_mail_notification_mapping() cascade;

CREATE OR REPLACE FUNCTION data_platform.update_mail_notification_mapping()
RETURNS TRIGGER AS $$
DECLARE
    tenant_value TEXT;
    pipeline_value TEXT;
    recipients_success TEXT;
    recipients_failure TEXT;
    full_url TEXT;
    existing_count INTEGER;
BEGIN
    -- Only proceed if the module is 'notification_ingestion_configuration'
    IF NEW.module <> 'notification_ingestion_configuration' THEN
        RETURN NEW;
    END IF;

    -- Check if we have all required configuration values
    SELECT COUNT(*) INTO existing_count
    FROM data_platform.data_ingestion_config
    WHERE module IN ('core_sourcing_configuration', 'core_ingestion_configuration', 'notification_ingestion_configuration')
      AND is_deleted = False
      AND is_latest = True;
    
    IF existing_count < 3 THEN
        RAISE NOTICE 'Required configuration values not found. Skipping mail notification mapping update.';
        RETURN NEW;
    END IF;

    -- Fetch configuration values in a single query where possible
    BEGIN
        -- Get tenant value
        SELECT attribute_value INTO tenant_value
        FROM data_platform.data_ingestion_config
        WHERE attribute_name = 'tenant_alias'
          AND module = 'core_sourcing_configuration'
          AND is_deleted = False
          AND is_latest = True
        LIMIT 1;

        -- Get pipeline value
        SELECT attribute_value INTO pipeline_value
        FROM data_platform.data_ingestion_config
        WHERE attribute_name = 'pipeline'
          AND module = 'core_ingestion_configuration'
          AND is_deleted = False
          AND is_latest = True
        LIMIT 1;

        -- Get success recipients
        SELECT attribute_value INTO recipients_success
        FROM data_platform.data_ingestion_config
        WHERE attribute_name = 'notification_recipient'
          AND module = 'notification_ingestion_configuration'
          AND is_deleted = False
          AND is_latest = True
        LIMIT 1;

        -- Get failure recipients
        SELECT attribute_value INTO recipients_failure
        FROM data_platform.data_ingestion_config
        WHERE attribute_name = 'failure_mailing_list'
          AND module = 'notification_ingestion_configuration'
          AND is_deleted = False
          AND is_latest = True
        LIMIT 1;

        -- Get mail URL
        SELECT attribute_value INTO full_url
        FROM data_platform.data_ingestion_config
        WHERE attribute_name = 'mail_url'
          AND module = 'notification_ingestion_configuration'
          AND is_deleted = False
          AND is_latest = True
        LIMIT 1;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE NOTICE 'One or more required configuration values not found. Skipping mail notification mapping update.';
            RETURN NEW;
    END;

    -- Delete existing entries for this tenant/pipeline combination
    DELETE FROM global.mail_notification_mapping 
    WHERE tenant = tenant_value 
      AND pipeline = pipeline_value 
      AND type IN ('failure', 'success');

    -- Insert new entries
    BEGIN
        -- Insert failure notification
        INSERT INTO global.mail_notification_mapping (
            tenant, pipeline, type, subject, recipients, url
        ) VALUES (
            COALESCE(tenant_value, 'default_tenant'),
            COALESCE(pipeline_value, 'default_pipeline'),
            'failure',
            COALESCE(tenant_value, 'default_tenant') || ' ' || COALESCE(pipeline_value, 'default_pipeline') || ' ingestion status - VALIDATION FAILED',
            COALESCE(recipients_failure, '[]'),
            COALESCE(full_url, 'http://default-url.com')
        );

        -- Insert success notification
        INSERT INTO global.mail_notification_mapping (
            tenant, pipeline, type, subject, recipients, url
        ) VALUES (
            COALESCE(tenant_value, 'default_tenant'),
            COALESCE(pipeline_value, 'default_pipeline'),
            'success',
            COALESCE(tenant_value, 'default_tenant') || ' ' || COALESCE(pipeline_value, 'default_pipeline') || ' ingestion status - SUCCESS',
            COALESCE(recipients_success, '[]'),
            COALESCE(full_url, 'http://default-url.com')
        );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to update mail notification mapping: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER trigger_update_mail_notification_mapping
AFTER INSERT OR UPDATE OF module, attribute_value
ON data_platform.data_ingestion_config
FOR EACH ROW
WHEN (NEW.module = 'notification_ingestion_configuration')
EXECUTE FUNCTION data_platform.update_mail_notification_mapping();