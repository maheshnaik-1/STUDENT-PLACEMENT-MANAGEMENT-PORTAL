package com.placement.portal.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationEntryPoint authenticationEntryPoint;

    @Autowired
    private JwtAccessDeniedHandler accessDeniedHandler;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler)
            )
            .authorizeHttpRequests(auth -> auth
                // 1. Health check & Public authentication endpoints
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/api/auth/login", "/api/auth/register").permitAll()
                .requestMatchers("/api/test/public").permitAll()

                // 2. Student specific drive routes (must precede generic /api/drives/*)
                .requestMatchers("/api/drives/recommendations").hasAnyAuthority("ROLE_STUDENT", "student")
                .requestMatchers("/api/drives/*/match-score").hasAnyAuthority("ROLE_STUDENT", "student")
                .requestMatchers("/api/applications/apply/**").hasAnyAuthority("ROLE_STUDENT", "student")
                .requestMatchers("/api/applications/my-applications").hasAnyAuthority("ROLE_STUDENT", "student")
                .requestMatchers("/api/applications/*/withdraw").hasAnyAuthority("ROLE_STUDENT", "student")
                .requestMatchers("/api/ai/**").hasAnyAuthority("ROLE_STUDENT", "student")

                // 3. Public / Optional Auth views (read-only companies, drives, summary stats)
                .requestMatchers(HttpMethod.GET, "/api/companies", "/api/companies/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/drives", "/api/drives/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/applications/stats").permitAll()

                // 4. Placement Officer specific routes (allows ROLE_OFFICER or officer authority)
                .requestMatchers(HttpMethod.POST, "/api/companies/**").hasAnyAuthority("ROLE_OFFICER", "officer")
                .requestMatchers(HttpMethod.PUT, "/api/companies/**").hasAnyAuthority("ROLE_OFFICER", "officer")
                .requestMatchers(HttpMethod.DELETE, "/api/companies/**").hasAnyAuthority("ROLE_OFFICER", "officer")
                .requestMatchers(HttpMethod.POST, "/api/drives/**").hasAnyAuthority("ROLE_OFFICER", "officer")
                .requestMatchers(HttpMethod.PUT, "/api/drives/**").hasAnyAuthority("ROLE_OFFICER", "officer")
                .requestMatchers(HttpMethod.DELETE, "/api/drives/**").hasAnyAuthority("ROLE_OFFICER", "officer")
                .requestMatchers("/api/applications/analytics").hasAnyAuthority("ROLE_OFFICER", "officer")
                .requestMatchers("/api/applications/drive/**").hasAnyAuthority("ROLE_OFFICER", "officer")
                .requestMatchers("/api/applications/bulk-status").hasAnyAuthority("ROLE_OFFICER", "officer")
                .requestMatchers("/api/applications/*/status").hasAnyAuthority("ROLE_OFFICER", "officer")
                .requestMatchers("/api/students/**").hasAnyAuthority("ROLE_OFFICER", "officer")

                // 5. Authenticated profile, resumes and notification endpoints
                .requestMatchers("/api/auth/me", "/api/auth/profile").authenticated()
                .requestMatchers("/api/auth/resume-upload", "/api/auth/resume", "/api/auth/resume-download/**").authenticated()
                .requestMatchers("/api/notifications/**").authenticated()

                // 6. Any other /api/** request requires authentication
                .requestMatchers("/api/**").authenticated()

                // Fallback: permit any other non-API requests
                .anyRequest().permitAll()
            );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
