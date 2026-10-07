package br.com.ecicla.api.auth;

import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.server.ResponseStatusException;

/** Fills controller parameters of type {@link Authenticated} with the account found by {@link AuthInterceptor}. */
@Component
public class CurrentAccountResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.getParameterType() == Authenticated.class;
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        Object authenticated = webRequest.getAttribute(AuthInterceptor.ATTRIBUTE, RequestAttributes.SCOPE_REQUEST);
        if (authenticated == null) {
            // A route that needs the account but is not protected by the interceptor: never treat it as anonymous.
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to continue");
        }
        return authenticated;
    }
}
