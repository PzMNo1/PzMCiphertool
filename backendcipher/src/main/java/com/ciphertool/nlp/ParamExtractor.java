package com.ciphertool.nlp;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 智能参数提取器 - 从自然语言查询中提取结构化参数
 */
@Component
public class ParamExtractor {
    
    private static final Pattern NUMBER_PATTERN = Pattern.compile("(\\d+(?:\\.\\d+)?)");
    private static final Pattern LOCATION_EN_PATTERN = Pattern.compile("\\bin\\s+([A-Z][A-Za-z\\s]{1,40})(?:\\s+with|\\s+above|\\s+rating|\\.|$)");
    private static final Pattern DATE_PATTERN = Pattern.compile("(\\d{4})[-年](\\d{1,2})[-月](\\d{1,2})[日]?");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b");
    private static final Pattern URL_PATTERN = Pattern.compile("https?://[^\\s]+");
    
    private final Map<String, String> cityMap = new LinkedHashMap<>();
    private final Map<String, String> categoryMap = new LinkedHashMap<>();
    
    public ParamExtractor() {
        initializeMaps();
    }
    
    private void initializeMaps() {
        // 城市映射
        cityMap.put("北京", "Beijing");
        cityMap.put("beijing", "Beijing");
        cityMap.put("上海", "Shanghai");
        cityMap.put("shanghai", "Shanghai");
        cityMap.put("深圳", "Shenzhen");
        cityMap.put("shenzhen", "Shenzhen");
        cityMap.put("广州", "Guangzhou");
        cityMap.put("guangzhou", "Guangzhou");
        cityMap.put("杭州", "Hangzhou");
        cityMap.put("hangzhou", "Hangzhou");
        cityMap.put("成都", "Chengdu");
        cityMap.put("chengdu", "Chengdu");
        cityMap.put("纽约", "New York");
        cityMap.put("new york", "New York");
        cityMap.put("伦敦", "London");
        cityMap.put("london", "London");
        cityMap.put("东京", "Tokyo");
        cityMap.put("tokyo", "Tokyo");
        
        // 分类映射
        categoryMap.put("咖啡", "coffee shop");
        categoryMap.put("coffee", "coffee shop");
        categoryMap.put("餐厅", "restaurant");
        categoryMap.put("restaurant", "restaurant");
        categoryMap.put("酒店", "hotel");
        categoryMap.put("hotel", "hotel");
        categoryMap.put("景点", "attraction");
        categoryMap.put("attraction", "attraction");
        categoryMap.put("博物馆", "museum");
        categoryMap.put("museum", "museum");
        categoryMap.put("购物", "shopping");
        categoryMap.put("shopping", "shopping");
    }
    
    /**
     * 从查询中智能提取参数
     */
    public JSONObject extractParams(String query, JSONObject schema) {
        JSONObject extracted = new JSONObject();
        
        if (schema == null || query == null || query.isBlank()) {
            return extracted;
        }
        
        JSONObject properties = schema.getJSONObject("properties");
        if (properties == null) {
            return extracted;
        }
        
        String lowerQuery = query.toLowerCase(Locale.ROOT);
        
        // 遍历schema中的所有参数
        for (String key : properties.keySet()) {
            JSONObject property = properties.getJSONObject(key);
            String type = property.getString("type");
            String lowerKey = key.toLowerCase(Locale.ROOT);
            
            Object value = extractByKeyAndType(key, lowerKey, type, query, lowerQuery, property);
            if (value != null) {
                extracted.put(key, value);
            }
        }
        
        return extracted;
    }
    
    private Object extractByKeyAndType(String key, String lowerKey, String type, String query, String lowerQuery, JSONObject property) {
        // 优先处理enum
        JSONArray enumValues = property.getJSONArray("enum");
        if (enumValues != null && !enumValues.isEmpty()) {
            for (int i = 0; i < enumValues.size(); i++) {
                String candidate = enumValues.getString(i);
                if (lowerQuery.contains(candidate.toLowerCase(Locale.ROOT))) {
                    return candidate;
                }
            }
            return enumValues.get(0); // 返回默认值
        }
        
        // 根据类型提取
        switch (type) {
            case "integer":
            case "number":
                return extractNumber(key, lowerKey, query, type);
            case "boolean":
                return extractBoolean(lowerKey, lowerQuery);
            case "array":
                return new JSONArray();
            case "string":
            default:
                return extractString(key, lowerKey, query, lowerQuery);
        }
    }
    
    private Object extractNumber(String key, String lowerKey, String query, String type) {
        // 特殊数字字段处理
        if (lowerKey.contains("limit") || lowerKey.contains("count") || lowerKey.contains("size")) {
            Double num = extractNumberFromQuery(query);
            if (num != null) {
                return "integer".equals(type) ? num.intValue() : num;
            }
            return 10; // 默认limit
        }
        
        if (lowerKey.contains("rating") || lowerKey.contains("score")) {
            Double num = extractNumberFromQuery(query);
            if (num != null) {
                return "integer".equals(type) ? num.intValue() : num;
            }
            return 4.5; // 默认评分
        }
        
        if (lowerKey.contains("page")) {
            Double num = extractNumberFromQuery(query);
            if (num != null) {
                return "integer".equals(type) ? num.intValue() : num;
            }
            return 1;
        }
        
        // 通用数字提取
        Double num = extractNumberFromQuery(query);
        if (num != null) {
            return "integer".equals(type) ? num.intValue() : num;
        }
        
        return null;
    }
    
    private Double extractNumberFromQuery(String query) {
        Matcher matcher = NUMBER_PATTERN.matcher(query);
        Double last = null;
        while (matcher.find()) {
            last = Double.parseDouble(matcher.group(1));
        }
        return last;
    }
    
    private Boolean extractBoolean(String lowerKey, String lowerQuery) {
        if (lowerKey.contains("enable") || lowerKey.contains("active") || lowerKey.contains("open")) {
            if (lowerQuery.contains("true") || lowerQuery.contains("yes") || lowerQuery.contains("是") || lowerQuery.contains("启用")) {
                return true;
            }
            if (lowerQuery.contains("false") || lowerQuery.contains("no") || lowerQuery.contains("否") || lowerQuery.contains("禁用")) {
                return false;
            }
        }
        return false; // 默认false
    }
    
    private String extractString(String key, String lowerKey, String query, String lowerQuery) {
        // 位置/城市
        if (lowerKey.contains("city") || lowerKey.contains("location") || lowerKey.contains("place") || lowerKey.contains("destination")) {
            return extractLocation(query, lowerQuery);
        }
        
        // 分类/类型
        if (lowerKey.contains("category") || lowerKey.contains("type")) {
            return extractCategory(lowerQuery);
        }
        
        // 日期
        if (lowerKey.contains("date") || lowerKey.contains("time")) {
            String date = extractDate(query);
            if (date != null) return date;
        }
        
        // 邮箱
        if (lowerKey.contains("email") || lowerKey.contains("mail")) {
            String email = extractEmail(query);
            if (email != null) return email;
        }
        
        // URL
        if (lowerKey.contains("url") || lowerKey.contains("link") || lowerKey.contains("website")) {
            String url = extractUrl(query);
            if (url != null) return url;
        }
        
        // 通用字符串 - query/keyword/text等直接用原查询
        if (lowerKey.contains("query") || lowerKey.contains("keyword") || lowerKey.contains("prompt")
                || lowerKey.contains("text") || lowerKey.contains("input") || lowerKey.contains("description")
                || lowerKey.contains("topic") || lowerKey.contains("company") || lowerKey.contains("symbol")
                || lowerKey.contains("name")) {
            return query;
        }
        
        return null;
    }
    
    private String extractLocation(String query, String lowerQuery) {
        // 中文城市
        for (Map.Entry<String, String> entry : cityMap.entrySet()) {
            if (lowerQuery.contains(entry.getKey().toLowerCase(Locale.ROOT))) {
                return entry.getValue();
            }
        }
        
        // 英文模式匹配
        Matcher matcher = LOCATION_EN_PATTERN.matcher(query);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        
        return null;
    }
    
    private String extractCategory(String lowerQuery) {
        for (Map.Entry<String, String> entry : categoryMap.entrySet()) {
            if (lowerQuery.contains(entry.getKey().toLowerCase(Locale.ROOT))) {
                return entry.getValue();
            }
        }
        return null;
    }
    
    private String extractDate(String query) {
        Matcher matcher = DATE_PATTERN.matcher(query);
        if (matcher.find()) {
            return matcher.group(1) + "-" + String.format("%02d", Integer.parseInt(matcher.group(2))) 
                    + "-" + String.format("%02d", Integer.parseInt(matcher.group(3)));
        }
        return null;
    }
    
    private String extractEmail(String query) {
        Matcher matcher = EMAIL_PATTERN.matcher(query);
        if (matcher.find()) {
            return matcher.group(0);
        }
        return null;
    }
    
    private String extractUrl(String query) {
        Matcher matcher = URL_PATTERN.matcher(query);
        if (matcher.find()) {
            return matcher.group(0);
        }
        return null;
    }
}
