package com.placement.portal.util;

import java.math.BigDecimal;
import java.net.URI;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class ValidationUtil {

    private ValidationUtil() {}

    public static boolean isValidUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return true; // Optional URLs are valid if blank/empty
        }
        try {
            URI uri = new URI(url.trim());
            String scheme = uri.getScheme();
            return "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
        } catch (Exception e) {
            return false;
        }
    }

    public static List<String> parseSkills(Object skills) {
        List<String> result = new ArrayList<>();
        if (skills == null) {
            return result;
        }
        Set<String> seen = new HashSet<>();
        if (skills instanceof List<?> list) {
            for (Object item : list) {
                if (item != null) {
                    String str = item.toString().trim();
                    if (!str.isEmpty() && seen.add(str.toLowerCase(Locale.ROOT))) {
                        result.add(str);
                    }
                }
            }
        } else if (skills instanceof String str) {
            String[] parts = str.split(",");
            for (String p : parts) {
                String clean = p.trim();
                if (!clean.isEmpty() && seen.add(clean.toLowerCase(Locale.ROOT))) {
                    result.add(clean);
                }
            }
        }
        return result;
    }

    public static BigDecimal parseBigDecimal(Object value, BigDecimal defaultVal) {
        if (value == null) return defaultVal;
        try {
            if (value instanceof Number num) {
                return BigDecimal.valueOf(num.doubleValue());
            }
            String str = value.toString().trim();
            if (str.isEmpty()) return defaultVal;
            return new BigDecimal(str);
        } catch (Exception e) {
            return defaultVal;
        }
    }

    public static Integer parseInteger(Object value, Integer defaultVal) {
        if (value == null) return defaultVal;
        try {
            if (value instanceof Number num) {
                return num.intValue();
            }
            String str = value.toString().trim();
            if (str.isEmpty()) return defaultVal;
            return Integer.parseInt(str);
        } catch (Exception e) {
            return defaultVal;
        }
    }
}
