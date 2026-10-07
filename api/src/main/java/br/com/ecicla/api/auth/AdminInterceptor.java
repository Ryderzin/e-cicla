package br.com.ecicla.api.auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Runs after {@link AuthInterceptor} on administration routes: answers 403 to accounts that are not ADMIN. */
@Component
public class AdminInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (CorsUtils.isPreFlightRequest(request)) {
            return true;
        }
        if (!(request.getAttribute(AuthInterceptor.ATTRIBUTE) instanceof Authenticated authenticated)
                || !authenticated.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only administrators can do this");
        }
        return true;
    }
}
