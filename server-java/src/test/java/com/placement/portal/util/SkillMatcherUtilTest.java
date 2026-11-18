package com.placement.portal.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SkillMatcherUtilTest {

    @Test
    @DisplayName("normalizeSkill handles aliases, casing, and punctuation")
    void testNormalizeSkill() {
        assertEquals("JavaScript", SkillMatcherUtil.normalizeSkill("javascript"));
        assertEquals("JavaScript", SkillMatcherUtil.normalizeSkill("js"));
        assertEquals("React", SkillMatcherUtil.normalizeSkill("react.js"));
        assertEquals("React", SkillMatcherUtil.normalizeSkill("reactjs"));
        assertEquals("Spring Boot", SkillMatcherUtil.normalizeSkill("spring boot"));
        assertEquals("Spring Boot", SkillMatcherUtil.normalizeSkill("springboot"));
        assertEquals("Node.js", SkillMatcherUtil.normalizeSkill("nodejs"));
        assertEquals("C++", SkillMatcherUtil.normalizeSkill("cpp"));
        assertEquals("C#", SkillMatcherUtil.normalizeSkill("csharp"));
        assertEquals("CI/CD", SkillMatcherUtil.normalizeSkill("cicd"));
        assertEquals("Unknown Custom Skill", SkillMatcherUtil.normalizeSkill("unknown custom skill"));
    }

    @Test
    @DisplayName("parseRequirementSlot detects alternative skills")
    void testParseRequirementSlot() {
        SkillMatcherUtil.RequirementSlot slot = SkillMatcherUtil.parseRequirementSlot("Java / Python / C++");
        assertTrue(slot.isAlternative());
        assertEquals("Java / Python / C++", slot.canonical());
        assertEquals(3, slot.options().size());
        assertTrue(slot.options().contains("Java"));
        assertTrue(slot.options().contains("Python"));
        assertTrue(slot.options().contains("C++"));

        SkillMatcherUtil.RequirementSlot single = SkillMatcherUtil.parseRequirementSlot("React");
        assertFalse(single.isAlternative());
        assertEquals("React", single.canonical());
        assertEquals(List.of("React"), single.options());
    }

    @Test
    @DisplayName("calculateSkillMatch calculates exact score and explanation")
    void testCalculateSkillMatch() {
        // 1. Full match
        List<String> candidateSkills = List.of("Java", "Spring Boot", "MySQL", "React");
        List<String> requiredSkills = List.of("Java", "Spring Boot", "MySQL");

        SkillMatcherUtil.SkillMatchResult res = SkillMatcherUtil.calculateSkillMatch(candidateSkills, requiredSkills);
        assertEquals(100, res.score());
        assertEquals(3, res.totalMatched());
        assertEquals(3, res.totalRequired());
        assertTrue(res.missingSkills().isEmpty());
        assertEquals(List.of("React"), res.additionalSkills());

        // 2. Alternative slot satisfied
        List<String> cand2 = List.of("Python", "Docker");
        List<String> req2 = List.of("Java / Python / C++", "Docker");
        SkillMatcherUtil.SkillMatchResult res2 = SkillMatcherUtil.calculateSkillMatch(cand2, req2);
        assertEquals(100, res2.score());
        assertEquals(2, res2.totalMatched());

        // 3. Partial match
        List<String> cand3 = List.of("Java");
        List<String> req3 = List.of("Java", "AWS");
        SkillMatcherUtil.SkillMatchResult res3 = SkillMatcherUtil.calculateSkillMatch(cand3, req3);
        assertEquals(50, res3.score());
        assertEquals(1, res3.totalMatched());
        assertEquals(List.of("AWS"), res3.missingSkills());

        // 4. No required skills baseline
        SkillMatcherUtil.SkillMatchResult res4 = SkillMatcherUtil.calculateSkillMatch(List.of("Python"), List.of());
        assertEquals(100, res4.score());
        assertEquals(0, res4.totalRequired());
    }
}
