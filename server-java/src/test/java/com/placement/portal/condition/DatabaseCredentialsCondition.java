package com.placement.portal.condition;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;

public class DatabaseCredentialsCondition implements ExecutionCondition {

    @Override
    public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
        String p1 = System.getenv("PLACEMENT_APP_PASSWORD");
        String p2 = System.getenv("SPRING_DATASOURCE_PASSWORD");
        if ((p1 != null && !p1.isBlank()) || (p2 != null && !p2.isBlank())) {
            return ConditionEvaluationResult.enabled("Database credentials present in environment");
        }
        return ConditionEvaluationResult.disabled(
            "Neither PLACEMENT_APP_PASSWORD nor SPRING_DATASOURCE_PASSWORD environment variable is set; skipping database schema validation integration test"
        );
    }
}
