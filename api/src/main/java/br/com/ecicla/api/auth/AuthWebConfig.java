package br.com.ecicla.api.auth;

import java.util.List;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Which routes require signing in and which require the ADMIN profile. Everything else is public. */
@Configuration
public class AuthWebConfig implements WebMvcConfigurer {

    static final String[] SIGNED_IN = {"/api/me", "/api/me/**", "/api/auth/logout", "/api/admin/**"};
    static final String[] ADMIN = {"/api/admin/**"};

    private final AuthInterceptor authInterceptor;
    private final AdminInterceptor adminInterceptor;
    private final CurrentAccountResolver currentAccountResolver;

    public AuthWebConfig(AuthInterceptor authInterceptor, AdminInterceptor adminInterceptor,
            CurrentAccountResolver currentAccountResolver) {
        this.authInterceptor = authInterceptor;
        this.adminInterceptor = adminInterceptor;
        this.currentAccountResolver = currentAccountResolver;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor).addPathPatterns(SIGNED_IN).order(0);
        registry.addInterceptor(adminInterceptor).addPathPatterns(ADMIN).order(1);
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentAccountResolver);
    }
}
