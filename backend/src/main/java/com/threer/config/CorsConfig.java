package com.threer.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins(
                                "https://localhost",
                                "http://localhost",
                                "https://sampies-web.onrender.com",
                                "http://localhost:5173",
                                "http://localhost:4200"
                        )
                        .allowedMethods(
                                "GET", "POST", "PUT",
                                "DELETE", "OPTIONS"
                        )
                        .allowedHeaders("*");
            }
        };
    }
}
