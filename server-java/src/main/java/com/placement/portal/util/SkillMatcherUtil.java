package com.placement.portal.util;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Deterministic Skill Matching & Normalization Engine for Placement Portal.
 * Java port of server/services/skillMatcher.js.
 */
public final class SkillMatcherUtil {

    private SkillMatcherUtil() {}

    // Canonical alias dictionary: maps lowercase variants to standard display names
    public static final Map<String, String> SKILL_ALIASES = new HashMap<>();

    static {
        // Programming Languages
        SKILL_ALIASES.put("javascript", "JavaScript");
        SKILL_ALIASES.put("js", "JavaScript");
        SKILL_ALIASES.put("ecmascript", "JavaScript");
        SKILL_ALIASES.put("typescript", "TypeScript");
        SKILL_ALIASES.put("ts", "TypeScript");
        SKILL_ALIASES.put("python", "Python");
        SKILL_ALIASES.put("py", "Python");
        SKILL_ALIASES.put("python3", "Python");
        SKILL_ALIASES.put("java", "Java");
        SKILL_ALIASES.put("c++", "C++");
        SKILL_ALIASES.put("cpp", "C++");
        SKILL_ALIASES.put("cplusplus", "C++");
        SKILL_ALIASES.put("c plus plus", "C++");
        SKILL_ALIASES.put("c#", "C#");
        SKILL_ALIASES.put("csharp", "C#");
        SKILL_ALIASES.put("c sharp", "C#");
        SKILL_ALIASES.put("c", "C");
        SKILL_ALIASES.put("golang", "Go");
        SKILL_ALIASES.put("go", "Go");
        SKILL_ALIASES.put("rust", "Rust");
        SKILL_ALIASES.put("ruby", "Ruby");
        SKILL_ALIASES.put("php", "PHP");
        SKILL_ALIASES.put("swift", "Swift");
        SKILL_ALIASES.put("kotlin", "Kotlin");
        SKILL_ALIASES.put("dart", "Dart");
        SKILL_ALIASES.put("scala", "Scala");
        SKILL_ALIASES.put("r", "R");
        SKILL_ALIASES.put("bash", "Bash");
        SKILL_ALIASES.put("shell", "Shell Scripting");
        SKILL_ALIASES.put("powershell", "PowerShell");
        SKILL_ALIASES.put("sql", "SQL");
        SKILL_ALIASES.put("html", "HTML");
        SKILL_ALIASES.put("html5", "HTML");
        SKILL_ALIASES.put("css", "CSS");
        SKILL_ALIASES.put("css3", "CSS");

        // Frontend Frameworks & Libraries
        SKILL_ALIASES.put("react", "React");
        SKILL_ALIASES.put("react.js", "React");
        SKILL_ALIASES.put("reactjs", "React");
        SKILL_ALIASES.put("angular", "Angular");
        SKILL_ALIASES.put("angular.js", "Angular");
        SKILL_ALIASES.put("angularjs", "Angular");
        SKILL_ALIASES.put("vue", "Vue.js");
        SKILL_ALIASES.put("vue.js", "Vue.js");
        SKILL_ALIASES.put("vuejs", "Vue.js");
        SKILL_ALIASES.put("next.js", "Next.js");
        SKILL_ALIASES.put("nextjs", "Next.js");
        SKILL_ALIASES.put("next", "Next.js");
        SKILL_ALIASES.put("redux", "Redux");
        SKILL_ALIASES.put("tailwind", "Tailwind CSS");
        SKILL_ALIASES.put("tailwindcss", "Tailwind CSS");
        SKILL_ALIASES.put("tailwind css", "Tailwind CSS");
        SKILL_ALIASES.put("bootstrap", "Bootstrap");
        SKILL_ALIASES.put("sass", "Sass");
        SKILL_ALIASES.put("jquery", "jQuery");

        // Backend Frameworks & Runtimes
        SKILL_ALIASES.put("node", "Node.js");
        SKILL_ALIASES.put("node.js", "Node.js");
        SKILL_ALIASES.put("nodejs", "Node.js");
        SKILL_ALIASES.put("express", "Express.js");
        SKILL_ALIASES.put("express.js", "Express.js");
        SKILL_ALIASES.put("expressjs", "Express.js");
        SKILL_ALIASES.put("spring", "Spring Boot");
        SKILL_ALIASES.put("spring boot", "Spring Boot");
        SKILL_ALIASES.put("springboot", "Spring Boot");
        SKILL_ALIASES.put("django", "Django");
        SKILL_ALIASES.put("flask", "Flask");
        SKILL_ALIASES.put("fastapi", "FastAPI");
        SKILL_ALIASES.put("nest.js", "NestJS");
        SKILL_ALIASES.put("nestjs", "NestJS");
        SKILL_ALIASES.put("asp.net", "ASP.NET");
        SKILL_ALIASES.put("dotnet", ".NET");
        SKILL_ALIASES.put(".net", ".NET");
        SKILL_ALIASES.put("laravel", "Laravel");
        SKILL_ALIASES.put("rails", "Ruby on Rails");
        SKILL_ALIASES.put("ruby on rails", "Ruby on Rails");

        // Mobile
        SKILL_ALIASES.put("flutter", "Flutter");
        SKILL_ALIASES.put("react native", "React Native");
        SKILL_ALIASES.put("react-native", "React Native");
        SKILL_ALIASES.put("android", "Android Development");
        SKILL_ALIASES.put("ios", "iOS Development");

        // Databases & Storage
        SKILL_ALIASES.put("mongodb", "MongoDB");
        SKILL_ALIASES.put("mongo", "MongoDB");
        SKILL_ALIASES.put("postgresql", "PostgreSQL");
        SKILL_ALIASES.put("postgres", "PostgreSQL");
        SKILL_ALIASES.put("mysql", "MySQL");
        SKILL_ALIASES.put("sqlite", "SQLite");
        SKILL_ALIASES.put("redis", "Redis");
        SKILL_ALIASES.put("oracle", "Oracle DB");
        SKILL_ALIASES.put("cassandra", "Cassandra");
        SKILL_ALIASES.put("dynamodb", "DynamoDB");
        SKILL_ALIASES.put("firebase", "Firebase");
        SKILL_ALIASES.put("supabase", "Supabase");

        // Cloud & DevOps
        SKILL_ALIASES.put("aws", "AWS");
        SKILL_ALIASES.put("amazon web services", "AWS");
        SKILL_ALIASES.put("azure", "Azure");
        SKILL_ALIASES.put("microsoft azure", "Azure");
        SKILL_ALIASES.put("gcp", "GCP");
        SKILL_ALIASES.put("google cloud", "GCP");
        SKILL_ALIASES.put("google cloud platform", "GCP");
        SKILL_ALIASES.put("docker", "Docker");
        SKILL_ALIASES.put("kubernetes", "Kubernetes");
        SKILL_ALIASES.put("k8s", "Kubernetes");
        SKILL_ALIASES.put("jenkins", "Jenkins");
        SKILL_ALIASES.put("git", "Git");
        SKILL_ALIASES.put("github", "GitHub");
        SKILL_ALIASES.put("gitlab", "GitLab");
        SKILL_ALIASES.put("ci/cd", "CI/CD");
        SKILL_ALIASES.put("cicd", "CI/CD");
        SKILL_ALIASES.put("linux", "Linux");
        SKILL_ALIASES.put("unix", "Linux");
        SKILL_ALIASES.put("terraform", "Terraform");
        SKILL_ALIASES.put("ansible", "Ansible");
        SKILL_ALIASES.put("nginx", "Nginx");

        // Data Science, AI & ML
        SKILL_ALIASES.put("machine learning", "Machine Learning");
        SKILL_ALIASES.put("ml", "Machine Learning");
        SKILL_ALIASES.put("artificial intelligence", "Artificial Intelligence");
        SKILL_ALIASES.put("ai", "Artificial Intelligence");
        SKILL_ALIASES.put("deep learning", "Deep Learning");
        SKILL_ALIASES.put("dl", "Deep Learning");
        SKILL_ALIASES.put("nlp", "NLP");
        SKILL_ALIASES.put("natural language processing", "NLP");
        SKILL_ALIASES.put("computer vision", "Computer Vision");
        SKILL_ALIASES.put("cv", "Computer Vision");
        SKILL_ALIASES.put("tensorflow", "TensorFlow");
        SKILL_ALIASES.put("pytorch", "PyTorch");
        SKILL_ALIASES.put("keras", "Keras");
        SKILL_ALIASES.put("scikit-learn", "Scikit-Learn");
        SKILL_ALIASES.put("sklearn", "Scikit-Learn");
        SKILL_ALIASES.put("pandas", "Pandas");
        SKILL_ALIASES.put("numpy", "NumPy");
        SKILL_ALIASES.put("matplotlib", "Matplotlib");
        SKILL_ALIASES.put("tableau", "Tableau");
        SKILL_ALIASES.put("power bi", "Power BI");
        SKILL_ALIASES.put("powerbi", "Power BI");

        // Core Computer Science & Architecture
        SKILL_ALIASES.put("data structures", "Data Structures");
        SKILL_ALIASES.put("algorithms", "Algorithms");
        SKILL_ALIASES.put("dsa", "Data Structures & Algorithms");
        SKILL_ALIASES.put("data structures and algorithms", "Data Structures & Algorithms");
        SKILL_ALIASES.put("data structures & algorithms", "Data Structures & Algorithms");
        SKILL_ALIASES.put("oop", "OOP");
        SKILL_ALIASES.put("oops", "OOP");
        SKILL_ALIASES.put("object oriented programming", "OOP");
        SKILL_ALIASES.put("system design", "System Design");
        SKILL_ALIASES.put("rest", "REST APIs");
        SKILL_ALIASES.put("rest api", "REST APIs");
        SKILL_ALIASES.put("rest apis", "REST APIs");
        SKILL_ALIASES.put("restful", "REST APIs");
        SKILL_ALIASES.put("restful api", "REST APIs");
        SKILL_ALIASES.put("graphql", "GraphQL");
        SKILL_ALIASES.put("microservices", "Microservices");
        SKILL_ALIASES.put("dbms", "DBMS");
        SKILL_ALIASES.put("computer networks", "Computer Networks");
        SKILL_ALIASES.put("operating systems", "Operating Systems");
        SKILL_ALIASES.put("agile", "Agile");
        SKILL_ALIASES.put("scrum", "Scrum");
    }

    private static final Pattern ALTERNATIVE_DELIMITER_PATTERN =
            Pattern.compile("\\s*\\|\\s*|\\s+/\\s*|\\s*/\\s+|\\s+or\\s+", Pattern.CASE_INSENSITIVE);

    public static String normalizeSkill(String rawSkill) {
        if (rawSkill == null) return "";
        String clean = rawSkill.trim();
        if (clean.isEmpty()) return "";

        String lower = clean.toLowerCase();

        // 1. Direct alias match
        if (SKILL_ALIASES.containsKey(lower)) {
            return SKILL_ALIASES.get(lower);
        }

        // 2. Normalized punctuation match
        String stripped = lower.replaceAll("[-_.]", " ").replaceAll("\\s+", " ").trim();
        if (SKILL_ALIASES.containsKey(stripped)) {
            return SKILL_ALIASES.get(stripped);
        }
        String collapsed = lower.replaceAll("[-_.\\s]", "");
        if (SKILL_ALIASES.containsKey(collapsed)) {
            return SKILL_ALIASES.get(collapsed);
        }

        // 3. Fallback: Capitalize words cleanly
        String[] words = clean.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < words.length; i++) {
            String word = words[i];
            if (!word.isEmpty()) {
                sb.append(Character.toUpperCase(word.charAt(0)));
                if (word.length() > 1) {
                    sb.append(word.substring(1).toLowerCase());
                }
                if (i < words.length - 1) {
                    sb.append(" ");
                }
            }
        }
        return sb.toString();
    }

    public static RequirementSlot parseRequirementSlot(String rawReq) {
        if (rawReq == null) {
            return new RequirementSlot(false, "", Collections.emptyList());
        }
        String trimmed = rawReq.trim();
        if (trimmed.isEmpty()) {
            return new RequirementSlot(false, "", Collections.emptyList());
        }

        String lower = trimmed.toLowerCase();

        // Exact match with known alias (e.g., "ci/cd", "c++", ".net")
        if (SKILL_ALIASES.containsKey(lower)) {
            String canonical = SKILL_ALIASES.get(lower);
            return new RequirementSlot(false, canonical, List.of(canonical));
        }

        // Check for alternative delimiters
        if (ALTERNATIVE_DELIMITER_PATTERN.matcher(trimmed).find()) {
            String[] rawParts = ALTERNATIVE_DELIMITER_PATTERN.split(trimmed);
            Set<String> seenOptions = new HashSet<>();
            List<String> options = new ArrayList<>();

            for (String part : rawParts) {
                String normalized = normalizeSkill(part);
                if (!normalized.isEmpty() && seenOptions.add(normalized.toLowerCase())) {
                    options.add(normalized);
                }
            }

            if (options.size() > 1) {
                String canonical = String.join(" / ", options);
                return new RequirementSlot(true, canonical, options);
            } else if (options.size() == 1) {
                return new RequirementSlot(false, options.get(0), options);
            }
        }

        String canonical = normalizeSkill(trimmed);
        return new RequirementSlot(false, canonical, canonical.isEmpty() ? Collections.emptyList() : List.of(canonical));
    }

    public static List<String> normalizeSkillList(Collection<String> skillsInput) {
        if (skillsInput == null) return Collections.emptyList();

        Set<String> seen = new HashSet<>();
        List<String> result = new ArrayList<>();

        for (String item : skillsInput) {
            if (item != null) {
                RequirementSlot parsed = parseRequirementSlot(item);
                if (!parsed.canonical().isEmpty() && seen.add(parsed.canonical().toLowerCase())) {
                    result.add(parsed.canonical());
                }
            }
        }
        return result;
    }

    public static SkillMatchResult calculateSkillMatch(Collection<String> candidateSkillsInput, Collection<String> requiredSkillsInput) {
        List<String> candidateSkills = normalizeSkillList(candidateSkillsInput);

        List<RequirementSlot> reqSlots = new ArrayList<>();
        Set<String> seenReqs = new HashSet<>();
        if (requiredSkillsInput != null) {
            for (String raw : requiredSkillsInput) {
                if (raw != null) {
                    RequirementSlot parsed = parseRequirementSlot(raw);
                    if (!parsed.canonical().isEmpty() && seenReqs.add(parsed.canonical().toLowerCase())) {
                        reqSlots.add(parsed);
                    }
                }
            }
        }

        Set<String> candidateSet = new HashSet<>();
        for (String s : candidateSkills) {
            candidateSet.add(s.toLowerCase());
        }

        List<String> matchedSkills = new ArrayList<>();
        List<String> missingSkills = new ArrayList<>();
        int totalMatched = 0;

        Set<String> allRequiredOptionSet = new HashSet<>();

        for (RequirementSlot slot : reqSlots) {
            for (String opt : slot.options()) {
                allRequiredOptionSet.add(opt.toLowerCase());
            }

            if (slot.isAlternative()) {
                List<String> matchedOptions = new ArrayList<>();
                for (String opt : slot.options()) {
                    if (candidateSet.contains(opt.toLowerCase())) {
                        matchedOptions.add(opt);
                    }
                }

                if (!matchedOptions.isEmpty()) {
                    totalMatched += 1;
                    for (String opt : matchedOptions) {
                        if (!matchedSkills.contains(opt)) {
                            matchedSkills.add(opt);
                        }
                    }
                } else {
                    missingSkills.add(slot.canonical());
                }
            } else {
                String opt = slot.options().isEmpty() ? slot.canonical() : slot.options().get(0);
                if (candidateSet.contains(opt.toLowerCase())) {
                    totalMatched += 1;
                    matchedSkills.add(opt);
                } else {
                    missingSkills.add(slot.canonical());
                }
            }
        }

        List<String> additionalSkills = new ArrayList<>();
        for (String candSkill : candidateSkills) {
            if (!allRequiredOptionSet.contains(candSkill.toLowerCase())) {
                additionalSkills.add(candSkill);
            }
        }

        int totalRequired = reqSlots.size();
        int score;
        String explanation;

        if (totalRequired == 0) {
            score = 100;
            explanation = "No specific technical skills are required for this placement drive (baseline 100% match score). This does not establish candidate suitability or job qualification.";
        } else if (candidateSkills.isEmpty()) {
            score = 0;
            explanation = "Candidate has no listed technical skills. " + totalRequired + " required skills missing.";
        } else {
            score = (int) Math.round(((double) totalMatched / totalRequired) * 100.0);
            score = Math.max(0, Math.min(100, score));

            if (score == 100) {
                explanation = "Exceptional match! Candidate satisfies all " + totalRequired + " required skills (" + String.join(", ", matchedSkills) + ").";
            } else if (score >= 70) {
                explanation = "Strong match: " + totalMatched + " of " + totalRequired + " required skills matched (" + score + "%). Missing: " + String.join(", ", missingSkills) + ".";
            } else if (score >= 40) {
                explanation = "Moderate match: " + totalMatched + " of " + totalRequired + " required skills matched (" + score + "%). Missing: " + String.join(", ", missingSkills) + ".";
            } else if (score > 0) {
                explanation = "Partial match: " + totalMatched + " of " + totalRequired + " required skills matched (" + score + "%). Missing: " + String.join(", ", missingSkills) + ".";
            } else {
                explanation = "No match: 0 of " + totalRequired + " required skills matched. Missing: " + String.join(", ", missingSkills) + ".";
            }
        }

        return new SkillMatchResult(
                score,
                score,
                matchedSkills,
                missingSkills,
                additionalSkills,
                totalRequired,
                totalMatched,
                explanation
        );
    }

    public record RequirementSlot(boolean isAlternative, String canonical, List<String> options) {}

    public record SkillMatchResult(
            int score,
            int matchPercentage,
            List<String> matchedSkills,
            List<String> missingSkills,
            List<String> additionalSkills,
            int totalRequired,
            int totalMatched,
            String explanation
    ) {}
}
