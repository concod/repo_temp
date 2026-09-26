--liquibase formatted sql
--changeset bishesh.ujjain@impactanalytics.co:admin_default_views stripComments:false splitStatements:false context:Release_1_0 labels:mtp-76505
--comment: initial changeset for plansmart admin_default_views
CREATE TABLE plan_smart.admin_default_views (
    created_by INT NOT NULL,
    view_id INT NOT NULL,
    screen_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (created_by, screen_id),
    FOREIGN KEY (created_by) REFERENCES global.user_master(user_code),
    FOREIGN KEY (view_id) REFERENCES plan_smart.view_management(view_id) ON DELETE CASCADE,
    FOREIGN KEY (screen_id) REFERENCES plan_smart.screens(screen_id) ON DELETE CASCADE
);
