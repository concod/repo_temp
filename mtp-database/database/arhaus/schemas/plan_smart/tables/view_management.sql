--liquibase formatted sql
--changeset bishesh.ujjain@impactanalytics.co:view_management stripComments:false splitStatements:false context:Release_1_0 labels:mtp-61741
--comment: initial changeset for plansmart view_management
CREATE TABLE plan_smart.view_management (
    view_id SERIAL PRIMARY KEY,
    view_name VARCHAR(255) NOT NULL,
    view_type VARCHAR(10) NOT NULL CHECK (view_type IN ('global', 'personal')),
    created_by INT,
    is_default BOOLEAN DEFAULT FALSE,
    is_pivot BOOLEAN DEFAULT FALSE,
    screen_id INT,
    views_details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES global.user_master(user_code),
    FOREIGN KEY (screen_id) REFERENCES plan_smart.screens(screen_id)
);

--changeset bishesh.ujjain@impactanalytics.co:view_management_update_column  stripComments:false splitStatements:false context:Release_1_0 labels:mtp-61743
--comment: initial changeset for plansmart view_management column name change
ALTER TABLE plan_smart.view_management RENAME COLUMN views_details TO view_details;