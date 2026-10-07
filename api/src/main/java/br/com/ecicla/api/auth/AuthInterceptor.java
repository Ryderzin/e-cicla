package br.com.ecicla.api.auth;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Requires a valid session token on the routes it is registered for (see {@link AuthWebConfig}) and
 * makes the account available to the controller. Answers 401 otherwise.
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    static final String ATTRIBUTE = Authenticated.class.getName();
    private static final String BEARER = "Bearer ";

    private final SessionService sessions;

    public AuthInterceptor(SessionService sessions) {
        this.sessions = sessions;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // The browser's CORS check (OPTIONS) never carries the token; let Spring answer it.
        if (CorsUtils.isPreFlightRequest(request)) {
            return true;
        }
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        String token = header != null && header.regionMatches(true, 0, BEARER, 0, BEARER.length())
                ? header.substring(BEARER.length()).strip()
                : null;
        Authenticated authenticated = sessions.authenticate(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to continue"));
        request.setAttribute(ATTRIBUTE, authenticated);
        return true;
    }
}
