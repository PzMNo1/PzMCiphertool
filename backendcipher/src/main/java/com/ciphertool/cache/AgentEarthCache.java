package com.ciphertool.cache;

import com.alibaba.fastjson2.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
/**
 * AgentEarth结果缓存，避免相同查询重复调用API
 */
@Component
public class AgentEarthCache {
    
    private static final Logger log = LoggerFactory.getLogger(AgentEarthCache.class);
    
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private final long ttlMillis = TimeUnit.MINUTES.toMillis(15); // 缓存15分钟
    private final int maxEntries = 1000;
    
    public String get(String query, String taskContext) {
        String key = buildKey(query, taskContext);
        CacheEntry entry = cache.get(key);
        
        if (entry == null) {
            return null;
        }
        
        if (System.currentTimeMillis() - entry.timestamp > ttlMillis) {
            cache.remove(key);
            log.debug("Cache expired for key: {}", key);
            return null;
        }
        
        log.debug("Cache hit for query: {}", query);
        return entry.result;
    }
    
    public void put(String query, String taskContext, String result) {
        if (cache.size() >= maxEntries) {
            evictOldest();
        }
        
        String key = buildKey(query, taskContext);
        cache.put(key, new CacheEntry(result, System.currentTimeMillis()));
        log.debug("Cached result for query: {}", query);
    }
    
    public void invalidate(String query, String taskContext) {
        String key = buildKey(query, taskContext);
        cache.remove(key);
    }
    
    public void clear() {
        cache.clear();
        log.info("AgentEarth cache cleared");
    }
    
    public int size() {
        return cache.size();
    }

    public long getTtlMinutes() {
        return TimeUnit.MILLISECONDS.toMinutes(ttlMillis);
    }

    public int getMaxEntries() {
        return maxEntries;
    }

    /**
     * 清理已过期条目，返回清理数量。
     */
    public int purgeExpired() {
        long now = System.currentTimeMillis();
        int removed = 0;
        for (Map.Entry<String, CacheEntry> entry : cache.entrySet()) {
            if (now - entry.getValue().timestamp > ttlMillis) {
                cache.remove(entry.getKey());
                removed++;
            }
        }
        if (removed > 0) {
            log.debug("Purged {} expired AgentEarth cache entries", removed);
        }
        return removed;
    }
    
    private String buildKey(String query, String taskContext) {
        String normalizedQuery = query == null ? "" : query.trim();
        String normalizedContext = taskContext == null ? "" : taskContext.trim();
        return normalizedQuery + "|" + normalizedContext;
    }
    
    private void evictOldest() {
        String oldestKey = null;
        long oldestTime = Long.MAX_VALUE;
        
        for (Map.Entry<String, CacheEntry> entry : cache.entrySet()) {
            if (entry.getValue().timestamp < oldestTime) {
                oldestTime = entry.getValue().timestamp;
                oldestKey = entry.getKey();
            }
        }
        
        if (oldestKey != null) {
            cache.remove(oldestKey);
            log.debug("Evicted oldest cache entry");
        }
    }
    
    private static class CacheEntry {
        final String result;
        final long timestamp;
        
        CacheEntry(String result, long timestamp) {
            this.result = result;
            this.timestamp = timestamp;
        }
    }
}
