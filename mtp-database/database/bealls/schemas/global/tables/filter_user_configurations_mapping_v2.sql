--liquibase formatted sql
--changeset prashant.singh@impactanalytics.co:filter_user_configurations_mapping_v2 stripComments:false splitStatements:false context:mtp-18795 labels:Added new fucm for InventorySmart
--comment: Added new table
CREATE TABLE IF NOT EXISTS "global".filter_user_configurations_mapping_v2 (
    -- Original Columns
    fuc_code serial4 NOT NULL,
    fuc_name varchar NOT NULL,
    code int4 NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by int4 NULL,
    updated_by int4 NULL,
    attribute_value varchar NOT NULL,
    is_broadcast boolean DEFAULT false,
    is_default_to_users jsonb,
    description varchar DEFAULT NULL,
    is_deleted boolean DEFAULT false,

    -- Primary Key
    CONSTRAINT fuc_v2_pk PRIMARY KEY (fuc_code),

    -- Check Constraints
    CONSTRAINT tab_c_name_check_v2 CHECK ((length((fuc_name)::text) > 0)),

    -- Foreign Keys
    CONSTRAINT filter_user_configurations_v2_updated_at_fk 
        FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) 
        ON DELETE SET NULL,
    
    CONSTRAINT filter_user_configurations_v2_created_by_fk 
        FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) 
        ON DELETE SET NULL,
    
    -- Updated to ON DELETE CASCADE per Release_3 changeset
    CONSTRAINT filter_user_configurations_v2_screen_code_fk 
        FOREIGN KEY (code) REFERENCES "global".module_master(module_code) 
        ON DELETE CASCADE,

    -- Exclude Constraint for Soft Deletes (requires btree_gist extension in Postgres)
    CONSTRAINT unique_name_check_not_deleted_v2 
        EXCLUDE (fuc_name WITH =, created_by WITH =, code WITH =) 
        WHERE (is_deleted = FALSE)
);
