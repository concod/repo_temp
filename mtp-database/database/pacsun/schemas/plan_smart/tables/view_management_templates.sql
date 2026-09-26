--liquibase formatted sql
--changeset bishesh.ujjain@impactanalytics.co:view_management_templates stripComments:false splitStatements:false context:Release_1_0 labels:mtp-78867
--comment: initial changeset for plansmart view_management_templates
CREATE TABLE plan_smart.view_management_templates (
    template_id INT PRIMARY KEY,
    screen_id INT NOT NULL,
    is_pivot BOOLEAN DEFAULT FALSE,
    view_details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (screen_id) REFERENCES plan_smart.screens(screen_id)
);