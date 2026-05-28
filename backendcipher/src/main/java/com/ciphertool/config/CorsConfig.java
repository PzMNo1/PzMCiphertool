package com.ciphertool.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

/**
 * CORS Configuration
 */
@Configuration
public class CorsConfig {

    @Value("${cors.allowed-origins:*}")
    private String allowedOrigins;

    @Value("${cors.allowed-methods:GET,POST,OPTIONS}")
    private String allowedMethods;

    @Value("${cors.allowed-headers:*}")
    private String allowedHeaders;

    @Value("${cors.max-age:3600}")
    private long maxAge;

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        
        if ("*".equals(allowedOrigins)) {
            config.addAllowedOriginPattern("*");
        } else {
            Arrays.stream(allowedOrigins.split(","))
                  .map(String::trim)
                  .forEach(config::addAllowedOrigin);
        }
        
        Arrays.stream(allowedMethods.split(","))
              .map(String::trim)
              .forEach(config::addAllowedMethod);
        
        config.addAllowedHeader(allowedHeaders);
        config.setAllowCredentials(true);
        config.setMaxAge(maxAge);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        
        return new CorsFilter(source);
    }
}
