package com.threer.security;

import com.threer.service.SessionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * Reads "Authorization: Bearer <token>" and, if the token is valid, sets the
 * request attribute "userId". It does NOT reject requests without a token yet,
 * because some frontend calls (plain fetch) do not send the token.
 * Controllers that need a logged-in user should check the attribute.
 * Once every frontend call sends the token, add a 401 response for
 * non-public paths here.
 */
@Component
public class TokenAuthFilter extends OncePerRequestFilter {

    private final SessionService sessions;

    public TokenAuthFilter(SessionService sessions) {
        this.sessions = sessions;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            Optional<String> userId = sessions.userIdFor(header.substring(7));
            userId.ifPresent(id -> request.setAttribute("userId", id));
        }

        chain.doFilter(request, response);
    }
}